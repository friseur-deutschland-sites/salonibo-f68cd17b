import { NextResponse } from "next/server";
import { PROJECT_ID } from "../../../../lib/booking";
import { isAdmin, unauthorized } from "../../../../lib/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * Fotoğraf yükleme (salon admin paneli) — Supabase Storage "site-images" bucket.
 * FormData { file } → { url }
 */
export async function POST(request) {
  if (!isAdmin(request)) return unauthorized();

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData erwartet." }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string")
    return NextResponse.json({ error: "Keine Datei gefunden." }, { status: 400 });

  const ext = ALLOWED[file.type];
  if (!ext)
    return NextResponse.json({ error: "Nur JPG, PNG oder WebP erlaubt." }, { status: 400 });

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "Datei zu groß (max. 8 MB)." }, { status: 400 });

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SECRET_KEY;

  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${PROJECT_ID}/site/${name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const res = await fetch(`${sbUrl}/storage/v1/object/site-images/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sbKey}`,
      apikey: sbKey,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Storage upload error:", res.status, text);
    return NextResponse.json({ error: `Upload fehlgeschlagen (${res.status}).` }, { status: 502 });
  }

  const url = `${sbUrl}/storage/v1/object/public/site-images/${path}`;
  return NextResponse.json({ ok: true, url });
}
