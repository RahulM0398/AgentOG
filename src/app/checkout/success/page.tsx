import Link from "next/link";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ intent_id?: string; simulated?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="dash-wrap dash-narrow">
      <header className="dash-hero" style={{ marginBottom: "1.5rem" }}>
        <h1 className="page-hero-title" style={{ marginBottom: "0.35rem" }}>
          Payment step completed
        </h1>
        <p className="dash-tagline">Execution gate already allowed this checkout.</p>
        <p className="page-hero-text" style={{ marginTop: "1rem" }}>
          Intent{" "}
          {sp.intent_id ? (
            <code style={{ color: "var(--orange)", fontWeight: 700 }}>{sp.intent_id}</code>
          ) : (
            <span>unknown</span>
          )}{" "}
          — Stripe ran only because the final payload matched the approved fingerprint.
        </p>
        {sp.simulated === "1" ? (
          <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.9375rem" }}>
            Simulated redirect (<code>STRIPE_SIMULATED=true</code> or no Stripe secret).
          </p>
        ) : null}
      </header>
      <Link href="/dashboard" className="dash-link-btn">
        ← Back to console
      </Link>
    </main>
  );
}
