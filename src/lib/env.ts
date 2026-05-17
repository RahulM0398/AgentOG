/** Canonical production demo URL — override per deploy via APP_BASE_URL / NEXT_PUBLIC_APP_URL. */
export const CANONICAL_PUBLIC_ORIGIN = "https://agent-og.vercel.app";

export function getBaseUrl(): string {
  const fromEnv =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (fromEnv) {
    if (fromEnv.startsWith("http")) return fromEnv.replace(/\/$/, "");
    return `https://${fromEnv.replace(/\/$/, "")}`;
  }
  if (process.env.NODE_ENV === "production") {
    return CANONICAL_PUBLIC_ORIGIN;
  }
  return "http://localhost:3000";
}

export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  );
}

export function getSigningSecret(): string {
  return (
    process.env.AGENTOG_SIGNING_SECRET?.trim() ||
    process.env.AGENT_OG_JWT_SECRET?.trim() ||
    "dev-only-change-me"
  );
}

export function getApprovalTtlMs(): number {
  const minutes = Number(process.env.AGENTOG_APPROVAL_TOKEN_TTL_MINUTES);
  if (!Number.isNaN(minutes) && minutes > 0) return minutes * 60_000;
  const seconds = Number(process.env.AGENT_OG_APPROVAL_TTL_SECONDS);
  if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1000;
  return 10 * 60_000;
}

export function demoEndpointsAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_DEMO_ENDPOINTS === "true"
  );
}

export function mockIntegrations(): boolean {
  return process.env.MOCK_INTEGRATIONS === "true";
}

export function stripeSimulated(): boolean {
  return process.env.STRIPE_SIMULATED !== "false";
}
