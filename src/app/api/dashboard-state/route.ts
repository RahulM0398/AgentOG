import { NextResponse } from "next/server";
import { getStore } from "@/lib/agentog-store";

export async function GET() {
  const store = getStore();
  return NextResponse.json(store.dashboard);
}
