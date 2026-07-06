import { NextResponse } from "next/server";
import { sb, PROJECT_ID } from "../../../../lib/booking";
import { isAdmin, unauthorized } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const catalog = await sb("service_catalog?order=category.asc,sort_order.asc,name_de.asc");
  const salonSvcs = await sb(`salon_services?project_id=eq.${PROJECT_ID}&select=*`);
  return NextResponse.json({ catalog: catalog || [], salon_services: salonSvcs || [] });
}

export async function POST(request) {
  if (!isAdmin(request)) return unauthorized();
  const { catalog_id, custom_minutes, price_eur } = await request.json();
  if (!catalog_id) return NextResponse.json({ error: "catalog_id gerekli." }, { status: 400 });
  const rows = await sb("salon_services", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ project_id: PROJECT_ID, catalog_id, custom_minutes: custom_minutes ?? null, price_eur: price_eur ?? null, active: true }),
  });
  return NextResponse.json(rows[0]);
}

export async function PATCH(request) {
  if (!isAdmin(request)) return unauthorized();
  const { id, ...updates } = await request.json();
  if (!id) return NextResponse.json({ error: "id gerekli." }, { status: 400 });
  await sb(`salon_services?id=eq.${id}&project_id=eq.${PROJECT_ID}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  if (!isAdmin(request)) return unauthorized();
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id gerekli." }, { status: 400 });
  await sb(`salon_services?id=eq.${id}&project_id=eq.${PROJECT_ID}`, { method: "DELETE" });
  return NextResponse.json({ ok: true });
}
