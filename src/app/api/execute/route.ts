import { NextResponse } from "next/server";
import { ExecutionRequestSchema } from "@/lib/schemas";
import { getStore } from "@/lib/agentog-store";
import { actionFingerprint } from "@/lib/canonical";
import { verifyApprovalToken } from "@/lib/approval-token";
import { describePayloadDiff } from "@/lib/execution-diff";
import { sendAuditReceiptEmail } from "@/lib/agentmail";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = ExecutionRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { intent_id, approval_token, final_payload } = parsed.data;
  const store = getStore();
  const intent = store.getIntent(intent_id);

  if (!intent) {
    return NextResponse.json({ status: "blocked", reason: "Unknown intent." }, { status: 404 });
  }

  if (intent.approval_status !== "approved") {
    return NextResponse.json(
      { status: "blocked", reason: "Intent is not approved." },
      { status: 403 },
    );
  }

  const claims = verifyApprovalToken(approval_token);
  if (!claims || claims.intent_id !== intent_id) {
    store.addAudit(intent_id, "execute_blocked_bad_token", {});
    return NextResponse.json(
      { status: "blocked", reason: "Invalid or expired approval token." },
      { status: 403 },
    );
  }

  if (claims.approved_action_hash !== intent.action_hash) {
    return NextResponse.json(
      { status: "blocked", reason: "Token does not match stored intent fingerprint." },
      { status: 403 },
    );
  }

  const finalHash = actionFingerprint(final_payload);
  const allowed = finalHash === intent.action_hash;

  const attempt = {
    id: `exe_${crypto.randomUUID()}`,
    intent_id,
    final_payload,
    final_action_hash: finalHash,
    result: allowed ? ("allowed" as const) : ("blocked" as const),
    block_reason: allowed
      ? undefined
      : describePayloadDiff(intent.raw_input, final_payload).join("; "),
    created_at: new Date().toISOString(),
  };

  store.pushExecutionAttempt(attempt);
  store.addAudit(intent_id, allowed ? "execute_allowed" : "execute_blocked", {
    final_action_hash: finalHash,
    expected: intent.action_hash,
    block_reason: attempt.block_reason,
  });

  const guardianEmail =
    process.env.GUARDIAN_EMAIL?.trim() ||
    process.env.AGENT_OG_APPROVER_EMAIL?.trim();

  if (guardianEmail) {
    const lines = [
      "AgentOG Action Receipt",
      "",
      allowed ? "Execution result: ALLOWED" : "Execution result: BLOCKED",
      `Intent: ${intent_id}`,
      `Approved fingerprint: ${intent.action_hash}`,
      `Final fingerprint: ${finalHash}`,
      "",
      "Approved action:",
      `Vendor: ${intent.raw_input.vendor}`,
      `Amount: $${intent.raw_input.amount}`,
      `Pickup: ${intent.raw_input.pickup}`,
      `Dropoff: ${intent.raw_input.dropoff}`,
      `Time: ${intent.raw_input.scheduled_time}`,
      "",
      allowed
        ? "Final payload matched approved action fingerprint."
        : `Blocked reason: ${attempt.block_reason}`,
    ];
    try {
      await sendAuditReceiptEmail({ to: guardianEmail, lines });
      store.appendReceiptLine(`Audit receipt emailed (${attempt.result})`);
    } catch {
      store.appendReceiptLine("Audit receipt email failed");
    }
  }

  if (allowed) {
    return NextResponse.json({
      status: "allowed",
      reason: "Final payload matches approved action fingerprint.",
    });
  }

  return NextResponse.json({
    status: "blocked",
    reason:
      attempt.block_reason ??
      "Final action does not match approved action fingerprint.",
  });
}
