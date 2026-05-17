import Link from "next/link";

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ intent_id?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="dash-wrap dash-narrow">
      <header className="dash-hero" style={{ marginBottom: "1.5rem" }}>
        <h1 className="page-hero-title" style={{ marginBottom: "0.35rem" }}>
          Checkout canceled
        </h1>
        <p className="page-hero-text">
          No charge.{" "}
          {sp.intent_id ? (
            <>
              Intent <code style={{ color: "var(--orange)", fontWeight: 700 }}>{sp.intent_id}</code>.
            </>
          ) : null}
        </p>
      </header>
      <Link href="/dashboard" className="dash-link-btn">
        ← Back to console
      </Link>
    </main>
  );
}
