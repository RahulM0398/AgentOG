import Link from "next/link";

export default function HomePage() {
  return (
    <main className="dash-wrap dash-home">
      <header className="dash-hero dash-hero-center">
        <p className="dash-product-label">Action-bound verification layer</p>
        <h1>AgentOG</h1>
        <p className="dash-tagline">Normal MFA verifies the user. AgentOG verifies the exact AI agent action they approved.</p>
        <p className="dash-hero-lead dash-hero-lead-narrow">
          Fingerprint the payload → human approves <em>that</em> action → short-lived token → execution gate blocks tampering → audit.
          Voice via AgentPhone; planning via Gemini/Gemma; web research via Browser Use; policy via Moss; memory via Supermemory; approvals and receipts via
          AgentMail.
        </p>
        <div className="dash-home-cta">
          <Link href="/dashboard" className="dash-btn dash-btn-primary">
            Open demo console
          </Link>
          <Link href="/rides" className="dash-btn dash-btn-outline">
            Mock marketplace
          </Link>
        </div>
      </header>

      <section className="dash-home-grid">
        <div className="dash-card">
          <div className="dash-card-step">Live demo</div>
          <h2 className="dash-home-card-title">Ride booking story</h2>
          <p className="dash-card-why">
            Example request: book a cab from 560 20th Street to Ghirardelli Square after 5 PM, under $50, wheelchair assistance. Same pipeline applies to
            commerce-style asks (e.g. constrained product search with ranked options).
          </p>
        </div>
        <div className="dash-card">
          <div className="dash-card-step">General-purpose</div>
          <h2 className="dash-home-card-title">Same framework</h2>
          <p className="dash-card-why">
            Pharmacy pickup, SaaS purchase, appointments, forms, refunds, procurement, caregiving — any high-impact step where money, identity, location, or
            sensitive data moves.
          </p>
        </div>
        <div className="dash-card">
          <div className="dash-card-step">Integrations</div>
          <h2 className="dash-home-card-title">How pieces fit</h2>
          <ul className="dash-list dash-list-tight">
            <li>
              <strong>AgentPhone</strong> — inbound transcript, outbound guardian call/SMS.
            </li>
            <li>
              <strong>Browser Use</strong> — navigates controlled pages before fingerprinting.
            </li>
            <li>
              <strong>AgentMail</strong> — approval cards and audit receipts.
            </li>
          </ul>
        </div>
      </section>

      <footer className="dash-footer-links dash-footer-center">
        <a href="/api/health" target="_blank" rel="noreferrer">
          API health
        </a>
      </footer>
    </main>
  );
}
