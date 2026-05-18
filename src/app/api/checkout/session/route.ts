import { NextResponse } from "next/server";
import { verifyApprovalToken } from "@/lib/approval-token";
import { getStore } from "@/lib/agentog-store";
import { createRideCheckoutSession } from "@/lib/stripe-checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const intentId = body?.intent_id ?? body?.intentId;
  const token = body?.approval_token ?? body?.approvalToken;

  if (!intentId || !token) {
    return NextResponse.json(
      {
        error: "missing_fields",
        message: !intentId ? "Intent id is missing." : "Approval token is missing.",
      },
      { status: 400 },
    );
  }

  const claims = verifyApprovalToken(String(token));
  if (!claims || claims.intent_id !== intentId) {
    return NextResponse.json(
      {
        error: "invalid_token",
        message: "Approval token is invalid or expired — open the approval page again.",
      },
      { status: 403 },
    );
  }

  const store = getStore();
  const intent = store.getIntent(intentId);
  if (!intent || intent.approval_status !== "approved") {
    return NextResponse.json(
      {
        error: "not_approved",
        message: "Approve this intent first, then run the gate check.",
      },
      { status: 403 },
    );
  }

  const executed = store.executions.some(
    (e) => e.intent_id === intentId && e.result === "allowed",
  );
  if (!executed) {
    return NextResponse.json(
      {
        error: "execute_gate_required",
        message: 'Use “Run gate (match)” on the dashboard so the approved payload passes before paying.',
      },
      { status: 403 },
    );
  }

  const session = await createRideCheckoutSession({
    intentId,
    vendor: intent.raw_input.vendor,
    amountUsd: intent.raw_input.amount,
  });

  if ("error" in session && session.error) {
    return NextResponse.json(
      {
        error: session.error,
        message: session.message ?? "Stripe checkout could not start.",
      },
      { status: 500 },
    );
  }

  if (!session.url) {
    return NextResponse.json(
      {
        error: "checkout_unavailable",
        message: "Stripe did not return a checkout URL — verify STRIPE_SECRET_KEY.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(session);
}
