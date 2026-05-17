import { NextResponse } from "next/server";

/** Optional inbox webhook stub — return 200 so sponsors can register safely. */
export async function POST(request: Request) {
  const raw = await request.text().catch(() => "");
  console.info("[AgentMail webhook]", raw.slice(0, 500));
  return NextResponse.json({ ok: true });
}
