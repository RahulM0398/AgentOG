import { NextResponse } from "next/server";
import { ActionIntentInputSchema } from "@/lib/schemas";
import { getStore } from "@/lib/agentog-store";
import { getBaseUrl } from "@/lib/env";
import {
  buildApprovalEmail,
  sendAgentMailEmail,
} from "@/lib/agentmail";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ActionIntentInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const store = getStore();
  const intent = store.createIntent({
    input: parsed.data,
    risk_level: "medium",
    approval_required: true,
  });

  const base = getBaseUrl();
  const approvalUrl = `${base}/approve/${intent.id}`;

  store.touchDashboard({
    intent: {
      id: intent.id,
      action_hash: intent.action_hash,
      approval_status: intent.approval_status,
      approval_url: approvalUrl,
      verification_code: intent.verification_code,
      vendor: intent.raw_input.vendor,
      amount: intent.raw_input.amount,
      raw_input: intent.raw_input,
    },
  });

  const guardianEmail =
    process.env.GUARDIAN_EMAIL?.trim() ||
    process.env.AGENT_OG_APPROVER_EMAIL?.trim();
  if (guardianEmail) {
    const summary = {
      action_label: "High-impact agent action",
      vendor: intent.raw_input.vendor,
      amount: intent.raw_input.amount,
      pickup: intent.raw_input.pickup,
      dropoff: intent.raw_input.dropoff,
      scheduled_time: intent.raw_input.scheduled_time,
      required_conditions: intent.raw_input.required_conditions,
      risk_level: intent.risk_level,
      data_shared: intent.raw_input.data_shared,
      data_blocked: intent.raw_input.data_blocked,
    };
    const email = buildApprovalEmail({
      intentId: intent.id,
      approvalUrl,
      verificationCode: intent.verification_code,
      intentSummary: summary,
    });
    await sendAgentMailEmail({
      to: guardianEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  }

  return NextResponse.json({
    intent_id: intent.id,
    action_hash: intent.action_hash,
    approval_url: approvalUrl,
    risk_level: intent.risk_level,
    approval_required: intent.approval_required,
    verification_code: intent.verification_code,
  });
}
