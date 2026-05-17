import Link from "next/link";

const OPTIONS = [
  {
    vendor: "MockRide Assist",
    price: 42,
    wheelchair: true,
    time: "5:20 PM",
    note: "Expected winner — cheapest valid option under rules.",
  },
  {
    vendor: "CityCare Ride",
    price: 48,
    wheelchair: true,
    time: "5:45 PM",
    note: "Valid backup.",
  },
  {
    vendor: "QuickCab",
    price: 35,
    wheelchair: false,
    time: "5:10 PM",
    note: "Fails — no wheelchair assistance.",
  },
  {
    vendor: "PremiumAssist",
    price: 67,
    wheelchair: true,
    time: "5:15 PM",
    note: "Fails — over $50 budget.",
  },
];

export default function RidesPage() {
  return (
    <main className="dash-wrap">
      <header className="dash-hero" style={{ marginBottom: "1.5rem" }}>
        <h1>Mock ride marketplace</h1>
        <p className="dash-tagline">Purpose-built page for Browser Use — not a real Uber or Lyft.</p>
        <p className="dash-hero-lead" style={{ marginTop: "0.75rem" }}>
          AgentOG stays generic; this HTML is only the <strong style={{ color: "var(--text)" }}>demo research surface</strong>.
          The agent must pick an option that satisfies time, budget, and wheelchair constraints before an intent is fingerprinted.
        </p>
      </header>

      <p className="dash-section-title">Constraints for the agent</p>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>After 5 PM · under $50 · wheelchair assistance required.</p>

      <ul style={{ listStyle: "none", padding: 0, marginTop: "1.5rem" }}>
        {OPTIONS.map((o) => (
          <li key={o.vendor} className="dash-card" style={{ marginBottom: "0.75rem" }}>
            <strong>{o.vendor}</strong>
            <span style={{ color: "var(--muted)", marginLeft: 8 }}>
              — ${o.price} — wheelchair: {o.wheelchair ? "yes" : "no"} — {o.time}
            </span>
            <div style={{ color: "var(--accent)", marginTop: 8, fontSize: "0.88rem" }}>{o.note}</div>
          </li>
        ))}
      </ul>

      <footer className="dash-footer-links">
        <Link href="/dashboard">← Demo console</Link>
      </footer>
    </main>
  );
}
