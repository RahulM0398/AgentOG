import Link from "next/link";
import { MOCK_RIDE_OPTIONS } from "@/lib/demo-ride-options";

export default function RidesPage() {
  return (
    <main className="dash-wrap">
      <header className="dash-hero" style={{ marginBottom: "1.5rem" }}>
        <p className="dash-tagline">Test scenario</p>
        <h1>Static ride quotes (lab)</h1>
        <p className="dash-hero-lead" style={{ marginTop: "0.75rem" }}>
          Deterministic HTML vendors and prices for Browser Use or QA — not live marketplace data. The main demo
          pipeline normally starts from a real search URL built from the caller&apos;s transcript.
        </p>
      </header>

      <p className="dash-section-title">Scenario constraints</p>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        After 5 PM · under $50 · wheelchair assistance required — matches the sample cab request used on the
        dashboard.
      </p>

      <div className="dash-table-wrap" style={{ marginTop: "1.25rem" }}>
        <table className="dash-browser-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Quote</th>
              <th>Wheelchair</th>
              <th>Pickup window</th>
              <th>Notes</th>
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
        <Link href="/dashboard">← Dashboard</Link>
      </footer>
    </main>
  );
}
