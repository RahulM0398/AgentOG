import { NextResponse } from "next/server";
import { ExecutionRequestSchema } from "@/lib/schemas";
import { getStore } from "@/lib/agentog-store";
import { processExecution } from "@/lib/process-execution";

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

  const result = await processExecution(
    store,
    intent_id,
    approval_token,
    final_payload,
    { sendAuditEmail: true },
  );

  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status });
  }

  if (result.allowed) {
    return NextResponse.json({
      status: "allowed",
      reason: result.reason,
    });
  }

  return NextResponse.json({
    status: "blocked",
    reason: result.reason,
  });
}
