import { NextResponse } from "next/server";
import { hasConflict, getAppointments, sb, PROJECT_ID } from "../../../../lib/booking";
import { sendAppointmentConfirmationEmail } from "../../../../lib/notify";
import siteData from "../../../../data/site-data.json";

const MAX_ATTEMPTS = 5;

export async function POST(request) {
  try {
    const { requestId, code } = await request.json();
    if (!requestId || !code) {
      return NextResponse.json({ error: "Code erforderlich." }, { status: 400 });
    }

    const rows = await sb(`verification_codes?id=eq.${requestId}&project_id=eq.${PROJECT_ID}`);
    const entry = rows?.[0];
    if (!entry) return NextResponse.json({ error: "Anfrage nicht gefunden." }, { status: 404 });
    if (new Date(entry.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Der Code ist abgelaufen. Bitte fordern Sie einen neuen an." }, { status: 410 });
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Zu viele Fehlversuche. Bitte starten Sie erneut." }, { status: 429 });
    }
    if (entry.code !== String(code).trim()) {
      await sb(`verification_codes?id=eq.${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ attempts: entry.attempts + 1 }),
      });
      return NextResponse.json({ error: "Falscher Code. Bitte erneut versuchen." }, { status: 401 });
    }

    const p = entry.payload;

    // Yarış durumu: OTP doğrulanırken çalışan dolu olmuş olabilir
    if (p.staffId) {
      const existing = await getAppointments(p.date, p.staffId);
      const startMin = p.time.split(":").map(Number).reduce((h, m) => h * 60 + m, 0);
      const endMin = startMin + p.totalMinutes;
      if (hasConflict(existing, startMin, endMin)) {
        await sb(`verification_codes?id=eq.${requestId}`, { method: "DELETE" });
        return NextResponse.json({ error: "Dieser Termin ist leider nicht mehr verfügbar." }, { status: 409 });
      }
    }

    const reviewToken = crypto.randomUUID();

    const inserted = await sb("appointments", {
      method: "POST",
      body: JSON.stringify({
        project_id: PROJECT_ID,
        guest_name: p.name,
        guest_email: p.email || null,
        guest_phone: p.phone || null,
        guest_gender: p.guestGender || null,
        staff_id: p.staffId || null,
        selected_services: p.selectedServices || [],
        total_minutes: p.totalMinutes,
        appointment_date: p.date,
        appointment_time: p.time,
        appointment_end: p.appointmentEnd,
        special_requests: p.requests || null,
        status: "confirmed",
        verified: true,
        review_token: reviewToken,
      }),
    });

    await sb(`verification_codes?id=eq.${requestId}`, { method: "DELETE" });

    const confirmation = {
      id: inserted[0].id,
      date: p.date,
      time: p.time,
      appointmentEnd: p.appointmentEnd,
      totalMinutes: p.totalMinutes,
      selectedServices: p.selectedServices || [],
      name: p.name,
      reviewToken,
    };

    if (p.email) {
      try {
        await sendAppointmentConfirmationEmail(p.email, confirmation, siteData.salon);
      } catch (e) {
        console.error("confirmation email failed:", e);
      }
    }

    return NextResponse.json({ confirmed: true, appointment: confirmation });
  } catch (e) {
    console.error("verify error:", e);
    return NextResponse.json({ error: "Bestätigung fehlgeschlagen." }, { status: 500 });
  }
}
