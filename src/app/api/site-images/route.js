import { NextResponse } from "next/server";
import { sb, PROJECT_ID } from "../../../lib/booking";

export const dynamic = "force-dynamic";

/**
 * Public: sitenin dinamik fotoğrafları.
 * { hero: "url"|null, gallery: ["url", ...] }
 */
export async function GET() {
  try {
    const rows = await sb(`site_images?project_id=eq.${PROJECT_ID}&select=image_key,url`);
    const map = {};
    for (const r of rows || []) map[r.image_key] = r.url;

    const gallery = Object.keys(map)
      .filter(k => k.startsWith("gallery_"))
      .sort((a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]))
      .map(k => map[k]);

    return NextResponse.json({ hero: map.hero || null, gallery });
  } catch (e) {
    // site_images tablosu yoksa da site çalışmaya devam etsin
    return NextResponse.json({ hero: null, gallery: [] });
  }
}
