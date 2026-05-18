import Image from "next/image";
import Link from "next/link";

const USE_CASES = [
  "Payments",
  "Bookings",
  "Forms",
  "Procurement",
  "Healthcare",
  "SaaS",
  "API actions",
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
          <Link
            href="/dashboard"
            className="dash-btn dash-btn-primary home-nav-cta"
            prefetch={false}
          >
            Open dashboard
          </Link>
        </nav>
      </header>

      <main className="home-main">
        <section className="home-problem-block" aria-labelledby="problem-heading">
          <h2 id="problem-heading" className="home-problem-title">
            The problem
          </h2>
          <p className="home-problem-lead">
            AI agents can already place orders, submit forms, charge cards, and bind your organization to third parties.
            Identity checks (MFA) only prove <em>who clicked approve</em> — they don&apos;t prove <em>which exact action</em>{" "}
            left the building.
          </p>
          <p className="home-problem-body">
            Without an execution envelope, a small model or integration drift can swap vendor, price, timing, or data
            fields <strong>after</strong> the human said yes — and downstream systems will still run.
          </p>
        </section>

        <section className="home-solution-split" aria-labelledby="solution-heading">
          <div>
            <h2 id="solution-heading" className="home-section-h2">
              What AgentOG does
            </h2>
            <p className="home-body-strong">
              AgentOG is an <strong>action-bound approval and execution gate</strong>: fingerprint the concrete payload,
              get explicit human consent for that snapshot, issue a short-lived token, and refuse execution when the
              final request doesn&apos;t match.
            </p>
            <ul className="home-bullet-list">
              <li>Voice, web, or agent SDK → same structured approval card</li>
              <li>Tampered vendor / amount / route / sensitive fields → blocked at the gate</li>
              <li>Payments (e.g. Stripe) only after an allowed gate check</li>
            </ul>
          </div>
          <figure className="home-diagram-wrap">
            <Image
              src="/images/agentog-architecture.png"
              alt="Architecture diagram: phone, web, and AI agents feed an action proposal into AgentOG verification with fingerprint, human approval, and execution gate; approved actions flow to payment, booking, forms, and audit, while changed payloads are blocked."
              width={1100}
              height={620}
              className="home-diagram-img"
              priority
              sizes="(max-width: 900px) 100vw, min(1100px, 92vw)"
            />
            <figcaption className="home-diagram-cap">
              Action-bound approval for AI agents — fingerprint, human approval, execution gate.
            </figcaption>
          </figure>
        </section>

        <section className="home-strip" aria-labelledby="home-flow-heading">
          <h2 id="home-flow-heading" className="home-strip-title">
            How it works
          </h2>
          <ol className="home-flow-steps">
            <li>
              <span className="home-step-num">1</span>
              <span className="home-step-text">Agent proposes a concrete action</span>
            </li>
            <li>
              <span className="home-step-num">2</span>
              <span className="home-step-text">AgentOG fingerprints that payload</span>
            </li>
            <li>
              <span className="home-step-num">3</span>
              <span className="home-step-text">Human reviews + confirms with a code</span>
            </li>
            <li>
              <span className="home-step-num">4</span>
              <span className="home-step-text">Short-lived approval token is minted</span>
            </li>
            <li>
              <span className="home-step-num">5</span>
              <span className="home-step-text">Execution gate allows only exact-match runs</span>
            </li>
          </ol>
        </section>

        <section className="home-pillars" aria-labelledby="pillars-heading">
          <h2 id="pillars-heading" className="visually-hidden">
            Pillars
          </h2>
          <article className="home-pillar">
            <h3 className="home-pillar-title">Fingerprint</h3>
            <p className="home-pillar-body">
              Vendor, price, route, conditions, and share rules hash together — not a vague blanket approval.
            </p>
          </article>
          <article className="home-pillar">
            <h3 className="home-pillar-title">Human approval</h3>
            <p className="home-pillar-body">
              Duo-style review: see the action data, enter the OTP from email or voice, then approve or reject.
            </p>
          </article>
          <article className="home-pillar">
            <h3 className="home-pillar-title">Execution gate</h3>
            <p className="home-pillar-body">
              Runtime compares token + canonical payload. Divergence stops checkout and downstream commits.
            </p>
          </article>
        </section>

        <section className="home-demo-panel" aria-labelledby="demo-heading">
          <div className="home-demo-panel-inner">
            <h2 id="demo-heading" className="home-demo-title">
              Run the hosted demo
            </h2>
            <p className="home-demo-lead">
              The dashboard walks one vertical (sample utterance → options → approval → gate → optional Stripe). Swap
              the utterance or webhook for your own domain — the envelope stays the same.
            </p>
            <ul className="home-chip-row" aria-label="Example actions">
              {USE_CASES.map((label) => (
                <li key={label}>
                  <span className="home-chip">{label}</span>
                </li>
              ))}
            </ul>
            <figure className="home-voice-card">
              <figcaption className="home-voice-cap">Sample ride request (demo only)</figcaption>
              <blockquote className="home-voice-quote">
                Book a cab from 560 20th Street to Ghirardelli Square after 5 PM, under $50, with wheelchair assistance.
              </blockquote>
            </figure>
            <div className="home-demo-actions">
              <Link href="/dashboard" className="dash-btn dash-btn-primary home-demo-btn" prefetch={false}>
                Open dashboard demo
              </Link>
              <Link href="/rides" className="dash-btn dash-btn-outline home-demo-btn" prefetch={false}>
                Static quote table (QA)
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
