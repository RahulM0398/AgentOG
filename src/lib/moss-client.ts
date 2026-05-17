import { mockIntegrations } from "./env";

const FALLBACK_LINES = [
  "approval required over $25",
  "transport budget limit $50",
  "wheelchair assistance mandatory for transportation",
  "blocked: diagnosis, SSN, insurance number, raw payment card",
  "guardian approval required for transportation and purchases",
];

type MossDoc = {
  id?: string;
  text?: string;
  metadata?: Record<string, unknown>;
};

const DEFAULT_MANAGE_URL = "https://service.usemoss.dev/v1/manage";

async function mossGetDocs(params: {
  manageUrl: string;
  projectId: string;
  projectKey: string;
  indexName: string;
}): Promise<MossDoc[]> {
  const res = await fetch(params.manageUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-service-version": "v1",
      "x-project-key": params.projectKey,
    },
    body: JSON.stringify({
      action: "getDocs",
      projectId: params.projectId,
      indexName: params.indexName,
    }),
  });

  if (!res.ok) {
    throw new Error(`Moss getDocs failed: ${res.status} ${await res.text()}`);
  }

  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Moss getDocs: expected JSON array");
  }
  return data as MossDoc[];
}

function rankPolicyLines(query: string, docs: MossDoc[]): string[] {
  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);

  const scored = docs.map((d) => {
    const text = (d.text ?? "").toLowerCase();
    let score = 0;
    for (const w of words) {
      if (text.includes(w)) score += 1;
    }
    return { line: (d.text ?? "").trim(), score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored.filter((s) => s.score > 0 && s.line).slice(0, 5);
  if (best.length) return best.map((s) => s.line);

  return docs
    .map((d) => (d.text ?? "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

/**
 * Moss policy retrieval without the native `@moss-dev/moss` SDK (incompatible with Vercel's
 * Linux image / libstdc++). Uses the Moss Control Plane `getDocs` action over HTTPS, then ranks
 * locally. For full semantic search latency, run Moss where the native SDK is supported.
 */
export async function queryPolicies(query: string): Promise<string[]> {
  if (mockIntegrations()) return FALLBACK_LINES;

  const projectId = process.env.MOSS_PROJECT_ID?.trim();
  const projectKey = process.env.MOSS_PROJECT_KEY?.trim();
  const index =
    process.env.MOSS_POLICY_INDEX?.trim() || "agentog-policies";
  const manageUrl =
    process.env.MOSS_MANAGE_URL?.trim() || DEFAULT_MANAGE_URL;

  if (!projectId || !projectKey) return FALLBACK_LINES;

  try {
    const docs = await mossGetDocs({
      manageUrl,
      projectId,
      projectKey,
      indexName: index,
    });
    const lines = rankPolicyLines(query, docs);
    return lines.length ? lines : FALLBACK_LINES;
  } catch {
    return FALLBACK_LINES;
  }
}
