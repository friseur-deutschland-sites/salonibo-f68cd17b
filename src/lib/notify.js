/** Doğrulama kodu ve randevu onayı gönderimi — e-posta (Resend) ve SMS (Twilio). */

export function smsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

export async function sendVerificationEmail(to, code, salonName) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${salonName} <${process.env.RESEND_FROM_EMAIL}>`,
      to,
      subject: `Ihr Bestätigungscode: ${code}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>${salonName}</h2>
          <p>Ihr Bestätigungscode für die Terminbuchung lautet:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p>
          <p>Der Code ist 10 Minuten gültig.</p>
          <p style="color:#888;font-size:12px">Falls Sie keinen Termin angefragt haben, ignorieren Sie diese E-Mail.</p>
        </div>`,
    }),
  });
  if (!res.ok) throw new Error(`E-Mail-Versand fehlgeschlagen: ${await res.text()}`);
}

export async function sendAppointmentConfirmationEmail(to, appointment, salon) {
  const dateStr = new Date(`${appointment.date}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const servicesHtml = (appointment.selectedServices || []).length > 0
    ? `<p><strong>Leistungen:</strong><br>${appointment.selectedServices.map(s => `• ${s.name_de} (${s.duration_minutes} Min.)`).join("<br>")}</p>`
    : "";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${salon.name} <${process.env.RESEND_FROM_EMAIL}>`,
      to,
      subject: `Terminbestätigung — ${dateStr}, ${appointment.time} Uhr`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2>${salon.name}</h2>
          <p>Liebe/r ${appointment.name},</p>
          <p>Ihr Termin ist bestätigt:</p>
          <div style="background:#f6f4ef;padding:16px 20px;border-radius:8px">
            <p><strong>Datum:</strong> ${dateStr}</p>
            <p><strong>Uhrzeit:</strong> ${appointment.time} – ${appointment.appointmentEnd} Uhr</p>
            <p><strong>Dauer:</strong> ca. ${appointment.totalMinutes} Minuten</p>
          </div>
          ${servicesHtml}
          <p><strong>Adresse:</strong> ${salon.address || ""}<br>
          <strong>Telefon:</strong> ${salon.phone || ""}</p>
          <p>Falls Sie den Termin ändern oder absagen möchten, rufen Sie uns bitte an.</p>
          <p>Wir freuen uns auf Ihren Besuch!</p>
          ${appointment.reviewToken ? `
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
          <p style="color:#6b7280;font-size:13px">Nach Ihrem Besuch freuen wir uns über Ihre Bewertung:</p>
          <a href="https://friseurdeutschland.de/bewerten?token=${appointment.reviewToken}&salon=${encodeURIComponent(salon.name)}"
            style="display:inline-block;background:#ff6b35;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;margin-top:4px">
            ⭐ Jetzt bewerten
          </a>` : ""}
        </div>`,
    }),
  });
  if (!res.ok) throw new Error(`Bestätigungs-E-Mail fehlgeschlagen: ${await res.text()}`);
}

export async function sendVerificationSms(to, code, salonName) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const body = new URLSearchParams({
    From: process.env.TWILIO_FROM_NUMBER,
    To: to,
    Body: `${salonName}: Ihr Bestätigungscode lautet ${code} (10 Min. gültig)`,
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`SMS-Versand fehlgeschlagen: ${await res.text()}`);
}
