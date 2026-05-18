import { NextResponse } from "next/server";
import { getResolvedGeminiModelIds } from "@/lib/gemini";
import {
  getGeminiApiKey,
  mockIntegrations,
  stripeSimulated,
} from "@/lib/env";

export async function GET() {
  const gemini = !!getGeminiApiKey();
  const agentmail =
    !!process.env.AGENTMAIL_API_KEY?.trim() &&
    !!(process.env.AGENTMAIL_INBOX_ID?.trim() || process.env.AGENTMAIL_FROM?.trim());
  const agentphoneOutbound =
    !!process.env.AGENTPHONE_API_KEY?.trim() &&
    !!process.env.AGENTPHONE_AGENT_ID?.trim();
  const agentphoneWebhookSecret = !!process.env.AGENTPHONE_WEBHOOK_SECRET?.trim();
  const moss =
    !!process.env.MOSS_PROJECT_ID?.trim() && !!process.env.MOSS_PROJECT_KEY?.trim();
  const supermemory = !!process.env.SUPERMEMORY_API_KEY?.trim();
  const browserUse =
    !!process.env.BROWSER_USE_API_KEY?.trim() &&
    process.env.BROWSER_USE_DISABLED !== "true";
  const stripeKey = !!process.env.STRIPE_SECRET_KEY?.trim();
  const stripeWebhook = !!process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const guardianEmail =
    !!process.env.GUARDIAN_EMAIL?.trim() ||
    !!process.env.AGENT_OG_APPROVER_EMAIL?.trim();
  const guardianPhone =
    !!process.env.GUARDIAN_PHONE?.trim() ||
    !!process.env.AGENT_OG_APPROVER_PHONE?.trim();
  const baseUrl =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    null;

  const geminiModels = getResolvedGeminiModelIds();

  return NextResponse.json({
    status: "ok",
    integrations: {
      gemini_or_google_ai: gemini,
      gemini_models_effective: geminiModels,
      mock_integrations: mockIntegrations(),
      moss,
      supermemory,
      browser_use: browserUse,
      agentmail_ready: agentmail,
      agentphone_outbound_ready: agentphoneOutbound,
      agentphone_webhook_secret_set: agentphoneWebhookSecret,
      guardian_email_set: guardianEmail,
      guardian_phone_set: guardianPhone,
      stripe_secret_set: stripeKey,
      stripe_simulated: stripeSimulated(),
      stripe_webhook_secret_set: stripeWebhook,
      openai_for_browser_llm: !!process.env.OPENAI_API_KEY?.trim(),
    },
    urls: {
      /** Expected AgentPhone dashboard target; not validated against live config. */
      agentphone_webhook_path: "/api/webhooks/agentphone",
      stripe_webhook_path: "/api/webhooks/stripe",
      configured_base_hint: baseUrl,
    },
  });
}
