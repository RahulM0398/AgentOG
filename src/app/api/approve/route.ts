import { NextResponse } from "next/server";
import { getStore } from "@/lib/agentog-store";
import { signApprovalToken } from "@/lib/approval-token";
import { processExecution } from "@/lib/process-execution";
import { getApprovalTtlMs, getBaseUrl } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const intentId = body?.intent_id ?? body?.intentId;
  const code = body?.verification_code ?? body?.verificationCode;

  if (!intentId) {
    return NextResponse.json(
      {
        error: "intent_missing",
        message: "This approval link is invalid.",
      },
      { status: 400 },
    );
  }

  const otp = code != null ? String(code).trim() : "";
  if (!otp) {
    return NextResponse.json(
      {
        error: "otp_missing",
        message: "Enter the verification code from your email or phone call.",
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
        message: "No pending intent found — it may have been reset or expired.",
      },
      { status: 404 },
    );
  }

  if (intent.verification_code !== otp) {
    store.addAudit(intentId, "approve_denied_bad_code", {});
    return NextResponse.json(
      {
        error: "otp_mismatch",
        message: "That code does not match. Check AgentMail or your approval call.",
      },
      { status: 403 },
    );
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

  const gate = await processExecution(store, intent.id, token, intent.raw_input, {
    sendAuditEmail: false,
  });
  if (gate.ok && gate.allowed) {
    store.appendReceiptLine("Gate verified — approved payload matches fingerprint.");
  }

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
