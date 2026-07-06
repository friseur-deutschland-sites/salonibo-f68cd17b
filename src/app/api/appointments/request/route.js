import { NextResponse } from "next/server";
import { hasConflict, getAppointments, getSettings, sb, PROJECT_ID, minutesOf, toTimeStr } from "../../../../lib/booking";
import { sendVerificationEmail, sendVerificationSms, smsConfigured } from "../../../../lib/notify";
import siteData from "../../../../data/site-data.json";

const MAX_CODES_PER_HOUR = 3;

export async function POST(request) {
  try {
    const {
      date, time, totalMinutes,
      staffId,           // null = kişi tercihi yok
      selectedServices,  // [{id, name_de, duration_minutes}]
      guestGender,       // "damen" | "herren"
      name, email, phone, requests,
    } = await request.json();

    if (!date || !time || !totalMinutes || !name) {
      return NextResponse.json({ error: "Bitte füllen Sie alle Pflichtfelder aus." }, { status: 400 });
    }

    const settings = await getSettings();
    const startMin = minutesOf(time);
    const endMin = startMin + Number(totalMinutes);

    // Slot çakışma kontrolü
    if (staffId) {
      const existing = await getAppointments(date, staffId);
      if (hasConflict(existing, startMin, endMin)) {
        return NextResponse.json({ error: "Dieser Termin ist leider nicht mehr verfügbar." }, { status: 409 });
      }
    }

    const useSms = settings.verification_method === "sms" && smsConfigured() && phone;
    const contact = useSms ? phone : email;
    if (!contact) {
      return NextResponse.json(
        { error: useSms ? "Bitte Telefonnummer angeben." : "Bitte E-Mail-Adresse angeben." },
        { status: 400 }
      );
    }

    // Hız limiti
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const recent = await sb(
      `verification_codes?project_id=eq.${PROJECT_ID}&contact=eq.${encodeURIComponent(contact)}&created_at=gte.${hourAgo}&select=id`
    );
    if ((recent || []).length >= MAX_CODES_PER_HOUR) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." },
        { status: 429 }
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const rows = await sb("verification_codes", {
      method: "POST",
      body: JSON.stringify({
        project_id: PROJECT_ID,
        contact,
        code,
        payload: {
          date, time, totalMinutes: Number(totalMinutes),
          appointmentEnd: toTimeStr(endMin),
          staffId: staffId || null,
          selectedServices: selectedServices || [],
          guestGender: guestGender || null,
          name, email: email || "", phone: phone || "",
          requests: requests || "",
        },
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      }),
    });

    const salonName = siteData.salon.name;
    if (useSms) {
      await sendVerificationSms(contact, code, salonName);
    } else {
      await sendVerificationEmail(contact, code, salonName);
    }

    const masked = useSms
      ? contact.replace(/.(?=.{3})/g, "•")
      : contact.replace(/^(.).*(@.*)$/, "$1•••$2");

    return NextResponse.json({
      requestId: rows[0].id,
      channel: useSms ? "sms" : "email",
      sentTo: masked,
    });
  } catch (e) {
    console.error("request error:", e);
    return NextResponse.json({ error: "Anfrage konnte nicht verarbeitet werden." }, { status: 500 });
  }
}
