import { NextResponse } from "next/server";
import { receiveAlert, validateAlertPayload } from "@/lib/db/alerts.js";

// Receives crash alerts from the VISSR cloud feeder (feederv4 --restsink).
export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "body must be valid JSON" }, { status: 400 });
  }

  const validationError = validateAlertPayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const { alertId, isNew } = await receiveAlert(payload);
    return NextResponse.json({ alertId, isNew }, { status: isNew ? 201 : 200 });
  } catch (error) {
    console.error("Alert API error:", error);
    return NextResponse.json({ error: "failed to store alert" }, { status: 500 });
  }
}
