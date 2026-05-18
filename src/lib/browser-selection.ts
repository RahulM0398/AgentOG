/** Normalize Browser Use / OpenAI / Gemini JSON into a priced selection for fingerprints. */
export function extractBrowserSelection(browser: Record<string, unknown>): {
  vendor: string;
  amount: number;
  scheduled_time: string;
  reason: string;
  primary_source_url: string;
} | null {
  let vendor = String(browser.selected_vendor ?? "").trim();
  let amount = Number(browser.amount);
  const opts = browser.options as Array<Record<string, unknown>> | undefined;
  if ((!vendor || Number.isNaN(amount) || amount <= 0) && opts?.length) {
    const o = opts[0]!;
    vendor =
      String(o.vendor_or_site ?? o.title ?? "").trim() ||
      String(o.title ?? "").trim();
    amount = Number(o.price_usd ?? NaN);
  }
  const scheduled_time =
    String(browser.scheduled_time ?? "as quoted online").trim() || "as quoted online";
  const reason = String(browser.reason ?? "").trim() || "Selected from research.";
  const primary_source_url = String(browser.primary_source_url ?? "").trim();
  if (!vendor || Number.isNaN(amount) || amount <= 0) return null;
  return { vendor, amount, scheduled_time, reason, primary_source_url };
}
