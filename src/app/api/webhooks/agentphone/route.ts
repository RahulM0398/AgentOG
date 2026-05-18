import { NextResponse, after } from "next/server";
import { verifyAgentPhoneWebhook } from "@/lib/agentphone";
import { getStore } from "@/lib/agentog-store";
import { processVoiceTranscript } from "@/lib/voice-pipeline";

export const runtime = "nodejs";

function encoder() {
  return new TextEncoder();
}

function ndjsonLine(obj: Record<string, unknown>) {
  return encoder().encode(JSON.stringify(obj) + "\n");
}

function extractVoiceTranscript(payload: Record<string, unknown>): string | null {
  const ev = payload.event;
  const channel = payload.channel;
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data || channel !== "voice") return null;

  if (ev === "agent.message") {
    const t = data.transcript;
    return typeof t === "string" && t.trim() ? t.trim() : null;
  }

  if (ev === "agent.call_ended") {
    const turns = data.transcript;
    if (Array.isArray(turns)) {
      const text = turns
        .filter(
          (row: { role?: string }) =>
            row && (row.role === "user" || row.role === "caller"),
        )
        .map((row: { content?: string }) => row.content ?? "")
        .join(" ")
        .trim();
      return text || null;
    }
    if (typeof data.transcript === "string" && data.transcript.trim()) {
      return data.transcript.trim();
    }
  }
  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const webhookId = request.headers.get("x-webhook-id") ?? "";
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");
  const secret = process.env.AGENTPHONE_WEBHOOK_SECRET?.trim();

  const verified = verifyAgentPhoneWebhook({
    rawBody,
    signature,
    timestamp,
    secret,
  });
  if (!verified) {
    return NextResponse.json({ error: "invalid_webhook_signature" }, { status: 401 });
  }

  const store = getStore();
  if (webhookId && store.isWebhookDuplicate(webhookId)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const event = String(payload.event ?? "");
  const channel = String(payload.channel ?? "");
  const data = payload.data as Record<string, unknown> | undefined;
  const from =
    typeof data?.from === "string" ? data.from : undefined;

  if (event === "agent.call_ended" && channel === "voice") {
    if (webhookId) store.recordWebhook(webhookId);
    const transcript = extractVoiceTranscript(payload);
    after(async () => {
      if (!transcript) return;
      try {
        await processVoiceTranscript({
          transcript,
          caller: from,
          channel: "voice",
        });
      } catch (err) {
        console.error("[AgentPhone webhook] pipeline error:", err);
      }
    });
    return new NextResponse("OK", { status: 200 });
  }

  if (event === "agent.message" && channel === "voice") {
    if (webhookId) store.recordWebhook(webhookId);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          ndjsonLine({
            text: "Got it. I am checking your request against your AgentOG approval policy and researching safe options now.",
            interim: true,
          }),
        );
        controller.enqueue(
          ndjsonLine({
            text: "If you already finished speaking, hang up or stay on the line — AgentOG will finalize when the call completes.",
          }),
        );
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  return NextResponse.json({ ok: true });
}
