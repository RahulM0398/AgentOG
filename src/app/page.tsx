import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-page dash-wrap">
      <header className="home-hero">
        <p className="home-kicker">AgentOG</p>
        <h1 className="home-title">Action-bound verification for AI agents</h1>
        <p className="home-lead">
          AgentOG is a general-purpose human approval and execution-control framework for AI agents. When an AI
          agent wants to perform a high-impact action such as booking a service, making a purchase, submitting a
          form, sending sensitive data, or completing a transaction, AgentOG creates an action fingerprint, asks a
          trusted human to approve the exact action, issues a short-lived approval token, and blocks execution if the
          final action changes.
        </p>
      </header>

      <section className="home-section">
        <h2 className="home-h2">Live demo</h2>
        <p className="home-body">
          The ride-booking flow is only the live demo. Try saying something like:
        </p>
        <blockquote className="home-quote">
          Book a cab from 560 20th Street to Ghirardelli Square after 5 PM, under $50, with wheelchair assistance.
        </blockquote>
        <p className="home-body">
          The same AgentOG framework can support ride booking, pharmacy pickup, SaaS purchase, appointment
          scheduling, form submission, refund negotiation, enterprise procurement, healthcare and caregiving
          workflows, and other governed actions.
        </p>
      </section>

      <section className="home-section">
        <h2 className="home-h2">Not MFA — action verification</h2>
        <p className="home-body">
          Normal MFA verifies the user. <strong>AgentOG verifies the exact AI agent action the user approved.</strong>{" "}
          We add a secure verification layer tied to the requested action: if execution diverges from what was
          approved, the human can deny it and redo the transaction with a corrected payload.
        </p>
      </section>

      <section className="home-actions">
        <Link href="/dashboard" className="dash-btn dash-btn-primary home-cta" prefetch={false}>
          Start demo
        </Link>
        <a href="tel:+14782497644" className="dash-btn dash-btn-outline home-cta">
          Call Agent OG · +1 (478) 249-7644
        </a>
      </section>

      <p className="home-footnote">
        Voice requests can also reach Agent OG at <strong>+1 (478) 249-7644</strong> when your AgentPhone webhook is
        pointed at this deployment.
      </p>

      <a className="home-health-corner" href="/api/health" target="_blank" rel="noreferrer">
        App health status
      </a>
    </main>
  );
}
