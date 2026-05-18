/**
 * When live Browser Use is unavailable or returns no priced option, the dashboard demo
 * still needs a concrete selection so fingerprint → approval → execution gate can run.
 * Only used when demo endpoints are allowed (see voice-pipeline).
 */
export function demoFallbackBrowserPayload(
  plannerTask: Record<string, unknown>,
  transcript: string,
  priorBrowser: Record<string, unknown>,
): Record<string, unknown> {
  const maxRaw = Number(plannerTask.max_amount);
  const cap = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : 50;
  const amount = Math.round(Math.min(cap * 0.92, Math.max(1, cap * 0.72)) * 100) / 100;
  const pickup = String(plannerTask.pickup ?? "").trim().slice(0, 120);
  const dropoff = String(plannerTask.dropoff ?? "").trim().slice(0, 120);
  const route =
    pickup && dropoff ? `${pickup} → ${dropoff}` : pickup || dropoff || "Door-to-door ride";
  const wc = /wheelchair|accessible/i.test(transcript)
    ? "Wheelchair-accessible vehicle."
    : "Standard vehicle.";

  return {
    ...priorBrowser,
    needs_configuration: false,
    demo_fallback: true,
    options: [
      {
        title: `${route} · ${wc}`,
        vendor_or_site: "Accessible Dispatch (demo estimate)",
        price_usd: amount,
        url: "https://example.com/agentog-demo-estimate",
        notes: "Synthetic quote for local/demo runs when Browser Use is off or returned no price.",
      },
    ],
    selected_vendor: "Accessible Dispatch (demo estimate)",
    amount,
    scheduled_time: String(plannerTask.time_constraint ?? "After 5:00 PM"),
    reason:
      "Demo fallback — configure BROWSER_USE_API_KEY and set MOCK_INTEGRATIONS=false for live web research.",
    primary_source_url: "https://example.com/agentog-demo-estimate",
  };
}
