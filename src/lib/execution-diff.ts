import type { ActionIntentInput } from "./types";

function norm<T>(v: T) {
  return v;
}

function hadWheelchair(conditions: string[]) {
  return conditions.some((c) =>
    /wheelchair/i.test(c.replace(/_/g, " ")),
  );
}

/** Produce judge-friendly diff reasons when execution payload diverges from approved. */
export function describePayloadDiff(
  approved: ActionIntentInput,
  finalPayload: ActionIntentInput,
): string[] {
  const reasons: string[] = [];
  if (approved.vendor !== finalPayload.vendor) {
    reasons.push(`Vendor changed from ${approved.vendor} to ${finalPayload.vendor}`);
  }
  if (approved.amount !== finalPayload.amount) {
    reasons.push(
      `Amount changed from $${approved.amount} to $${finalPayload.amount}`,
    );
  }
  const aWheel = hadWheelchair(approved.required_conditions);
  const fWheel = hadWheelchair(finalPayload.required_conditions);
  const aCond = [...approved.required_conditions].sort().join(",");
  const fCond = [...finalPayload.required_conditions].sort().join(",");
  if (aCond !== fCond) {
    if (aWheel && !fWheel) {
      reasons.push("Wheelchair assistance removed");
    } else {
      reasons.push("Required conditions changed (constraints differ from approval)");
    }
  }
  const aShare = [...approved.data_shared].sort().join(",");
  const fShare = [...finalPayload.data_shared].sort().join(",");
  if (aShare !== fShare) {
    const added = finalPayload.data_shared.filter((x) => !approved.data_shared.includes(x));
    if (added.length) reasons.push(`Sensitive/shared fields added: ${added.join(", ")}`);
    const removed = approved.data_shared.filter((x) => !finalPayload.data_shared.includes(x));
    if (removed.length) reasons.push(`Data shared fields removed: ${removed.join(", ")}`);
  }
  if (approved.currency !== finalPayload.currency) {
    reasons.push(`Currency changed from ${approved.currency} to ${finalPayload.currency}`);
  }
  if (norm(approved.pickup) !== norm(finalPayload.pickup)) {
    reasons.push("Pickup location changed");
  }
  if (norm(approved.dropoff) !== norm(finalPayload.dropoff)) {
    reasons.push("Dropoff location changed");
  }
  if (norm(approved.scheduled_time) !== norm(finalPayload.scheduled_time)) {
    reasons.push("Scheduled time changed");
  }
  if (approved.action_type !== finalPayload.action_type) {
    reasons.push(
      `Action type changed from ${approved.action_type} to ${finalPayload.action_type}`,
    );
  }
  return reasons;
}

/**
 * Judge-facing sentence for blocked execution (demo script).
 * Falls back to semicolon-joined detail lines for non-standard diffs.
 */
export function humanBlockedExecutionReason(
  approved: ActionIntentInput,
  finalPayload: ActionIntentInput,
): string {
  const clauses: string[] = [];

  if (approved.amount !== finalPayload.amount) {
    clauses.push(`amount changed from $${approved.amount} to $${finalPayload.amount}`);
  }
  if (approved.vendor !== finalPayload.vendor) {
    clauses.push("vendor changed");
  }
  if (
    hadWheelchair(approved.required_conditions) &&
    !hadWheelchair(finalPayload.required_conditions)
  ) {
    clauses.push("wheelchair assistance removed");
  }

  const addedShare = finalPayload.data_shared.filter(
    (x) => !approved.data_shared.includes(x),
  );
  if (addedShare.includes("medical_condition")) {
    clauses.push("medical_condition was added");
  }
  for (const x of addedShare) {
    if (x !== "medical_condition") {
      clauses.push(`${x} was added`);
    }
  }

  if (clauses.length > 0) {
    if (clauses.length === 1) return `Blocked: ${clauses[0]}.`;
    return `Blocked: ${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}.`;
  }

  const detail = describePayloadDiff(approved, finalPayload);
  return detail.length > 0
    ? detail.join("; ")
    : "Final payload did not match approved action fingerprint.";
}
