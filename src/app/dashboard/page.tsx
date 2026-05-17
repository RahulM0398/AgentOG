"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DashboardSnapshot } from "@/lib/types";

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function TechJson({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null) return null;
  return (
    <details className="dash-tech">
      <summary>{label}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

export default function DashboardPage() {
  const [snap, setSnap] = useState<DashboardSnapshot | null>(null);
  const [execResult, setExecResult] = useState<{
    title: string;
    body: string;
    variant: "ok" | "bad" | "neutral";
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/dashboard-state");
    if (!res.ok) return;
    setSnap((await res.json()) as DashboardSnapshot);
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 2500);
    return () => clearInterval(id);
  }, [refresh]);

  const steps = useMemo(() => computeSteps(snap), [snap]);

  async function simulateVoice() {
    setBusy(true);
    setExecResult(null);
    await fetch("/api/demo/simulate-transcript", { method: "POST" });
    await refresh();
    setBusy(false);
  }

  async function runExecute(kind: "valid" | "tampered") {
    const intentId = snap?.intent?.id;
    if (!intentId || !snap?.intent?.raw_input) {
      setExecResult({
        title: "Nothing to execute yet",
        body: "Run the demo (voice pipeline) or call AgentPhone first so AgentOG creates an action intent and fingerprint.",
        variant: "neutral",
      });
      return;
    }
    let token: string | null = null;
    try {
      token = localStorage.getItem(`agentog_token_${intentId}`);
    } catch {
      token = null;
    }
    if (!token) {
      setExecResult({
        title: "Approval token missing",
        body: "Open the human approval page, enter the verification code from email/voice, and approve. The token is stored in this browser for the demo.",
        variant: "neutral",
      });
      return;
    }

    const base = snap.intent.raw_input;
    const final_payload =
      kind === "valid"
        ? base
        : {
            ...base,
            vendor: "PremiumAssist",
            amount: 67,
            required_conditions: [] as string[],
            data_shared: [...base.data_shared, "medical_condition"],
          };

    setBusy(true);
    const res = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent_id: intentId,
        approval_token: token,
        final_payload,
      }),
    });
    const data = (await res.json()) as { status?: string; reason?: string };
    setBusy(false);

    if (data.status === "allowed") {
      setExecResult({
        title: "Execution gate: ALLOWED",
        body:
          data.reason ??
          "Final payload matched the approved fingerprint. Checkout or booking runs only after this.",
        variant: "ok",
      });
    } else {
      setExecResult({
        title: "Execution gate: BLOCKED",
        body:
          data.reason ??
          "The agent tried to change the approved action; payment and booking stay off.",
        variant: "bad",
      });
    }
    void refresh();
  }

  async function checkout() {
    const intentId = snap?.intent?.id;
    if (!intentId) return;
    let token: string | null = null;
    try {
      token = localStorage.getItem(`agentog_token_${intentId}`);
    } catch {
      token = null;
    }
    if (!token) {
      setExecResult({
        title: "Need approval first",
        body: "Approve the intent, run an honest execution test successfully, then open Stripe.",
        variant: "neutral",
      });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent_id: intentId, approval_token: token }),
    });
    const data = (await res.json()) as { url?: string };
    setBusy(false);
    if (data.url) {
      window.location.href = data.url;
    } else {
      setExecResult({
        title: "Checkout could not start",
        body: JSON.stringify(data, null, 2),
        variant: "bad",
      });
    }
  }

  const planner = snap?.planner_task as Record<string, unknown> | undefined;
  const classifier = snap?.classifier as Record<string, unknown> | undefined;
  const browser = snap?.browser_use as Record<string, unknown> | undefined;

  return (
    <main className="dash-wrap">
      <header className="dash-hero">
        <h1>AgentOG</h1>
        <p className="dash-tagline">
          Human approval tied to the exact agent action — not generic “you’re logged in.”
        </p>
        <p className="dash-hero-lead">
          This page is the judge and demo console. The ride story is an example; the product is the pipeline:{" "}
          <strong style={{ color: "var(--text)" }}>
            fingerprint → human approval → short-lived token → execution gate → audit
          </strong>
          . Payment is deliberately last — Stripe only after the gate allows an unchanged payload.
        </p>
        <div className="dash-hero-flow">
          <strong>Read top to bottom:</strong> what the caller said → structured task → risk decision → rules and
          memory → browser choice → cryptographic fingerprint → approval state → allowed vs blocked execution → receipts.
        </div>
      </header>

      <p className="dash-section-title">What each control does</p>
      <div className="dash-controls">
        <div className="dash-control-row">
          <button type="button" className="dash-btn dash-btn-primary" disabled={busy} onClick={() => void simulateVoice()}>
            Run voice pipeline (demo)
          </button>
          <span style={{ alignSelf: "center", fontSize: "0.82rem", color: "var(--muted)", maxWidth: 440 }}>
            Runs planner, classifier, Moss, Supermemory, Browser Use, then creates an intent (and sends mail/call if env is set).
          </span>
        </div>
        <div className="dash-control-row">
          {snap?.intent?.approval_url ? (
            <Link href={snap.intent.approval_url} className="dash-link-btn">
              Human approval page
            </Link>
          ) : (
            <span className="dash-link-btn" style={{ opacity: 0.45, pointerEvents: "none" }}>
              Human approval (needs intent)
            </span>
          )}
          <span style={{ alignSelf: "center", fontSize: "0.82rem", color: "var(--muted)", maxWidth: 440 }}>
            Guardian confirms the exact vendor, price, route, and conditions. Uses the verification code from AgentMail or voice.
          </span>
        </div>
        <div className="dash-control-row">
          <button type="button" className="dash-btn dash-btn-outline" disabled={busy} onClick={() => void runExecute("valid")}>
            Gate: honest payload
          </button>
          <button type="button" className="dash-btn dash-btn-danger" disabled={busy} onClick={() => void runExecute("tampered")}>
            Gate: tampered payload
          </button>
          <button type="button" className="dash-btn dash-btn-outline" disabled={busy} onClick={() => void checkout()}>
            Stripe (after allowed gate)
          </button>
        </div>
      </div>

      {execResult ? (
        <div
          className="dash-alert"
          style={{
            borderColor:
              execResult.variant === "ok"
                ? "rgba(52, 211, 153, 0.35)"
                : execResult.variant === "bad"
                  ? "rgba(248, 113, 113, 0.35)"
                  : undefined,
          }}
        >
          <strong>{execResult.title}</strong>
          <p style={{ margin: "0.5rem 0 0", whiteSpace: "pre-wrap", color: "var(--muted)" }}>{execResult.body}</p>
        </div>
      ) : null}

      <p className="dash-section-title">Pipeline progress</p>
      <div className="dash-steps">
        {steps.map((s) => (
          <div key={s.key} className={`dash-step ${s.done ? "done" : s.pending ? "pending" : ""}`}>
            {s.label}
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <DashCard step="1" title="Voice intake" why="What the human actually asked — the source text for everything downstream.">
          <dl className="dash-dl">
            <div>
              <dt>Caller</dt>
              <dd>{snap?.voice?.caller ? <code>{snap.voice.caller}</code> : "—"}</dd>
            </div>
          </dl>
          <blockquote className="dash-blockquote" style={{ marginTop: "0.75rem" }}>
            {snap?.voice?.transcript ??
              "Waiting for AgentPhone or run **Run voice pipeline** to populate this."}
          </blockquote>
          <TechJson label="Raw voice metadata (debug)" value={snap?.voice} />
        </DashCard>

        <DashCard step="2" title="Structured task" why="Planner output: what the agent understood (locations, budget, constraints).">
          {planner ? (
            <dl className="dash-dl">
              <div>
                <dt>Action</dt>
                <dd>{str(planner.action_type ?? planner.task_type)}</dd>
              </div>
              <div>
                <dt>Route</dt>
                <dd>
                  {str(planner.pickup)} → {str(planner.dropoff)}
                </dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>${str(planner.max_amount ?? planner.budget)}</dd>
              </div>
              <div>
                <dt>Constraints</dt>
                <dd>
                  {Array.isArray(planner.required_conditions)
                    ? (planner.required_conditions as string[]).join(", ")
                    : str(planner.time_constraint)}
                </dd>
              </div>
            </dl>
          ) : (
            <p style={{ color: "var(--muted)", margin: 0 }}>No planner output yet.</p>
          )}
          <TechJson label="Full planner JSON (debug)" value={planner} />
        </DashCard>

        <DashCard step="3" title="Risk decision" why="Only high-impact actions trigger AgentOG approval — not every chat turn.">
          {classifier ? (
            <>
              <div style={{ marginBottom: "0.65rem" }}>
                {boolPill(classifier.high_impact_action, "High-impact", "Not high-impact")}
                {"  "}
                {boolPill(classifier.approval_required, "Approval required", "No approval")}
                {"  "}
                <span className="dash-pill dash-pill-warn">risk {str(classifier.risk_level || "?")}</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text)" }}>{str(classifier.reason)}</p>
              {Array.isArray(classifier.sensitive_fields) ? (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                  Fields flagged: {(classifier.sensitive_fields as string[]).join(", ")}
                </p>
              ) : null}
            </>
          ) : (
            <p style={{ color: "var(--muted)", margin: 0 }}>No classifier output yet.</p>
          )}
          <TechJson label="Full classifier JSON (debug)" value={classifier} />
        </DashCard>

        <DashCard
          step="4"
          title="Rules and memory"
          why="Moss surfaces policy snippets for this request; Supermemory holds longer-lived preferences. Together they bound the agent."
        >
          <p style={{ margin: "0 0 0.35rem", fontSize: "0.78rem", fontWeight: 700, color: "var(--muted2)" }}>Moss</p>
          <ul className="dash-list">
            {(snap?.moss_lines ?? []).length ? (
              snap!.moss_lines!.map((l) => <li key={l}>{l}</li>)
            ) : (
              <li style={{ color: "var(--muted)" }}>Shows here after the pipeline runs.</li>
            )}
          </ul>
          <p style={{ margin: "0.85rem 0 0.35rem", fontSize: "0.78rem", fontWeight: 700, color: "var(--muted2)" }}>
            Supermemory
          </p>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: "0.82rem", color: "var(--text)" }}>
            {snap?.supermemory_text ?? "—"}
          </pre>
        </DashCard>

        <DashCard step="5" title="Browser research" why="Reads the controlled /rides page and selects a vendor that satisfies budget, time, and wheelchair rules.">
          {browser ? (
            <dl className="dash-dl">
              <div>
                <dt>Pick</dt>
                <dd>
                  <strong>{str(browser.selected_vendor)}</strong> at ${Number(browser.amount)}
                </dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{str(browser.scheduled_time ?? browser.available_time)}</dd>
              </div>
              <div>
                <dt>Wheelchair</dt>
                <dd>{browser.wheelchair_assistance === true ? "Yes" : browser.wheelchair_assistance === false ? "No" : "—"}</dd>
              </div>
              <div>
                <dt>Rationale</dt>
                <dd>{str(browser.reason)}</dd>
              </div>
            </dl>
          ) : (
            <p style={{ color: "var(--muted)", margin: 0 }}>No browser result yet.</p>
          )}
          <TechJson label="Full browser JSON (debug)" value={browser} />
        </DashCard>

        <DashCard
          step="6"
          title="Fingerprint and intent"
          why="The approval UI and token bind to this hash. Change vendor, price, or fields → hash changes → gate blocks."
          badge={
            snap?.intent?.approval_status === "approved" ? (
              <span className="dash-pill dash-pill-ok">Approved</span>
            ) : snap?.intent?.approval_status === "pending" ? (
              <span className="dash-pill dash-pill-warn">Pending</span>
            ) : snap?.intent?.approval_status ? (
              <span className="dash-pill dash-pill-bad">{snap.intent.approval_status}</span>
            ) : null
          }
        >
          <dl className="dash-dl">
            <div>
              <dt>Intent</dt>
              <dd>
                <code>{snap?.intent?.id ?? "—"}</code>
              </dd>
            </div>
            <div>
              <dt>Summary</dt>
              <dd>
                {snap?.intent?.vendor ?? "—"} · ${snap?.intent?.amount ?? "—"}
              </dd>
            </div>
            <div>
              <dt>SHA-256</dt>
              <dd className="dash-hash">{snap?.intent?.action_hash ?? "—"}</dd>
            </div>
          </dl>
        </DashCard>

        <DashCard step="7" title="Execution gate" why="Final agent payload must match the approved fingerprint or execution stays blocked.">
          <dl className="dash-dl">
            <div>
              <dt>Honest test</dt>
              <dd>
                {snap?.execution?.last_valid ? (
                  <span className="dash-pill dash-pill-ok">{snap.execution.last_valid.result}</span>
                ) : (
                  <span style={{ color: "var(--muted)" }}>Not run</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Tampered test</dt>
              <dd>
                {snap?.execution?.last_tampered ? (
                  <>
                    <span className="dash-pill dash-pill-bad">{snap.execution.last_tampered.result}</span>
                    <span style={{ display: "block", marginTop: 6, fontSize: "0.82rem", color: "var(--muted)" }}>
                      {snap.execution.last_tampered.block_reason}
                    </span>
                  </>
                ) : (
                  <span style={{ color: "var(--muted)" }}>Not run</span>
                )}
              </dd>
            </div>
          </dl>
        </DashCard>

        <DashCard step="8" title="Audit and receipts" why="Proof for judges: emails sent, calls attempted, gate outcomes.">
          <ul className="dash-list" style={{ listStyle: "none", paddingLeft: 0 }}>
            {(snap?.receipts ?? []).length ? (
              snap!.receipts!.slice(-10).map((r) => (
                <li key={r} style={{ borderBottom: "1px solid var(--border)", padding: "0.35rem 0" }}>
                  {r}
                </li>
              ))
            ) : (
              <li style={{ color: "var(--muted)" }}>Lines appear as the system sends mail or logs milestones.</li>
            )}
          </ul>
        </DashCard>
      </div>

      <footer className="dash-footer-links">
        <Link href="/rides">Mock marketplace (/rides)</Link>
        {" · "}
        <a href="/api/health" target="_blank" rel="noreferrer">
          API health
        </a>
      </footer>
    </main>
  );
}

function DashCard({
  step,
  title,
  why,
  badge,
  children,
}: {
  step: string;
  title: string;
  why: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <div>
          <div className="dash-card-step">Step {step}</div>
          <h2>{title}</h2>
        </div>
        {badge}
      </div>
      <p className="dash-card-why">{why}</p>
      {children}
    </section>
  );
}

function boolPill(val: unknown, yes: string, no: string) {
  if (val === true) return <span className="dash-pill dash-pill-ok">{yes}</span>;
  if (val === false) return <span className="dash-pill dash-pill-warn">{no}</span>;
  return <span className="dash-pill dash-pill-warn">unknown</span>;
}

function computeSteps(s: DashboardSnapshot | null) {
  const pending = (done: boolean) => ({ done, pending: !done });
  return [
    { key: "v", label: "1 Voice", ...pending(!!s?.voice?.transcript) },
    { key: "p", label: "2 Planner", ...pending(!!s?.planner_task) },
    { key: "c", label: "3 Risk", ...pending(!!s?.classifier) },
    { key: "m", label: "4 Rules", ...pending(!!(s?.moss_lines?.length || s?.supermemory_text)) },
    { key: "b", label: "5 Browser", ...pending(!!s?.browser_use) },
    { key: "i", label: "6 Intent", ...pending(!!s?.intent?.id) },
    { key: "a", label: "7 Approved", ...pending(s?.intent?.approval_status === "approved") },
    {
      key: "e",
      label: "8 Gate",
      ...pending(!!(s?.execution?.last_valid || s?.execution?.last_tampered)),
    },
  ];
}
