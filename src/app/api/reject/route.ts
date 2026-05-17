import { NextResponse } from "next/server";
import { getStore } from "@/lib/agentog-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const intentId = body?.intent_id ?? body?.intentId;
  if (!intentId) {
    return NextResponse.json({ error: "missing_intent_id" }, { status: 400 });
  }

  const store = getStore();
  const intent = store.getIntent(intentId);
  if (!intent) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  store.setApprovalStatus(intentId, "rejected");
  store.touchDashboard({
    intent: {
      id: intent.id,
      action_hash: intent.action_hash,
      approval_status: "rejected",
      vendor: intent.raw_input.vendor,
      amount: intent.raw_input.amount,
    },
  });

  return NextResponse.json({ status: "rejected", intent_id: intentId });
}
