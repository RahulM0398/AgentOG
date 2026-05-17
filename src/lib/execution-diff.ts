import type { ActionIntentInput } from "./types";

function norm<T>(v: T) {
  return v;
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
  const aCond = [...approved.required_conditions].sort().join(",");
  const fCond = [...finalPayload.required_conditions].sort().join(",");
  if (aCond !== fCond) {
    reasons.push("Required conditions changed (wheelchair assistance or other constraints)");
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
