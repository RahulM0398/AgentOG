/** Strip legacy ISO-prefixed receipt lines for dashboard display. */
export function receiptLineForDisplay(raw: string): string {
  return raw
    .replace(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})\s+/,
      "",
    )
    .trim();
}
