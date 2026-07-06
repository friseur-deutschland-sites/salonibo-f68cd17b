import { NextResponse } from "next/server";
import { sb, PROJECT_ID } from "../../../../lib/booking";
import { isAdmin, unauthorized } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const rows = await sb(
    `appointments?project_id=eq.${PROJECT_ID}&appointment_date=eq.${date}&order=appointment_time.asc&select=*,staff(name,gender_type)`
  );
  return NextResponse.json({ appointments: rows || [] });
}

export async function PATCH(request) {
  if (!isAdmin(request)) return unauthorized();
  const { id, status } = await request.json();
  if (!id || !status) return NextResponse.json({ error: "id ve status gerekli." }, { status: 400 });
  await sb(`appointments?id=eq.${id}&project_id=eq.${PROJECT_ID}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return NextResponse.json({ ok: true });
}

/** "HH:MM" → dakika */
function toMin(t) {
  const [h, m] = String(t).slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/** dakika → "HH:MM" */
function toTime(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Manuel randevu ekleme (telefonla gelen randevular için — salon sahibi girer).
 * Body: { date, time, durationMinutes, staffId?, guestName, guestPhone?, specialRequests?, force? }
 * Seçili personel için çakışma varsa 409 döner; force: true ile yine de eklenir.
 */
export async function POST(request) {
  if (!isAdmin(request)) return unauthorized();
  const body = await request.json();
  const { date, time, durationMinutes, staffId, guestName, guestPhone, specialRequests, force } = body;

  if (!date || !time || !guestName?.trim()) {
    return NextResponse.json({ error: "Datum, Uhrzeit und Name sind erforderlich." }, { status: 400 });
  }

  const duration = parseInt(durationMinutes) || 30;
  const startMin = toMin(time);
  const endMin = startMin + duration;
  if (endMin >= 24 * 60) {
    return NextResponse.json({ error: "Termin geht über Mitternacht hinaus." }, { status: 400 });
  }
  const endTime = toTime(endMin);

  // Çakışma kontrolü — personel seçiliyse o personelin randevularına bakılır
  if (staffId && !force) {
    const existing = await sb(
      `appointments?project_id=eq.${PROJECT_ID}&appointment_date=eq.${date}` +
      `&staff_id=eq.${staffId}&status=neq.cancelled&select=appointment_time,appointment_end,guest_name`
    );
    const conflict = (existing || []).find(a => {
      const s = toMin(a.appointment_time);
      const e = toMin(a.appointment_end);
      return startMin < e && endMin > s;
    });
    if (conflict) {
      return NextResponse.json(
        {
          error: `Konflikt: ${conflict.guest_name} hat bereits einen Termin ` +
                 `${String(conflict.appointment_time).slice(0,5)}–${String(conflict.appointment_end).slice(0,5)}.`,
          conflict: true,
        },
        { status: 409 }
      );
    }
  }

  const rows = await sb("appointments", {
    method: "POST",
    body: JSON.stringify({
      project_id: PROJECT_ID,
      guest_name: guestName.trim(),
      guest_phone: guestPhone?.trim() || null,
      staff_id: staffId || null,
      selected_services: [],
      total_minutes: duration,
      appointment_date: date,
      appointment_time: time,
      appointment_end: endTime,
      special_requests: specialRequests?.trim() || "Telefonisch aufgenommen",
      status: "confirmed",
      verified: true,
    }),
  });

  return NextResponse.json({ ok: true, appointment: rows?.[0] || null });
}
