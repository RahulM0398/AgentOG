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

function formatConditions(raw: unknown): string {
  if (Array.isArray(raw) && raw.length) return raw.map(String).join(", ");
  if (typeof raw === "string") return raw;
  return "—";
}

function formatList(raw: unknown): string {
  if (Array.isArray(raw) && raw.length) return raw.map(String).join(", ");
  return "—";
}

function apiMessage(data: Record<string, unknown>, fallback: string): string {
  const m = data.message;
  return typeof m === "string" && m.trim() ? m.trim() : fallback;
}

export default function ApproveIntentPage() {
  const params = useParams();
  const intentId = params.intentId as string;
  const [intent, setIntent] = useState<IntentApi | null>(null);
  const [code, setCode] = useState("");
  const [banner, setBanner] = useState<{
    kind: "ok" | "bad" | "neutral";
    title: string;
    body: string;
  } | null>(null);
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
    setBanner(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setLoading(false);
      setBanner({
        kind: "bad",
        title: "Code missing",
        body: "Enter the verification code from your email or phone call.",
      });
      return;
    }

    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent_id: intentId, verification_code: trimmed }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    setLoading(false);

    if (!res.ok) {
      const err = typeof data.error === "string" ? data.error : "";
      const body =
        err === "otp_mismatch"
          ? apiMessage(data, "That code does not match.")
          : apiMessage(data, "Approval did not complete.");
      setBanner({
        kind: "bad",
        title: err === "otp_mismatch" ? "Wrong code" : "Cannot approve",
        body,
      });
      return;
    }

    try {
      localStorage.setItem(`agentog_token_${intentId}`, String(data.approval_token ?? ""));
    } catch {
      /* ignore */
    }

    window.location.href = "/dashboard?approved=1";
  }

  async function reject() {
    setLoading(true);
    setBanner(null);
    const res = await fetch("/api/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent_id: intentId }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    setLoading(false);

    if (!res.ok) {
      setBanner({
        kind: "bad",
        title: "Cannot reject",
        body: apiMessage(data, "Reject failed — try again."),
      });
      return;
    }

    window.location.href = "/dashboard?rejected=1";
  }

  if (!intent) {
    return (
      <main className="approve-shell">
        <p className="approve-muted">Loading approval…</p>
      </main>
    );
  }

  const r = intent.raw_input;
  const vendor = String(r.vendor ?? "—");
  const amount = r.amount != null ? String(r.amount) : "—";
  const currency = String(r.currency ?? "USD");
  const pickup = String(r.pickup ?? "").trim();
  const dropoff = String(r.dropoff ?? "").trim();
  const route =
    pickup && dropoff ? `${pickup} → ${dropoff}` : pickup || dropoff || "—";

  return (
    <main className="approve-shell">
      <div className="approve-push-card">
        <header className="approve-push-head">
          <p className="approve-push-kicker">Verification required</p>
          <h1 className="approve-push-title">Review this action</h1>
          <p className="approve-push-sub">
            Enter the one-time code, then approve only if this matches what you asked the agent to do.
          </p>
        </header>

        <section className="approve-push-body" aria-label="Action details">
          <div className="approve-row approve-row-highlight">
            <div>
              <p className="approve-label">Vendor / option</p>
              <p className="approve-value">{vendor}</p>
            </div>
            <div className="approve-amount-block">
              <p className="approve-label">Amount</p>
              <p className="approve-amount">
                ${amount} <span className="approve-ccy">{currency}</span>
              </p>
            </div>
          </div>

          <div className="approve-grid">
            <div>
              <p className="approve-label">Route / locations</p>
              <p className="approve-value-sm">{route}</p>
            </div>
            <div>
              <p className="approve-label">Schedule</p>
              <p className="approve-value-sm">{String(r.scheduled_time ?? "—")}</p>
            </div>
            <div className="approve-span-2">
              <p className="approve-label">Summary</p>
              <p className="approve-value-sm">{String(r.action_summary ?? "—")}</p>
            </div>
            <div>
              <p className="approve-label">Conditions</p>
              <p className="approve-value-sm">{formatConditions(r.required_conditions)}</p>
            </div>
            <div>
              <p className="approve-label">Risk</p>
              <p className="approve-value-sm">{intent.risk_level}</p>
            </div>
            <div>
              <p className="approve-label">Fields may share</p>
              <p className="approve-value-sm">{formatList(r.data_shared)}</p>
            </div>
            <div>
              <p className="approve-label">Never share</p>
              <p className="approve-value-sm">{formatList(r.data_blocked)}</p>
            </div>
          </div>

          {r.research_source_url ? (
            <p className="approve-source">
              <span className="approve-label">Research link · </span>
              <a href={String(r.research_source_url)} target="_blank" rel="noreferrer">
                Open source page
              </a>
            </p>
          ) : null}

          <p className="approve-hash-row">
            <span className="approve-label">Action fingerprint · </span>
            <code className="approve-hash">{intent.action_hash}</code>
          </p>
        </section>

        <section className="approve-otp-section" aria-label="Verification code">
          <label className="approve-otp-label" htmlFor="otp">
            Verification code
          </label>
          <input
            id="otp"
            className="approve-otp-input"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="• • • •"
            autoComplete="one-time-code"
            inputMode="numeric"
          />
          <p className="approve-otp-hint">From AgentMail or your AgentPhone approval call.</p>
        </section>

        {banner ? (
          <div className={`approve-banner approve-banner-${banner.kind}`} role="status">
            <strong>{banner.title}</strong>
            <p>{banner.body}</p>
          </div>
        ) : null}

        <div className="approve-actions">
          <button
            type="button"
            className="dash-btn dash-btn-primary approve-btn-full"
            onClick={() => void approve()}
            disabled={loading || intent.approval_status !== "pending"}
          >
            Approve action
          </button>
          <button
            type="button"
            className="dash-btn dash-btn-outline approve-btn-full"
            onClick={() => void reject()}
            disabled={loading || intent.approval_status !== "pending"}
          >
            Reject
          </button>
        </div>

        {intent.approval_status !== "pending" ? (
          <p className="approve-muted approve-footer-note">
            This intent is already <strong>{intent.approval_status}</strong>. Open the dashboard for the latest state.
          </p>
        ) : null}

        <footer className="approve-footer">
          <Link href="/dashboard">← Dashboard</Link>
        </footer>
      </div>
    </main>
  );
}
