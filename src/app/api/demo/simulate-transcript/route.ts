import { NextResponse } from "next/server";
import { demoEndpointsAllowed } from "@/lib/env";
import { processVoiceTranscript } from "@/lib/voice-pipeline";

export const runtime = "nodejs";

const DEMO =
  "Book a cab from 560 20th Street to Ghirardelli Square after 5 PM. Keep it under $50 and make sure wheelchair assistance is available.";

export async function POST(request: Request) {
  if (!demoEndpointsAllowed()) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const transcript =
    typeof body.transcript === "string" && body.transcript.trim()
      ? body.transcript.trim()
      : DEMO;

  const result = await processVoiceTranscript({
    transcript,
    caller: body.caller ?? "+1-demo-caller",
    channel: "demo",
  });

  return NextResponse.json(result);
}
