import Link from "next/link";

const USE_CASES = [
  "Ride",
  "Pharmacy",
  "SaaS purchase",
  "Appointments",
  "Forms",
  "Refunds",
  "Procurement",
  "Caregiving",
];

export default function HomePage() {
  return (
    <div className="home-product">
      <header className="home-topbar">
        <span className="home-brand">AgentOG</span>
        <nav className="home-topnav" aria-label="Primary">
          <Link href="/dashboard" className="home-nav-link" prefetch={false}>
            Live demo
          </Link>
          <Link href="/dashboard" className="dash-btn dash-btn-primary home-nav-cta" prefetch={false}>
            Open dashboard
          </Link>
        </nav>
      </header>

      <main className="home-main">
        <section className="home-hero-split" aria-labelledby="home-hero-heading">
          <div className="home-hero-copy">
            <p className="home-eyebrow">Human approval · Execution control</p>
            <h1 id="home-hero-heading" className="home-headline">
              Stop agents at the moment of impact — then prove the exact action matched what was approved.
            </h1>
            <p className="home-subhead">
              AgentOG fingerprints high-impact requests (money, bookings, data, commitments), collects explicit human
              approval for <em>that payload</em>, mints a short-lived token, and blocks execution when reality drifts.
            </p>
            <div className="home-hero-actions">
              <Link href="/dashboard" className="dash-btn dash-btn-primary home-hero-btn" prefetch={false}>
                Run the interactive demo
              </Link>
              <a href="tel:+14782497644" className="dash-btn dash-btn-outline home-hero-btn">
                Call · +1 (478) 249-7644
              </a>
            </div>
            <p className="home-hero-note">
              Voice hits your deployment via AgentPhone webhooks when configured — same approval envelope as the web
              demo.
            </p>
          </div>

          <figure className="home-hero-diagram">
            <img
              src="/images/agentog-architecture.svg"
              width={920}
              height={440}
              className="home-hero-diagram-img"
              alt="Architecture: phone, web, and AI agents propose an action; AgentOG verifies with fingerprint, human approval, and execution gate; approved flows reach payment, booking, forms, and audit, or changed payloads are blocked."
            />
          </figure>
        </section>

        <section className="home-strip" aria-labelledby="home-flow-heading">
          <h2 id="home-flow-heading" className="home-strip-title">
            How it flows
          </h2>
          <ol className="home-flow-steps">
            <li>
              <span className="home-step-num">1</span>
              <span className="home-step-text">Agent proposes a concrete action</span>
            </li>
            <li>
              <span className="home-step-num">2</span>
              <span className="home-step-text">Fingerprint captures payload + policy context</span>
            </li>
            <li>
              <span className="home-step-num">3</span>
              <span className="home-step-text">Human approves that exact action</span>
            </li>
            <li>
              <span className="home-step-num">4</span>
              <span className="home-step-text">Short-lived token issued</span>
            </li>
            <li>
              <span className="home-step-num">5</span>
              <span className="home-step-text">Gate allows only a matching execution</span>
            </li>
          </ol>
        </section>

        <section className="home-pillars" aria-labelledby="pillars-heading">
          <h2 id="pillars-heading" className="visually-hidden">
            Product pillars
          </h2>
          <article className="home-pillar">
            <h3 className="home-pillar-title">Fingerprint</h3>
            <p className="home-pillar-body">
              Structured intent + constraints become a stable hash — not a vague “yes” to whatever ships later.
            </p>
          </article>
          <article className="home-pillar">
            <h3 className="home-pillar-title">Approver</h3>
            <p className="home-pillar-body">
              Email, SMS, voice, or your own channels — the human sees vendor, amount, terms, and sensitive-field rules
              before committing.
            </p>
          </article>
          <article className="home-pillar">
            <h3 className="home-pillar-title">Execution gate</h3>
            <p className="home-pillar-body">
              Runtime checks token + canonical payload. Divergence → deny and redo with a corrected bundle (e.g.
              Stripe only after match).
            </p>
          </article>
        </section>

        <section className="home-compare" aria-labelledby="compare-heading">
          <h2 id="compare-heading" className="home-compare-title">
            MFA proves identity · AgentOG proves the action
          </h2>
          <div className="home-compare-grid">
            <div className="home-compare-card">
              <p className="home-compare-label">Typical MFA</p>
              <p className="home-compare-desc">Confirms the human at the keyboard or phone.</p>
            </div>
            <div className="home-compare-card home-compare-card-accent">
              <p className="home-compare-label">AgentOG</p>
              <p className="home-compare-desc">
                Confirms the <strong>precise AI-initiated action</strong> that person approved — if the agent swaps
                vendor, price, or timing, execution stops.
              </p>
            </div>
          </div>
        </section>

        <section className="home-demo-panel" aria-labelledby="demo-heading">
          <div className="home-demo-panel-inner">
            <h2 id="demo-heading" className="home-demo-title">
              Try the live story
            </h2>
            <p className="home-demo-lead">
              The dashboard runs one vertical end-to-end (voice webhook → planning → optional live browse → approval →
              gate). The ride line is <strong>demo only</strong>; the same envelope applies everywhere below.
            </p>
            <ul className="home-chip-row" aria-label="Example domains">
              {USE_CASES.map((label) => (
                <li key={label}>
                  <span className="home-chip">{label}</span>
                </li>
              ))}
            </ul>
            <figure className="home-voice-card">
              <figcaption className="home-voice-cap">Sample utterance</figcaption>
              <blockquote className="home-voice-quote">
                Book a cab from 560 20th Street to Ghirardelli Square after 5 PM, under $50, with wheelchair assistance.
              </blockquote>
            </figure>
            <div className="home-demo-actions">
              <Link href="/dashboard" className="dash-btn dash-btn-primary home-demo-btn" prefetch={false}>
                Start demo on dashboard
              </Link>
              <Link href="/rides" className="dash-btn dash-btn-outline home-demo-btn" prefetch={false}>
                Static test scenario (quotes table)
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p>
          <a href="tel:+14782497644">Agent OG line · +1 (478) 249-7644</a>
          <span className="home-footer-sep">·</span>
          <Link href="/dashboard">Dashboard</Link>
          <span className="home-footer-sep">·</span>
          <a href="/api/health" target="_blank" rel="noreferrer">
            Health
          </a>
        </p>
      </footer>

      <a className="home-health-corner" href="/api/health" target="_blank" rel="noreferrer">
        App health status
      </a>
    </div>
  );
}
