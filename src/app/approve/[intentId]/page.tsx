"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type IntentApi = {
  intent_id: string;
  action_hash: string;
  approval_status: string;
  risk_level: string;
  raw_input: Record<string, unknown>;
};

export default function ApproveIntentPage() {
  const params = useParams();
  const intentId = params.intentId as string;
  const [intent, setIntent] = useState<IntentApi | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/intents/${intentId}`);
      if (!res.ok) return;
      const data = (await res.json()) as IntentApi;
      if (!cancelled) setIntent(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [intentId]);

  async function approve() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent_id: intentId, verification_code: code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error ?? "Approval failed");
      return;
    }
    try {
      localStorage.setItem(`agentog_token_${intentId}`, data.approval_token);
    } catch {
      /* ignore */
    }
    setMsg(
      "Approved. Token saved in this browser. Return to the dashboard → Verify approved payload.",
    );
  }

  async function reject() {
    setLoading(true);
    await fetch("/api/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent_id: intentId }),
    });
    setLoading(false);
    setMsg("Rejected.");
  }

  if (!intent) {
    return (
      <main className="dash-wrap dash-narrow">
        <p style={{ color: "var(--muted)" }}>Loading intent…</p>
      </main>
    );
  }

  const r = intent.raw_input;

  return (
    <main className="dash-wrap dash-narrow">
      <header className="dash-hero" style={{ marginBottom: "1.25rem" }}>
        <h1>Approve Exact Action</h1>
        <p className="dash-tagline">You are binding trust to one fingerprint — not to “the agent” in general.</p>
        <p className="dash-hero-lead" style={{ marginTop: "0.75rem" }}>
          MFA proves <strong style={{ color: "var(--text)" }}>who</strong> you are. AgentOG proves{" "}
          <strong style={{ color: "var(--text)" }}>what</strong> was approved: vendor, price, route, conditions, and which fields may be shared.
        </p>
      </header>

      <section className="dash-card" style={{ marginBottom: "1.25rem" }}>
        <div className="dash-card-head">
          <div>
            <div className="dash-card-step">Payload</div>
            <h2>What you are approving</h2>
          </div>
          <span className="dash-pill dash-pill-warn">risk {intent.risk_level}</span>
        </div>
        <dl className="dash-dl">
          <div>
            <dt>Action type</dt>
            <dd>{String(r.action_type ?? "")}</dd>
          </div>
          <div>
            <dt>Vendor</dt>
            <dd>
              <strong>{String(r.vendor)}</strong>
            </dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>
              ${String(r.amount)} {String(r.currency)}
            </dd>
          </div>
          <div>
            <dt>Summary</dt>
            <dd>{String(r.action_summary ?? "—")}</dd>
          </div>
          <div>
            <dt>Research URL</dt>
            <dd>
              {r.research_source_url ? (
                <a href={String(r.research_source_url)} target="_blank" rel="noreferrer">
                  {String(r.research_source_url)}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt>Pickup</dt>
            <dd>{String(r.pickup ?? "")}</dd>
          </div>
          <div>
            <dt>Dropoff</dt>
            <dd>{String(r.dropoff ?? "")}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{String(r.scheduled_time ?? "")}</dd>
          </div>
          <div>
            <dt>Conditions</dt>
            <dd>{JSON.stringify(r.required_conditions)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{intent.approval_status}</dd>
          </div>
          <div>
            <dt>Action hash</dt>
            <dd className="dash-hash">{intent.action_hash}</dd>
          </div>
          <div>
            <dt>Data shared</dt>
            <dd>{JSON.stringify(r.data_shared)}</dd>
          </div>
          <div>
            <dt>Data blocked</dt>
            <dd>{JSON.stringify(r.data_blocked)}</dd>
          </div>
        </dl>
      </section>

      <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, marginBottom: "1rem" }}>
        Verification code (from AgentMail or voice)
        <input
          className="dash-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. 4829"
          autoComplete="one-time-code"
        />
      </label>

      <div className="dash-control-row">
        <button type="button" className="dash-btn dash-btn-primary" onClick={() => void approve()} disabled={loading}>
          Approve Exact Action
        </button>
        <button type="button" className="dash-btn dash-btn-outline" onClick={() => void reject()} disabled={loading}>
          Reject
        </button>
      </div>

      {msg ? (
        <div className="dash-alert" style={{ marginTop: "1.25rem" }}>
          <strong>Result</strong>
          <p style={{ margin: "0.35rem 0 0", color: "var(--muted)" }}>{msg}</p>
        </div>
      ) : null}

      <footer className="dash-footer-links">
        <Link href="/dashboard">← Back to demo console</Link>
      </footer>
    </main>
  );
}
