import { NextResponse } from "next/server";
import { getStore } from "@/lib/agentog-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ intentId: string }> },
) {
  const { intentId } = await context.params;
  const store = getStore();
  const intent = store.getIntent(intentId);
  if (!intent) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    intent_id: intent.id,
    action_hash: intent.action_hash,
    approval_status: intent.approval_status,
    risk_level: intent.risk_level,
    raw_input: intent.raw_input,
    expires_at: intent.expires_at,
  });
}
