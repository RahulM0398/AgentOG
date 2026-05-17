import crypto from "crypto";
import { canonicalJson } from "./canonical";
import { getSigningSecret } from "./env";

export type ApprovalTokenPayload = {
  intent_id: string;
  approved_action_hash: string;
  scope: string;
  exp: number;
};

export function signApprovalToken(payload: ApprovalTokenPayload): string {
  const body = canonicalJson(payload);
  const sig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(body, "utf8")
    .digest("base64url");
  return `${Buffer.from(body, "utf8").toString("base64url")}.${sig}`;
}

export function verifyApprovalToken(token: string): ApprovalTokenPayload | null {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  let body: string;
  try {
    body = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = crypto
    .createHmac("sha256", getSigningSecret())
    .update(body, "utf8")
    .digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(body) as ApprovalTokenPayload;
    if (!parsed.intent_id || !parsed.approved_action_hash || !parsed.exp) return null;
    if (Date.now() / 1000 > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}
