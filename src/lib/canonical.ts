import crypto from "crypto";

function sortKeysDeep(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      out[k] = sortKeysDeep(obj[k]);
    }
    return out;
  }
  return value;
}

/** Stable JSON for hashing fingerprints and tokens. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function actionFingerprint(input: unknown): string {
  return sha256Hex(canonicalJson(input));
}
