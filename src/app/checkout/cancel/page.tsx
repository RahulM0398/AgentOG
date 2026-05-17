import Link from "next/link";

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ intent_id?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main style={{ maxWidth: 640, margin: "4rem auto", padding: "0 1.25rem" }}>
      <h1>Checkout canceled</h1>
      <p style={{ color: "var(--muted)" }}>
        No charge. Intent {sp.intent_id ? <code>{sp.intent_id}</code> : null}
      </p>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  );
}
