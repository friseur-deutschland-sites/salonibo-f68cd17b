import { NextResponse } from "next/server";
import { listSlots, getSettings } from "../../../../lib/booking";

export async function POST(request) {
  try {
    const { date, totalMinutes, staffId } = await request.json();
    if (!date || !totalMinutes) {
      return NextResponse.json({ error: "Datum und Dauer erforderlich." }, { status: 400 });
    }
    const settings = await getSettings();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + (settings.max_advance_days || 30));
    if (new Date(date) > maxDate) {
      return NextResponse.json({ error: "Dieses Datum liegt zu weit in der Zukunft." }, { status: 400 });
    }
    const result = await listSlots(date, Number(totalMinutes), staffId || null);
    return NextResponse.json(result);
  } catch (e) {
    console.error("availability error:", e);
    return NextResponse.json({ error: "Verfügbarkeit konnte nicht geprüft werden." }, { status: 500 });
  }
}
