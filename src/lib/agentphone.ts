import crypto from "crypto";

export function verifyAgentPhoneWebhook(params: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  secret: string | undefined;
}): boolean {
  const { rawBody, signature, timestamp, secret } = params;
  if (!secret?.trim()) return true;
  if (!signature || !timestamp) return false;
  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const signedString = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedString, "utf8")
    .digest("hex");
  const full = `sha256=${expected}`;
  try {
    const a = Buffer.from(signature, "utf8");
    const b = Buffer.from(full, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function agentPhoneOutboundCall(params: {
  toNumber: string;
  initialGreeting: string;
  agentId?: string;
  fromNumberId?: string | null;
}) {
  const apiKey = process.env.AGENTPHONE_API_KEY?.trim();
  const base =
    process.env.AGENTPHONE_API_BASE_URL?.trim() || "https://api.agentphone.ai";
  const agentId =
    params.agentId?.trim() || process.env.AGENTPHONE_AGENT_ID?.trim();

  if (!apiKey || !agentId) {
    console.warn("[AgentPhone] Missing API key or AGENTPHONE_AGENT_ID");
    return { skipped: true as const };
  }

  const body: Record<string, unknown> = {
    agentId,
    toNumber: params.toNumber,
    initialGreeting: params.initialGreeting,
  };
  const fnid = params.fromNumberId ?? process.env.AGENTPHONE_NUMBER_ID?.trim();
  if (fnid) body.fromNumberId = fnid;

  const res = await fetch(`${base.replace(/\/$/, "")}/v1/calls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AgentPhone outbound call failed: ${res.status} ${t}`);
  }

  return res.json().catch(() => ({}));
}
