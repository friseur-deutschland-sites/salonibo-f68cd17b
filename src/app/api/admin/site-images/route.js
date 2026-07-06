import { NextResponse } from "next/server";
import { sb, PROJECT_ID } from "../../../../lib/booking";
import { isAdmin, unauthorized } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

/** Site fotoğrafları (hero, gallery_1..10 vb.) — salon admin paneli. */

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const rows = await sb(`site_images?project_id=eq.${PROJECT_ID}&order=image_key.asc`);
  return NextResponse.json({ images: rows || [] });
}

// Upsert: { image_key, url }
export async function PUT(request) {
  if (!isAdmin(request)) return unauthorized();
  const { image_key, url } = await request.json();
  if (!image_key || !url)
    return NextResponse.json({ error: "image_key ve url gerekli." }, { status: 400 });

  await sb(`site_images?on_conflict=project_id,image_key`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ project_id: PROJECT_ID, image_key, url }),
  });
  return NextResponse.json({ ok: true });
}

// Sil: ?key=gallery_3
export async function DELETE(request) {
  if (!isAdmin(request)) return unauthorized();
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key gerekli." }, { status: 400 });

  await sb(`site_images?project_id=eq.${PROJECT_ID}&image_key=eq.${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  return NextResponse.json({ ok: true });
}
