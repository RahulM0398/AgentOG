import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BrowserResearchParams } from "./browser-use-client";
import { GEMINI_DEFAULT_MODEL_ID } from "./gemini";
import { getGeminiApiKey } from "./env";

/**
 * Structured option synthesis via Gemini JSON mode (no live browser session).
 */
export async function runGeminiStructuredOptions(
  params: BrowserResearchParams,
): Promise<Record<string, unknown>> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      options: [],
      needs_configuration: true,
      research_note: "Add GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY for Gemini option synthesis.",
    };
  }

  const modelId =
    process.env.GEMINI_RESEARCH_MODEL?.trim() ||
    process.env.GEMINI_PLANNER_MODEL?.trim() ||
    GEMINI_DEFAULT_MODEL_ID;

  const constraints = JSON.stringify({
    max_amount: params.plannerTask.max_amount,
    required_conditions: params.plannerTask.required_conditions,
    domain: params.plannerTask.domain,
    action_type: params.plannerTask.action_type,
  });

  const prompt = `You help verify AI agent actions before human approval.
Return ONLY valid JSON (no markdown):
{
  "options": [{"title": string, "vendor_or_site": string, "price_usd": number, "url": string, "notes": string}],
  "selected_vendor": string,
  "amount": number,
  "scheduled_time": string,
  "reason": string,
  "primary_source_url": string
}
Pick plausible vendors and USD prices that respect constraints. Empty url if unknown.

CONSTRAINTS: ${constraints}

TRANSCRIPT:
"""${params.transcript.slice(0, 1400)}"""`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelId,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const res = await model.generateContent(prompt);
    const raw = res.response.text()?.trim();
    if (!raw) {
      return { parse_error: true, options: [], research_note: "Gemini returned empty content." };
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ...parsed,
      options_source: "gemini_json",
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : String(e),
      options: [],
    };
  }
}
