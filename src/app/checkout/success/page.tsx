import Link from "next/link";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ intent_id?: string; simulated?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main style={{ maxWidth: 640, margin: "4rem auto", padding: "0 1.25rem" }}>
      <h1>Checkout complete</h1>
      <p style={{ color: "var(--muted)" }}>
        Intent{" "}
        {sp.intent_id ? <code>{sp.intent_id}</code> : <span>unknown</span>} —
        AgentOG execution gate allowed this payment step.
      </p>
      {sp.simulated === "1" ? (
        <p style={{ color: "var(--accent)" }}>
          Simulated checkout (Stripe sandbox disabled or STRIPE_SIMULATED=true).
        </p>
      ) : null}
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  );
}
