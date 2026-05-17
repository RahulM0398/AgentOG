import crypto from "crypto";

/** Try raw UTF-8 secret first; if it starts with `whsec_`, also try Stripe-style base64 key material. */
function webhookHmacKeyCandidates(secret: string): (string | Buffer)[] {
  const s = secret.trim();
  const out: (string | Buffer)[] = [s];
  if (s.startsWith("whsec_")) {
    try {
      const buf = Buffer.from(s.slice(6), "base64");
      if (buf.length > 0) out.push(buf);
    } catch {
      /* ignore */
    }
  }
  return out;
}

function timingSafeSigMatch(signature: string, expectedHexPrefixed: string): boolean {
  try {
    const a = Buffer.from(signature, "utf8");
    const b = Buffer.from(expectedHexPrefixed, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

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

  for (const key of webhookHmacKeyCandidates(secret)) {
    const expected = crypto
      .createHmac("sha256", key)
      .update(signedString, "utf8")
      .digest("hex");
    const full = `sha256=${expected}`;
    if (timingSafeSigMatch(signature, full)) return true;
  }
  return false;
}

/**
 * `POST /v1/calls` expects `fromNumberId` (e.g. `num_xyz`). Accept explicit id env vars, or resolve
 * `AGENTPHONE_NUMBER` / `AGENTPHONE_FROM_NUMBER` (E.164) via `GET /v1/numbers`.
 */
export async function resolveOutboundFromNumberId(): Promise<string | undefined> {
  const explicit =
    process.env.AGENTPHONE_NUMBER_ID?.trim() ||
    process.env.AGENTPHONE_FROM_NUMBER_ID?.trim();
  if (explicit) return explicit;

  const phone =
    process.env.AGENTPHONE_NUMBER?.trim() ||
    process.env.AGENTPHONE_FROM_NUMBER?.trim();
  if (!phone?.startsWith("+")) return undefined;

  const apiKey = process.env.AGENTPHONE_API_KEY?.trim();
  const base =
    process.env.AGENTPHONE_API_BASE_URL?.trim() || "https://api.agentphone.ai";
  if (!apiKey) return undefined;

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/v1/numbers?limit=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as {
      data?: Array<{ id?: string; phoneNumber?: string }>;
    };
    const rows = json.data ?? [];
    const norm = (p: string) => p.replace(/\s/g, "");
    const target = norm(phone);
    const hit = rows.find((r) => r.phoneNumber && norm(r.phoneNumber) === target);
    return hit?.id;
  } catch {
    return undefined;
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

  const fnid =
    params.fromNumberId ??
    (await resolveOutboundFromNumberId()) ??
    undefined;
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
