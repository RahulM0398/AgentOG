import { NextResponse } from "next/server";
import { getStore } from "@/lib/agentog-store";
import { signApprovalToken } from "@/lib/approval-token";
import { getApprovalTtlMs, getBaseUrl } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const intentId = body?.intent_id ?? body?.intentId;
  const code = body?.verification_code ?? body?.verificationCode;

  if (!intentId || !code) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const store = getStore();
  const intent = store.getIntent(intentId);
  if (!intent) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (intent.verification_code !== String(code).trim()) {
    store.addAudit(intentId, "approve_denied_bad_code", {});
    return NextResponse.json({ error: "invalid_verification_code" }, { status: 403 });
  }

  store.setApprovalStatus(intentId, "approved");

  const ttlMs = getApprovalTtlMs();
  const exp = Math.floor(Date.now() / 1000 + ttlMs / 1000);
  const token = signApprovalToken({
    intent_id: intent.id,
    approved_action_hash: intent.action_hash,
    scope: `execute:${intent.raw_input.action_type}`,
    exp,
  });

  store.attachApprovalToken(intentId, token, new Date(exp * 1000).toISOString());

  store.touchDashboard({
    intent: {
      id: intent.id,
      action_hash: intent.action_hash,
      approval_status: "approved",
      approval_url: `${getBaseUrl()}/approve/${intent.id}`,
      verification_code: intent.verification_code,
      vendor: intent.raw_input.vendor,
      amount: intent.raw_input.amount,
      raw_input: intent.raw_input,
    },
  });

  return NextResponse.json({
    approval_token: token,
    intent_id: intent.id,
    approved_action_hash: intent.action_hash,
    scope: `execute:${intent.raw_input.action_type}`,
    expires_in_minutes: Math.round(ttlMs / 60_000),
  });
}
