const DEMO_BROWSER_RESULT = {
  selected_vendor: "MockRide Assist",
  amount: 42,
  scheduled_time: "5:20 PM",
  wheelchair_assistance: true,
  reason: "Lowest valid option under $50 with wheelchair assistance after 5 PM.",
};

export async function runBrowserUseRideResearch(baseUrl: string): Promise<
  Record<string, unknown>
> {
  const { mockIntegrations } = await import("./env");
  const key = process.env.BROWSER_USE_API_KEY?.trim();
  const disabled =
    process.env.BROWSER_USE_DISABLED === "true" || mockIntegrations();

  if (disabled || !key) {
    return { ...DEMO_BROWSER_RESULT, fallback: true };
  }

  try {
    const { BrowserUseClient } = await import("browser-use-sdk");
    const client = new BrowserUseClient({ apiKey: key });
    const llm = process.env.BROWSER_USE_MODEL?.trim();
    const taskPrompt = `Open the ride options page and read every listed vendor, price, wheelchair assistance flag, and available time.
Pick the cheapest option that is available after 5 PM, costs under 50 USD total, and includes wheelchair assistance.
Respond ONLY with compact JSON: {"selected_vendor":string,"amount":number,"scheduled_time":string,"wheelchair_assistance":boolean,"reason":string}`;

    const created = await client.tasks.createTask({
      task: taskPrompt,
      startUrl: `${baseUrl.replace(/\/$/, "")}/rides`,
      ...(llm ? { llm: llm as never } : {}),
      maxSteps: 25,
    });

    const view = await created.complete({ interval: 2500 });
    const text = view.output ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ...DEMO_BROWSER_RESULT, parse_error: true, raw: text };
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    return { ...DEMO_BROWSER_RESULT, error: true };
  }
}
