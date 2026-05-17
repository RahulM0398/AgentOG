import Link from "next/link";
import { MOCK_RIDE_OPTIONS } from "@/lib/demo-ride-options";

export default function RidesPage() {
  return (
    <main className="dash-wrap">
      <header className="dash-hero" style={{ marginBottom: "1.5rem" }}>
        <h1>Mock ride marketplace</h1>
        <p className="dash-tagline">
          Controlled HTML surface for Browser Use — not a live Uber or Lyft integration.
        </p>
        <p className="dash-hero-lead" style={{ marginTop: "0.75rem" }}>
          AgentOG stays domain-agnostic; this page exists so the agent can <strong style={{ color: "var(--text)" }}>research</strong> options,
          then the API fingerprints the chosen vendor, price, time, and conditions before any payment step.
        </p>
      </header>

      <p className="dash-section-title">Constraints implied by the caller</p>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>After 5 PM · under $50 · wheelchair assistance required.</p>

      <div className="dash-table-wrap" style={{ marginTop: "1.25rem" }}>
        <table className="dash-browser-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Price</th>
              <th>Wheelchair</th>
              <th>Time</th>
              <th>Judge note</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_RIDE_OPTIONS.map((o) => (
              <tr key={o.vendor}>
                <td>
                  <strong>{o.vendor}</strong>
                </td>
                <td>${o.price}</td>
                <td>{o.wheelchair ? "Yes" : "No"}</td>
                <td>{o.time}</td>
                <td style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>{o.judgeNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="dash-footer-links">
        <Link href="/dashboard">← Demo console</Link>
      </footer>
    </main>
  );
}
