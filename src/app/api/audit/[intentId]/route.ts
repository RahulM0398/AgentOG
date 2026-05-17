import { NextResponse } from "next/server";
import { getStore } from "@/lib/agentog-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ intentId: string }> },
) {
  const { intentId } = await context.params;
  const store = getStore();
  const events = store.audit.filter((a) => a.intent_id === intentId);
  const executions = store.executions.filter((e) => e.intent_id === intentId);

  return NextResponse.json({
    intent_id: intentId,
    audit_events: events,
    execution_attempts: executions,
  });
}
