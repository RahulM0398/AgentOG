import { NextResponse } from "next/server";
import { DEFAULT_RIDE_TRANSCRIPT } from "@/lib/demo-default-transcript";
import { demoEndpointsAllowed } from "@/lib/env";
import { processVoiceTranscript } from "@/lib/voice-pipeline";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!demoEndpointsAllowed()) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const transcript =
    typeof body.transcript === "string" && body.transcript.trim()
      ? body.transcript.trim()
      : DEFAULT_RIDE_TRANSCRIPT;

  const result = await processVoiceTranscript({
    transcript,
    caller: body.caller ?? "+1-demo-caller",
    channel: "demo",
  });

  return NextResponse.json(result);
}
