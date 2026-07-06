import { NextResponse } from "next/server";
import { getServices } from "../../../lib/booking";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const services = await getServices();
    return NextResponse.json(services);
  } catch (e) {
    console.error("services error:", e);
    return NextResponse.json({ error: "Leistungen konnten nicht geladen werden." }, { status: 500 });
  }
}
