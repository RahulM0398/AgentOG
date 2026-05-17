import { mockIntegrations } from "./env";

export async function fetchSupermemoryContext(query: string): Promise<string> {
  if (mockIntegrations()) {
    return [
      "Default transport budget $50.",
      "Wheelchair assistance required for rides.",
      "Guardian approval required for transport bookings and purchases.",
      `Guardian contact: ${process.env.GUARDIAN_NAME ?? "Rahul"} / ${process.env.GUARDIAN_EMAIL ?? process.env.AGENT_OG_APPROVER_EMAIL ?? ""}.`,
      "Never share medical diagnosis, SSN, insurance number, or raw payment card.",
    ].join("\n");
  }

  const key = process.env.SUPERMEMORY_API_KEY?.trim();
  const container =
    process.env.SUPERMEMORY_USER_CONTAINER?.trim() || "user_001";

  if (!key) {
    return "Supermemory not configured; using defaults.";
  }

  try {
    const Supermemory = (await import("supermemory")).default;
    const client = new Supermemory();
    const profile = await client.profile({
      containerTag: container,
      q: query,
    });
    const parts: string[] = [];
    if (profile.profile?.static?.length) {
      parts.push("Static:\n" + profile.profile.static.join("\n"));
    }
    if (profile.profile?.dynamic?.length) {
      parts.push("Dynamic:\n" + profile.profile.dynamic.join("\n"));
    }
    const rawResults = profile.searchResults?.results ?? [];
    const memories = rawResults.map((r) => {
      if (r && typeof r === "object" && "memory" in r) {
        return String((r as { memory?: string }).memory ?? "");
      }
      return "";
    }).filter(Boolean);
    if (memories.length) {
      parts.push("Memories:\n" + memories.join("\n"));
    }
    return parts.join("\n\n") || "No profile results.";
  } catch {
    return "Supermemory query failed; using defaults.";
  }
}
