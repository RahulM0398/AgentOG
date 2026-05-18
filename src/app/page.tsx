import Link from "next/link";

export default function HomePage() {
  return (
    <main className="dash-wrap demo-shell">
      <header className="demo-hero">
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>AgentOG</h1>
        <p className="demo-lead">
          Action-bound human approval for AI agents: verify the <strong>exact transaction</strong> before execution — not just identity.
        </p>
        <p className="demo-muted">
          Voice → signed webhook → structured task → live web research → fingerprint → email & guardian call → token → execution gate → Stripe.
        </p>
      </header>
      <p style={{ marginBottom: "1rem" }}>
        <Link href="/dashboard" className="dash-btn dash-btn-primary" style={{ textDecoration: "none", marginRight: "0.5rem" }}>
          Start demo
        </Link>
        <a href="/api/health" className="dash-btn dash-btn-outline" style={{ textDecoration: "none" }} target="_blank" rel="noreferrer">
          Integration health
        </a>
      </p>
      <p className="demo-muted">
        The ride example is only one story — pharmacy, SaaS, appointments, and forms use the same approval envelope.
      </p>
    </main>
  );
}
