import { MossClient } from "@moss-dev/moss";
import { mockIntegrations } from "./env";

const FALLBACK_LINES = [
  "approval required over $25",
  "transport budget limit $50",
  "wheelchair assistance mandatory for transportation",
  "blocked: diagnosis, SSN, insurance number, raw payment card",
  "guardian approval required for transportation and purchases",
];

export async function queryPolicies(query: string): Promise<string[]> {
  if (mockIntegrations()) return FALLBACK_LINES;

  const projectId = process.env.MOSS_PROJECT_ID?.trim();
  const projectKey = process.env.MOSS_PROJECT_KEY?.trim();
  const index =
    process.env.MOSS_POLICY_INDEX?.trim() || "agentog-policies";

  if (!projectId || !projectKey) return FALLBACK_LINES;

  try {
    const client = new MossClient(projectId, projectKey);
    await client.loadIndex(index);
    const results = await client.query(index, query, { topK: 5 });
    const lines =
      results.docs?.map((d) => (d.text ?? "").trim()).filter(Boolean) ?? [];
    return lines.length ? lines : FALLBACK_LINES;
  } catch {
    return FALLBACK_LINES;
  }
}
