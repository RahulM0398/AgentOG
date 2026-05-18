import { mockIntegrations } from "./env";

export type BrowserResearchParams = {
  transcript: string;
  plannerTask: Record<string, unknown>;
};

function searchStartUrl(query: string): string {
  const engine =
    process.env.BROWSER_USE_SEARCH_ENGINE?.trim().toLowerCase() || "google";
  const q = query.slice(0, 320).trim();
  if (!q) return "https://duckduckgo.com/";
  if (engine === "duckduckgo" || engine === "ddg") {
    return `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function stripMarkdownJsonFence(text: string): string {
  let t = text.trim();
  const inner = t.match(/```(?:json)?\s*\r?\n?([\s\S]*?)```/i);
  if (inner?.[1]) t = inner[1].trim();
  return t;
}

/** First `{ ... }` with balanced braces — avoids greedy-regex grabbing trailing prose. */
function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function buildSearchQuery(transcript: string, planner: Record<string, unknown>): string {
  const explicit =
    String(planner.web_search_query ?? "").trim() ||
    String(planner.user_goal_summary ?? "").trim();
  if (explicit) return explicit;
  const parts = [
    String(planner.action_type ?? ""),
    String(planner.domain ?? ""),
    transcript.slice(0, 400),
  ].filter(Boolean);
  return parts.join(" ").trim() || transcript.trim();
}

/**
 * Live web research via Browser Use cloud — no fabricated marketplace rows.
 * Requires BROWSER_USE_API_KEY and BROWSER_USE_DISABLED !== true.
 */
export async function runBrowserUseLiveResearch(
  params: BrowserResearchParams,
): Promise<Record<string, unknown>> {
  const key = process.env.BROWSER_USE_API_KEY?.trim();
  const disabled = process.env.BROWSER_USE_DISABLED === "true" || mockIntegrations();

  if (disabled || !key) {
    return {
      error:
        "Live web research unavailable: add BROWSER_USE_API_KEY and ensure MOCK_INTEGRATIONS=false and BROWSER_USE_DISABLED=false.",
      options: [],
      needs_configuration: true,
    };
  }

  const query = buildSearchQuery(params.transcript, params.plannerTask);
  const startUrl = searchStartUrl(query);
  const constraintsJson = JSON.stringify({
    max_amount: params.plannerTask.max_amount,
    required_conditions: params.plannerTask.required_conditions,
    time_constraint: params.plannerTask.time_constraint,
    domain: params.plannerTask.domain,
    action_type: params.plannerTask.action_type,
  });

  try {
    const { BrowserUseClient } = await import("browser-use-sdk");
    const client = new BrowserUseClient({ apiKey: key });
    const llm = process.env.BROWSER_USE_MODEL?.trim();
    const taskPrompt = `You are helping AgentOG verify a real user request before human approval.

CONTEXT (constraints JSON): ${constraintsJson}

USER TRANSCRIPT (verbatim): """${params.transcript.slice(0, 1200)}"""

Open the starting search page and browse the real open web. Find 3–5 concrete options (products, services, rides, bookings — whatever matches the request) with identifiable seller/site names and prices in USD when visible on the page.

Pick ONE best option that satisfies the constraints when possible. Do not invent URLs — only cite pages you actually opened.

Every option object MUST include a non-empty "url" string for a page you visited. Set "primary_source_url" to that same URL for your chosen option.

Respond ONLY with compact JSON (no markdown):
{
  "options": [
    {"title": string, "vendor_or_site": string, "price_usd": number | null, "url": string, "notes": string}
  ],
  "selected_vendor": string,
  "amount": number,
  "scheduled_time": string,
  "reason": string,
  "primary_source_url": string
}`;

    const maxStepsRaw = Number(process.env.BROWSER_USE_MAX_STEPS);
    const maxSteps = Number.isFinite(maxStepsRaw)
      ? Math.min(80, Math.max(12, maxStepsRaw))
      : 40;

    const created = await client.tasks.createTask({
      task: taskPrompt,
      startUrl,
      ...(llm ? { llm: llm as never } : {}),
      maxSteps,
    });

    const view = await created.complete({ interval: 2500 });
    const text = view.output ?? "";
    const cleaned = stripMarkdownJsonFence(text.trim());
    const jsonSlice =
      extractBalancedJsonObject(cleaned) ?? cleaned.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonSlice) {
      return {
        parse_error: true,
        raw_output_excerpt: text.slice(0, 2500),
        start_url: startUrl,
        search_query: query,
      };
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonSlice) as Record<string, unknown>;
    } catch {
      return {
        parse_error: true,
        json_parse_error: true,
        raw_output_excerpt: text.slice(0, 2500),
        start_url: startUrl,
        search_query: query,
      };
    }
    return {
      ...parsed,
      start_url: startUrl,
      search_query: query,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : String(e),
      options: [],
      start_url: startUrl,
      search_query: query,
    };
  }
}
