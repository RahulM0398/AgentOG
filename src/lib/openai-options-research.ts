import type { BrowserResearchParams } from "./browser-use-client";

/**
 * Structured option synthesis via OpenAI JSON mode (no live browser).
 * Used when Browser Use is unavailable or returns no priced rows.
 */
export async function runOpenAiStructuredOptions(
  params: BrowserResearchParams,
): Promise<Record<string, unknown>> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return {
      options: [],
      needs_configuration: true,
      research_note: "Add OPENAI_API_KEY to enable OpenAI option synthesis.",
    };
  }

  const model = process.env.OPENAI_RESEARCH_MODEL?.trim() || "gpt-4o-mini";
  const constraints = JSON.stringify({
    max_amount: params.plannerTask.max_amount,
    required_conditions: params.plannerTask.required_conditions,
    time_constraint: params.plannerTask.time_constraint,
    domain: params.plannerTask.domain,
    action_type: params.plannerTask.action_type,
  });

  const content = `You help verify AI agent actions before human approval.
Given CONSTRAINTS JSON and USER TRANSCRIPT, respond ONLY with compact JSON (no markdown fences):
{
  "options": [{"title": string, "vendor_or_site": string, "price_usd": number, "url": string, "notes": string}],
  "selected_vendor": string,
  "amount": number,
  "scheduled_time": string,
  "reason": string,
  "primary_source_url": string
}
Rules: Pick 3–5 plausible real-world vendors/sites and USD prices that respect max_amount when present.
Use empty string for url if unknown. Be conservative on price.

CONSTRAINTS: ${constraints}

USER TRANSCRIPT:
"""${params.transcript.slice(0, 1400)}"""`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
        temperature: 0.25,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return {
        error: `OpenAI HTTP ${res.status}`,
        error_detail: t.slice(0, 800),
        options: [],
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return { parse_error: true, options: [], research_note: "OpenAI returned empty content." };
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ...parsed,
      options_source: "openai_json",
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : String(e),
      options: [],
    };
  }
}
