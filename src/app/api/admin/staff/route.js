import { NextResponse } from "next/server";
import { sb, PROJECT_ID } from "../../../../lib/booking";
import { isAdmin, unauthorized } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const rows = await sb(`staff?project_id=eq.${PROJECT_ID}&order=sort_order.asc,name.asc`);
  return NextResponse.json({ staff: rows || [] });
}

export async function POST(request) {
  if (!isAdmin(request)) return unauthorized();
  const { name, gender_type, active, sort_order, photo_url } = await request.json();
  if (!name || !gender_type) return NextResponse.json({ error: "name ve gender_type gerekli." }, { status: 400 });
  const rows = await sb("staff", {
    method: "POST",
    body: JSON.stringify({ project_id: PROJECT_ID, name, gender_type, active: active ?? true, sort_order: sort_order ?? 0, photo_url: photo_url || "" }),
  });
  return NextResponse.json(rows[0]);
}

export async function PATCH(request) {
  if (!isAdmin(request)) return unauthorized();
  const { id, ...updates } = await request.json();
  if (!id) return NextResponse.json({ error: "id gerekli." }, { status: 400 });
  await sb(`staff?id=eq.${id}&project_id=eq.${PROJECT_ID}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  if (!isAdmin(request)) return unauthorized();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli." }, { status: 400 });
  await sb(`staff?id=eq.${id}&project_id=eq.${PROJECT_ID}`, { method: "DELETE" });
  return NextResponse.json({ ok: true });
}
