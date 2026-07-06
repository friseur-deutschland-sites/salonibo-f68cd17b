import { NextResponse } from "next/server";
import { getStaff } from "../../../lib/booking";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gender = searchParams.get("gender"); // damen | herren | null
    const staff = await getStaff(gender);
    return NextResponse.json(staff);
  } catch (e) {
    console.error("staff error:", e);
    return NextResponse.json({ error: "Mitarbeiter konnten nicht geladen werden." }, { status: 500 });
  }
}
