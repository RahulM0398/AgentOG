import type { BrowserResearchParams } from "./browser-use-client";
import { runBrowserUseLiveResearch } from "./browser-use-client";
import { demoFallbackBrowserPayload } from "./demo-browser-fallback";
import { demoEndpointsAllowed } from "./env";
import { extractBrowserSelection } from "./browser-selection";
import { runOpenAiStructuredOptions } from "./openai-options-research";
import { runGeminiStructuredOptions } from "./gemini-options-research";

function researchChain(): string[] {
  const raw = process.env.AGENTOG_RESEARCH_CHAIN?.trim();
  if (!raw) return ["browser_use", "openai", "gemini"];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Try Browser Use (live browse), then OpenAI JSON options, then Gemini JSON options,
 * then demo fallback when demo endpoints are allowed.
 */
export async function runResolvedResearch(
  params: BrowserResearchParams,
): Promise<Record<string, unknown>> {
  let last: Record<string, unknown> = {};
  const chain = researchChain();
  const tried: string[] = [];

  for (const step of chain) {
    if (step === "browser_use") {
      tried.push("browser_use");
      last = await runBrowserUseLiveResearch(params);
      last = { ...last, research_provider: "browser_use" };
      if (extractBrowserSelection(last)) return last;
      continue;
    }
    if (step === "openai") {
      tried.push("openai");
      last = await runOpenAiStructuredOptions(params);
      last = { ...last, research_provider: "openai_json" };
      if (extractBrowserSelection(last)) return last;
      continue;
    }
    if (step === "gemini") {
      tried.push("gemini");
      last = await runGeminiStructuredOptions(params);
      last = { ...last, research_provider: "gemini_json" };
      if (extractBrowserSelection(last)) return last;
      continue;
    }
  }

  if (demoEndpointsAllowed()) {
    return demoFallbackBrowserPayload(params.plannerTask, params.transcript, {
      ...last,
      research_providers_tried: tried,
    });
  }

  return {
    ...last,
    error:
      "No research provider returned a priced selection. Set BROWSER_USE_API_KEY, OPENAI_API_KEY, or Gemini keys; or enable demo endpoints.",
    research_providers_tried: tried,
  };
}
