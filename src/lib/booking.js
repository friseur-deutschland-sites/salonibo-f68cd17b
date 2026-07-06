/**
 * Kuaför Randevu Motoru (sunucu tarafı — API route'larında çalışır).
 *
 * Kurallar:
 *  - Salon açılış saatleri içinde olmalı.
 *  - Randevu + toplam hizmet süresi kapanış saatini geçmemeli.
 *  - Seçili çalışanın o aralıkta (appointment_time → appointment_end) çakışan randevusu olmamalı.
 *  - Son dakika engeli: randevu saatine en az 30 dakika kalmış olmalı.
 *  - Slot aralığı: salon_settings.slot_interval_minutes (varsayılan 15 dk).
 */

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SECRET_KEY;
export const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;

export async function sb(path, init = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const DEFAULT_SETTINGS = {
  allow_service_selection: true,
  avg_appointment_minutes: 60,
  verification_method: "email",
  max_advance_days: 30,
  slot_interval_minutes: 15,
  opening_hours: {},
};

export async function getSettings() {
  const rows = await sb(`salon_settings?project_id=eq.${PROJECT_ID}`);
  return rows?.[0] ? { ...DEFAULT_SETTINGS, ...rows[0] } : { ...DEFAULT_SETTINGS, project_id: PROJECT_ID };
}

const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/** "09:00 – 18:00" → {open: 540, close: 1080}; "Ruhetag"/eksik → null */
export function getOpeningWindow(dateStr, settings) {
  const day = DAY_NAMES[new Date(`${dateStr}T12:00:00`).getDay()];
  const hours = (settings.opening_hours || {})[day];
  if (!hours) return null;
  const m = String(hours).match(/(\d{1,2})[:.](\d{2})\s*[–\-]\s*(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  return { open: +m[1] * 60 + +m[2], close: +m[3] * 60 + +m[4] };
}

export function minutesOf(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function toTimeStr(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Berlin saatine göre slota kalan dakika */
export function minutesUntilSlot(dateStr, timeStr) {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const nowBerlin = fmt.format(new Date()).replace(" ", "T") + ":00Z";
  const slot = new Date(`${dateStr}T${timeStr}:00Z`).getTime();
  return (slot - new Date(nowBerlin).getTime()) / 60000;
}

/** Belirtilen tarihteki onaylanmış/bekleyen randevuları getirir */
export async function getAppointments(dateStr, staffId = null) {
  let query = `appointments?project_id=eq.${PROJECT_ID}&appointment_date=eq.${dateStr}&status=neq.cancelled&select=*`;
  if (staffId) query += `&staff_id=eq.${staffId}`;
  return (await sb(query)) || [];
}

/** Aktif çalışanları getirir; gender filtresi opsiyonel */
export async function getStaff(genderFilter = null) {
  let query = `staff?project_id=eq.${PROJECT_ID}&active=eq.true&order=sort_order.asc,name.asc`;
  if (genderFilter) {
    // 'damen' filtresi → gender_type=damen veya gender_type=beide
    query += `&or=(gender_type.eq.${genderFilter},gender_type.eq.beide)`;
  }
  return (await sb(query)) || [];
}

/** Salon'un aktif hizmetlerini (katalog bilgisiyle birlikte) getirir */
export async function getServices() {
  const rows = await sb(
    `salon_services?project_id=eq.${PROJECT_ID}&active=eq.true&select=*,service_catalog(*)&order=sort_order.asc`
  );
  return (rows || []).map((row) => ({
    id: row.id,
    catalog_id: row.catalog_id,
    // Katalogda olmayan (fiyat listesinden taranan) hizmetler custom_name taşır
    name_de: row.custom_name || row.service_catalog?.name_de || "",
    category: row.custom_category || row.service_catalog?.category || "unisex",
    duration_minutes: row.custom_minutes ?? row.service_catalog?.default_minutes ?? 30,
    price_eur: row.price_eur,
  }));
}

/**
 * Çalışanın belirli bir randevu aralığında (start, end) çakışması var mı?
 * Çakışma: mevcut randevunun [appointment_time, appointment_end) aralığı ile
 * yeni aralık [startMin, endMin) örtüşüyor mu?
 */
export function hasConflict(appointments, startMin, endMin, excludeId = null) {
  return appointments
    .filter((a) => a.id !== excludeId)
    .some((a) => {
      const aStart = minutesOf(a.appointment_time.slice(0, 5));
      const aEnd = minutesOf(a.appointment_end.slice(0, 5));
      return startMin < aEnd && endMin > aStart;
    });
}

/**
 * Bir gün için belirli çalışanın müsait saatlerini listeler.
 * staffId null ise "herhangi çalışan" — müsait herhangi biri varsa slot eklenir.
 */
export async function listSlots(dateStr, totalMinutes, staffId = null) {
  const settings = await getSettings();
  const win = getOpeningWindow(dateStr, settings);
  if (!win) return { closed: true, slots: [] };

  const interval = settings.slot_interval_minutes || 15;
  const MIN_ADVANCE = 30; // en az 30 dakika önceden randevu

  const staffList = staffId ? [{ id: staffId }] : await getStaff();
  if (!staffList.length) return { closed: false, slots: [] };

  // Her çalışanın o güne ait randevularını çek
  const apptByStaff = {};
  for (const s of staffList) {
    apptByStaff[s.id] = await getAppointments(dateStr, s.id);
  }

  const slotSet = new Set();

  for (let t = win.open; t + totalMinutes <= win.close; t += interval) {
    const timeStr = toTimeStr(t);
    if (minutesUntilSlot(dateStr, timeStr) < MIN_ADVANCE) continue;

    for (const s of staffList) {
      if (!hasConflict(apptByStaff[s.id], t, t + totalMinutes)) {
        slotSet.add(timeStr);
        break;
      }
    }
  }

  return { closed: false, slots: Array.from(slotSet).sort() };
}

/**
 * Belirli slot için uygun olan çalışanları listeler.
 * (Müşteri tarih+saat seçtikten sonra hangi çalışanın müsait olduğunu bulmak için)
 */
export async function getAvailableStaff(dateStr, timeStr, totalMinutes, genderFilter = null) {
  const startMin = minutesOf(timeStr);
  const endMin = startMin + totalMinutes;
  const staffList = await getStaff(genderFilter);
  const available = [];
  for (const s of staffList) {
    const appts = await getAppointments(dateStr, s.id);
    if (!hasConflict(appts, startMin, endMin)) available.push(s);
  }
  return available;
}
