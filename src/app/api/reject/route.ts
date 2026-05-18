import { NextResponse } from "next/server";
import { getStore } from "@/lib/agentog-store";
import { getBaseUrl } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const intentId = body?.intent_id ?? body?.intentId;
  if (!intentId) {
    return NextResponse.json(
      {
        error: "intent_missing",
        message: "Intent id is missing.",
      },
      { status: 400 },
    );
  }

  const store = getStore();
  const intent = store.getIntent(intentId);
  if (!intent) {
    return NextResponse.json(
      {
        error: "not_found",
        message: "No intent found — it may have been reset.",
      },
      { status: 404 },
    );
  }

  store.setApprovalStatus(intentId, "rejected");
  const base = getBaseUrl();
  store.touchDashboard({
    intent: {
      id: intent.id,
      action_hash: intent.action_hash,
      approval_status: "rejected",
      approval_url: `${base}/approve/${intent.id}`,
      verification_code: intent.verification_code,
      vendor: intent.raw_input.vendor,
      amount: intent.raw_input.amount,
      raw_input: intent.raw_input,
    },
  });
  store.appendReceiptLine(`Intent ${intent.id} rejected by approver`);

  return NextResponse.json({ status: "rejected", intent_id: intentId });
}
