import type { AgentOGMemoryStore } from "./agentog-store";
import type { ActionIntentInput } from "./types";
import { actionFingerprint } from "./canonical";
import { verifyApprovalToken } from "./approval-token";
import {
  describePayloadDiff,
  humanBlockedExecutionReason,
} from "./execution-diff";
import { sendAuditReceiptEmail } from "./agentmail";
import { resolveGuardianEmail } from "./env";

export type ProcessExecutionOptions = {
  /** When false, skip AgentMail audit receipt (used after OTP approve auto-match). */
  sendAuditEmail?: boolean;
};

export type ProcessExecutionResult =
  | { ok: true; allowed: boolean; reason: string; block_reason?: string }
  | {
      ok: false;
      status: number;
      body: { status: string; reason: string };
    };

/**
 * Verify token + payload fingerprint, record execution attempt, optional audit email.
 */
export async function processExecution(
  store: AgentOGMemoryStore,
  intent_id: string,
  approval_token: string,
  final_payload: ActionIntentInput,
  options: ProcessExecutionOptions = {},
): Promise<ProcessExecutionResult> {
  const sendAuditEmail = options.sendAuditEmail !== false;

  const intent = store.getIntent(intent_id);
  if (!intent) {
    return {
      ok: false,
      status: 404,
      body: { status: "blocked", reason: "Unknown intent." },
    };
  }

  if (intent.approval_status !== "approved") {
    return {
      ok: false,
      status: 403,
      body: { status: "blocked", reason: "Intent is not approved." },
    };
  }

  const claims = verifyApprovalToken(approval_token);
  if (!claims || claims.intent_id !== intent_id) {
    store.addAudit(intent_id, "execute_blocked_bad_token", {});
    return {
      ok: false,
      status: 403,
      body: { status: "blocked", reason: "Invalid or expired approval token." },
    };
  }

  if (claims.approved_action_hash !== intent.action_hash) {
    return {
      ok: false,
      status: 403,
      body: {
        status: "blocked",
        reason: "Token does not match stored intent fingerprint.",
      },
    };
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
      : humanBlockedExecutionReason(intent.raw_input, final_payload),
    created_at: new Date().toISOString(),
  };

  store.pushExecutionAttempt(attempt);
  store.addAudit(intent_id, allowed ? "execute_allowed" : "execute_blocked", {
    final_action_hash: finalHash,
    expected: intent.action_hash,
    block_reason: attempt.block_reason,
  });

  const guardianEmail = resolveGuardianEmail();

  if (sendAuditEmail && guardianEmail) {
    const lines = [
      "AgentOG Action Receipt",
      "",
      allowed ? "Execution result: ALLOWED" : "Execution result: BLOCKED",
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
      ...(allowed
        ? []
        : [`Technical detail: ${describePayloadDiff(intent.raw_input, final_payload).join("; ")}`]),
    ];
    try {
      await sendAuditReceiptEmail({ to: guardianEmail, lines });
      store.appendReceiptLine(
        allowed
          ? "Emailed audit receipt — execution matched the approved fingerprint."
          : "Emailed audit receipt — execution was blocked (payload drift).",
      );
    } catch {
      store.appendReceiptLine("Audit receipt email didn't send — check AgentMail.");
    }
  }

  if (allowed) {
    return {
      ok: true,
      allowed: true,
      reason: "Final payload matches approved action fingerprint.",
    };
  }

  return {
    ok: true,
    allowed: false,
    reason:
      attempt.block_reason ??
      "Final action does not match approved action fingerprint.",
    block_reason: attempt.block_reason,
  };
}
