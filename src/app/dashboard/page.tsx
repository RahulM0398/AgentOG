"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_RIDE_TRANSCRIPT } from "@/lib/demo-default-transcript";
import { MOCK_RIDE_OPTIONS } from "@/lib/demo-ride-options";
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

function outcomeBadge(outcome: string) {
  switch (outcome) {
    case "selected":
      return <span className="dash-pill dash-pill-ok">Selected</span>;
    case "valid_alternative":
      return <span className="dash-pill dash-pill-warn">Valid alt</span>;
    default:
      return <span className="dash-pill dash-pill-bad">Rejected</span>;
  }
}

function mailStatusLabel(
  s: NonNullable<DashboardSnapshot["approval_delivery"]>["agentmail"],
) {
  switch (s) {
    case "sent":
      return "Approval card sent";
    case "send_failed":
      return "Send failed (check AgentMail env)";
    default:
      return "Skipped — set GUARDIAN_EMAIL or AGENT_OG_APPROVER_EMAIL";
  }
}

function phoneStatusLabel(
  s: NonNullable<DashboardSnapshot["approval_delivery"]>["agentphone"],
) {
  switch (s) {
    case "outbound_initiated":
      return "Guardian outbound call initiated";
    case "failed":
      return "Call failed (check AgentPhone env)";
    default:
      return "Skipped — set GUARDIAN_PHONE or AGENT_OG_APPROVER_PHONE";
  }
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
        body: "Run the voice pipeline (or connect AgentPhone) so AgentOG creates an intent and fingerprint first.",
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
        body: "Open the approval page, enter the verification code from AgentMail or voice, tap Approve Exact Action — the demo stores the token in this browser.",
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
            scheduled_time: "5:15 PM",
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
          "Final payload matched the approved fingerprint. Stripe or simulated checkout may run next.",
        variant: "ok",
      });
    } else {
      setExecResult({
        title: "Execution gate: BLOCKED",
        body:
          data.reason ??
          "The agent tried to change the approved action; booking and payment stay blocked.",
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
        title: "Approve first",
        body: "Complete human approval, then run Execute Approved Action successfully before opening Stripe.",
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
  const ad = snap?.approval_delivery;

  return (
    <main className="dash-wrap">
      <header className="dash-hero">
        <p className="dash-product-label">Demo console</p>
        <h1>AgentOG</h1>
        <p className="dash-tagline">
          Normal MFA verifies the user. AgentOG verifies the exact AI agent action they approved.
        </p>
        <p className="dash-hero-lead">
          General-purpose human approval and execution control: <strong style={{ color: "var(--text)" }}>fingerprint</strong> →{" "}
          <strong style={{ color: "var(--text)" }}>approval</strong> → <strong style={{ color: "var(--text)" }}>short-lived token</strong>{" "}
          → <strong style={{ color: "var(--text)" }}>execution gate</strong> → audit. The ride request below is one demo; the same pipeline covers
          purchases, forms, bookings, refunds, procurement, and caregiving workflows — anything high-impact.
        </p>
      </header>

      <section className="dash-playbook" aria-labelledby="playbook-heading">
        <h2 id="playbook-heading">Judge playbook — exact demo sequence</h2>
        <ol className="dash-playbook-list">
          <li>
            Call your <strong>AgentPhone</strong> number (or press <em>Simulate AgentPhone transcript</em>).
          </li>
          <li>Say the ride line (default transcript shown in panel 1) — or any search-style request the planner can structure.</li>
          <li>This dashboard shows the <strong>transcript</strong>.</li>
          <li>
            <strong>Gemini / Gemma</strong> parses the task; <strong>Gemma</strong> classifies high-impact action.
          </li>
          <li>
            <strong>Moss</strong> retrieves live policy rules; <strong>Supermemory</strong> retrieves preferences.
          </li>
          <li>
            <strong>Browser Use</strong> researches <Link href="/rides">/rides</Link> and selects <strong>MockRide Assist at $42</strong>.
          </li>
          <li>
            <strong>AgentOG</strong> creates the action intent and <strong>SHA-256 fingerprint</strong>.
          </li>
          <li>
            <strong>AgentMail</strong> sends the approval card; <strong>AgentPhone</strong> may call/SMS the guardian (when env is configured).
          </li>
          <li>
            Human opens the approval link and taps <strong>Approve Exact Action</strong> — AgentOG issues a <strong>short-lived token</strong>.
          </li>
          <li>
            Press <strong>Execute Approved Action</strong> — execution gate <strong>allows</strong> it.
          </li>
          <li>
            <strong>Stripe sandbox</strong> or simulated checkout (after gate allows).
          </li>
          <li>
            <strong>AgentMail</strong> sends an audit receipt (when guardian email is set).
          </li>
          <li>
            Press <strong>Execute Tampered Action</strong> — gate blocks with the scripted diff (amount, vendor, wheelchair,{" "}
            <code>medical_condition</code>).
          </li>
        </ol>
      </section>

      <p className="dash-section-title">Operator controls</p>
      <div className="dash-controls dash-controls-grid">
        <div className="dash-control-block">
          <button type="button" className="dash-btn dash-btn-primary" disabled={busy} onClick={() => void simulateVoice()}>
            Simulate AgentPhone transcript
          </button>
          <p className="dash-control-help">
            Runs the full pipeline: planner → classifier → Moss → Supermemory → Browser Use → intent → AgentMail / AgentPhone (if env vars are set).
          </p>
        </div>
        <div className="dash-control-block">
          {snap?.intent?.approval_url ? (
            <Link href={snap.intent.approval_url} className="dash-link-btn dash-link-btn-block">
              Human approval page →
            </Link>
          ) : (
            <span className="dash-link-btn dash-link-btn-block" style={{ opacity: 0.45, pointerEvents: "none" }}>
              Human approval (needs intent)
            </span>
          )}
          <p className="dash-control-help">
            Guardian confirms vendor, price, route, conditions, shared vs blocked fields. Enter verification code from AgentMail or voice callback.
          </p>
        </div>
        <div className="dash-control-block dash-control-actions">
          <div className="dash-btn-row">
            <button type="button" className="dash-btn dash-btn-outline" disabled={busy} onClick={() => void runExecute("valid")}>
              Execute Approved Action
            </button>
            <button type="button" className="dash-btn dash-btn-danger" disabled={busy} onClick={() => void runExecute("tampered")}>
              Execute Tampered Action
            </button>
            <button type="button" className="dash-btn dash-btn-outline" disabled={busy} onClick={() => void checkout()}>
              Stripe sandbox (after gate allows)
            </button>
          </div>
          <p className="dash-control-help">
            Tampered path swaps to PremiumAssist / $67 / removes wheelchair / adds <code>medical_condition</code> — expect one blocked sentence plus technical detail in audit mail.
          </p>
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

      <p className="dash-section-title">Pipeline checkpoints</p>
      <div className="dash-steps">
        {steps.map((s) => (
          <div key={s.key} className={`dash-step ${s.done ? "done" : s.pending ? "pending" : ""}`}>
            {s.label}
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <DashCard
          step="1"
          title="Voice intake — AgentPhone"
          why="Source utterance from call or demo button. Everything downstream is derived from this transcript."
        >
          <p className="dash-micro-label">Default transcript (ride demo)</p>
          <blockquote className="dash-blockquote">{DEFAULT_RIDE_TRANSCRIPT}</blockquote>
          <dl className="dash-dl">
            <div>
              <dt>Channel</dt>
              <dd>{snap?.voice?.channel ? str(snap.voice.channel) : "—"}</dd>
            </div>
            <div>
              <dt>Caller</dt>
              <dd>{snap?.voice?.caller ? <code>{snap.voice.caller}</code> : "—"}</dd>
            </div>
          </dl>
          <p className="dash-micro-label">Live transcript</p>
          <blockquote className="dash-blockquote dash-blockquote-muted">
            {snap?.voice?.transcript ?? "Waiting for AgentPhone webhook or Simulate AgentPhone transcript."}
          </blockquote>
          <TechJson label="Voice metadata (debug)" value={snap?.voice} />
        </DashCard>

        <DashCard
          step="2"
          title="Task planner — Gemini / Gemma 4"
          why="Structured task JSON: locations, budget, time window, accessibility constraints."
        >
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
                <dt>Budget cap</dt>
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
            <p className="dash-muted-p">No planner output yet.</p>
          )}
          <TechJson label="Planner JSON (debug)" value={planner} />
        </DashCard>

        <DashCard
          step="3"
          title="Policy classifier — Gemma"
          why="High-impact actions require AgentOG approval — not every conversational turn."
        >
          {classifier ? (
            <>
              <div className="dash-pill-row">
                {boolPill(classifier.high_impact_action, "High-impact", "Not high-impact")}
                {boolPill(classifier.approval_required, "Approval required", "No approval")}
                <span className="dash-pill dash-pill-warn">risk {str(classifier.risk_level || "?")}</span>
              </div>
              <p className="dash-classifier-reason">{str(classifier.reason)}</p>
              {Array.isArray(classifier.sensitive_fields) ? (
                <p className="dash-muted-p tight-top">
                  Sensitive fields: {(classifier.sensitive_fields as string[]).join(", ")}
                </p>
              ) : null}
            </>
          ) : (
            <p className="dash-muted-p">No classifier output yet.</p>
          )}
          <TechJson label="Classifier JSON (debug)" value={classifier} />
        </DashCard>

        <DashCard step="4" title="Moss — live policy rules" why="Fast retrieval layer for policy snippets during the live interaction.">
          <ul className="dash-list">
            {(snap?.moss_lines ?? []).length ? (
              snap!.moss_lines!.map((l) => <li key={l}>{l}</li>)
            ) : (
              <li className="dash-list-muted">Populates when the pipeline runs (requires Moss HTTP credentials unless mocked).</li>
            )}
          </ul>
        </DashCard>

        <DashCard step="5" title="Supermemory — durable preferences" why="Long-lived profile and guardian routing — complements Moss at decision time.">
          <pre className="dash-pre-inline">{snap?.supermemory_text ?? "—"}</pre>
        </DashCard>

        <DashCard
          step="6"
          title="Browser Use — mock marketplace"
          why="Navigates /rides, compares rows, picks the cheapest valid option under budget with wheelchair after 5 PM."
        >
          <div className="dash-table-wrap">
            <table className="dash-browser-table">
              <thead>
                <tr>
                  <th>Outcome</th>
                  <th>Vendor</th>
                  <th>$</th>
                  <th>WC</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_RIDE_OPTIONS.map((o) => (
                  <tr key={o.vendor}>
                    <td>{outcomeBadge(o.outcome)}</td>
                    <td>
                      <strong>{o.vendor}</strong>
                    </td>
                    <td>{o.price}</td>
                    <td>{o.wheelchair ? "Y" : "N"}</td>
                    <td>{o.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {browser ? (
            <dl className="dash-dl dash-dl-tight-top">
              <div>
                <dt>Selection</dt>
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
            <p className="dash-muted-p">Awaiting Browser Use result.</p>
          )}
          <TechJson label="Browser Use JSON (debug)" value={browser} />
        </DashCard>

        <DashCard
          step="7"
          title="AgentOG — intent + fingerprint"
          why="Cryptographic binding for approval UI and execution gate — change anything material and the hash breaks."
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
              <dt>Intent ID</dt>
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

        <DashCard
          step="8"
          title="Approval delivery — AgentMail + AgentPhone"
          why="Separate channels for the approval moment — email card plus optional voice/SMS ping to guardian."
        >
          <dl className="dash-dl">
            <div>
              <dt>AgentMail</dt>
              <dd>{ad ? mailStatusLabel(ad.agentmail) : "Run pipeline to see status"}</dd>
            </div>
            <div>
              <dt>AgentPhone</dt>
              <dd>{ad ? phoneStatusLabel(ad.agentphone) : "Run pipeline to see status"}</dd>
            </div>
          </dl>
          <p className="dash-muted-p tight-top">
            Configure <code>GUARDIAN_EMAIL</code>, <code>AGENT_OG_APPROVER_EMAIL</code>, <code>GUARDIAN_PHONE</code>, and AgentPhone /
            AgentMail API keys in <code>.env.local</code>. Skipped steps still show here so judges see the architecture.
          </p>
        </DashCard>

        <DashCard
          step="9"
          title="Human approval + token"
          why="The verification code feels like MFA — but the issued token is scoped to this fingerprint only."
        >
          <dl className="dash-dl">
            <div>
              <dt>Code (demo)</dt>
              <dd>
                <code style={{ fontSize: "1.1rem", fontWeight: 700 }}>{snap?.intent?.verification_code ?? "—"}</code>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{snap?.intent?.approval_status ?? "—"}</dd>
            </div>
          </dl>
          <p className="dash-muted-p tight-top">
            After approval in this browser, the demo saves the short-lived token under{" "}
            {snap?.intent?.id ? (
              <code>{`localStorage["agentog_token_${snap.intent.id}"]`}</code>
            ) : (
              <code>localStorage[&quot;agentog_token_&lt;intent_id&gt;&quot;]</code>
            )}{" "}
            for Execute Approved Action.
          </p>
        </DashCard>

        <DashCard step="10" title="Execution gate" why="Final agent payload must match the approved hash or execution stays blocked.">
          <dl className="dash-dl">
            <div>
              <dt>Execute Approved Action</dt>
              <dd>
                {snap?.execution?.last_valid ? (
                  <span className="dash-pill dash-pill-ok">{snap.execution.last_valid.result}</span>
                ) : (
                  <span className="dash-muted">Not run</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Execute Tampered Action</dt>
              <dd>
                {snap?.execution?.last_tampered ? (
                  <>
                    <span className="dash-pill dash-pill-bad">{snap.execution.last_tampered.result}</span>
                    <span className="dash-block-detail">{snap.execution.last_tampered.block_reason}</span>
                  </>
                ) : (
                  <span className="dash-muted">Not run</span>
                )}
              </dd>
            </div>
          </dl>
        </DashCard>

        <DashCard
          step="11"
          title="Checkout + audit trail"
          why="Stripe only after the gate allows an unchanged payload; AgentMail emits receipts for allow/block."
        >
          <ul className="dash-list dash-list-plain">
            {(snap?.receipts ?? []).length ? (
              snap!.receipts!.slice(-12).map((r) => (
                <li key={r} className="dash-receipt-line">
                  {r}
                </li>
              ))
            ) : (
              <li className="dash-list-muted">Receipt lines appear when AgentMail sends approval or audit mail, or pipeline logs milestones.</li>
            )}
          </ul>
        </DashCard>
      </div>

      <footer className="dash-footer-links">
        <Link href="/">Product home</Link>
        {" · "}
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
    { key: "c", label: "3 Classifier", ...pending(!!s?.classifier) },
    { key: "m", label: "4 Moss", ...pending(!!s?.moss_lines?.length) },
    { key: "sm", label: "5 Memory", ...pending(!!s?.supermemory_text) },
    { key: "b", label: "6 Browser", ...pending(!!s?.browser_use) },
    { key: "i", label: "7 Hash", ...pending(!!s?.intent?.id) },
    { key: "n", label: "8 Notify", ...pending(!!s?.approval_delivery) },
    { key: "a", label: "9 Approved", ...pending(s?.intent?.approval_status === "approved") },
    {
      key: "e",
      label: "10 Gate",
      ...pending(!!(s?.execution?.last_valid || s?.execution?.last_tampered)),
    },
  ];
}
