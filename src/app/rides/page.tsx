import Link from "next/link";
import { MOCK_RIDE_OPTIONS } from "@/lib/demo-ride-options";

export default function RidesPage() {
  return (
    <main className="dash-wrap">
      <header className="dash-hero" style={{ marginBottom: "1.5rem" }}>
        <h1>Mock ride marketplace</h1>
        <p className="dash-tagline">
          Optional static fixture — the production demo uses Browser Use on the live web instead of this page.
        </p>
        <p className="dash-hero-lead" style={{ marginTop: "0.75rem" }}>
          Keep this file only if you want a deterministic HTML lab for Browser Use. The main pipeline starts from a real search engine URL built from the caller transcript.
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
