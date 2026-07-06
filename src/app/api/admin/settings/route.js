import { NextResponse } from "next/server";
import { sb, PROJECT_ID, getSettings } from "../../../../lib/booking";
import { isAdmin, unauthorized } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const settings = await getSettings();
  const smsAvailable = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  return NextResponse.json({ settings, smsAvailable });
}

export async function PUT(request) {
  if (!isAdmin(request)) return unauthorized();
  const updates = await request.json();
  delete updates.project_id;
  delete updates.id;
  await sb("salon_settings", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ project_id: PROJECT_ID, ...updates, updated_at: new Date().toISOString() }),
  });
  return NextResponse.json({ ok: true });
}
