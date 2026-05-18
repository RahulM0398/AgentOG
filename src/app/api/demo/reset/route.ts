import { NextResponse } from "next/server";
import { demoEndpointsAllowed } from "@/lib/env";
import { getStore } from "@/lib/agentog-store";

export const runtime = "nodejs";

/** Clears intents, executions, dashboard snapshot, and webhook dedupe cache for a clean demo run. */
export async function POST() {
  if (!demoEndpointsAllowed()) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }
  getStore().resetDemo();
  return NextResponse.json({ ok: true });
}
