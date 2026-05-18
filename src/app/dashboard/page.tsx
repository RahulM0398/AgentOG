"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_RIDE_TRANSCRIPT } from "@/lib/demo-default-transcript";
import type { DashboardSnapshot } from "@/lib/types";

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
    const id = setInterval(() => void refresh(), 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const milestones = useMemo(() => computeMilestones(snap), [snap]);

  async function resetDemo() {
    setBusy(true);
    setExecResult(null);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) {
        try {
          for (const k of Object.keys(localStorage)) {
            if (k.startsWith("agentog_token_")) localStorage.removeItem(k);
          }
        } catch {
          /* ignore */
        }
      }
    } finally {
      await refresh();
      setBusy(false);
    }
  }

  async function simulateVoice() {
    setBusy(true);
    setExecResult(null);
    const res = await fetch("/api/demo/simulate-transcript", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    await refresh();
    setBusy(false);
    if (!res.ok) {
      setExecResult({
        title: "Pipeline failed",
        body: data.message ?? data.error ?? JSON.stringify(data),
        variant: "bad",
      });
    }
  }

  async function runExecute(kind: "valid" | "tampered") {
    const intentId = snap?.intent?.id;
    if (!intentId || !snap?.intent?.raw_input) {
      setExecResult({
        title: "No intent yet",
        body: "Complete a phone call or run “Try sample utterance” after Browser Use + Gemini are configured.",
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
        title: "Approve first",
        body: "Open the approval link, enter the code from email/voice, tap Approve Exact Action.",
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
            vendor: "Tampered vendor substitution",
            amount: Math.round((base.amount + 127) * 100) / 100,
            scheduled_time: "forced immediate slot",
            research_source_url: "https://example.invalid/agent-not-allowed",
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
        title: "Gate: ALLOWED",
        body: data.reason ?? "Fingerprint matched — checkout may proceed.",
        variant: "ok",
      });
    } else {
      setExecResult({
        title: "Gate: BLOCKED",
        body: data.reason ?? "Payload diverged from approval.",
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
        body: "Approve the intent, run “Verify approved payload”, then open Stripe.",
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
    if (data.url) window.location.href = data.url;
    else
      setExecResult({
        title: "Checkout unavailable",
        body: JSON.stringify(data, null, 2),
        variant: "bad",
      });
  }

  const planner = snap?.planner_task as Record<string, unknown> | undefined;
  const browser = snap?.browser_use as Record<string, unknown> | undefined;
  const opts = browser?.options as Array<Record<string, unknown>> | undefined;

  return (
    <main className="demo-shell dash-wrap">
      <header className="demo-hero">
        <h1>AgentOG demo</h1>
        <p className="demo-lead">
          <strong>MFA proves who you are.</strong> AgentOG proves <strong>exactly which action</strong> was approved —
          fingerprint → human approval → short-lived token → execution gate → Stripe only after match.
        </p>
        <p className="demo-muted">
          Voice enters via signed AgentPhone webhooks. Gemini structures the ask. Browser Use searches the live web for real options.
          Moss + Supermemory constrain policy and memory. AgentMail + outbound AgentPhone notify the approver.
        </p>
      </header>

      <section className="demo-actions">
        <button type="button" className="dash-btn dash-btn-outline" disabled={busy} onClick={() => void resetDemo()}>
          Reset demo
        </button>
        <button type="button" className="dash-btn dash-btn-primary" disabled={busy} onClick={() => void simulateVoice()}>
          Try sample utterance
        </button>
        {snap?.intent?.approval_url ? (
          <Link href={snap.intent.approval_url} className="dash-btn dash-btn-outline" style={{ textDecoration: "none" }}>
            Open approval
          </Link>
        ) : (
          <span className="dash-btn dash-btn-outline" style={{ opacity: 0.4, cursor: "not-allowed" }}>
            Open approval
          </span>
        )}
        <button type="button" className="dash-btn dash-btn-outline" disabled={busy} onClick={() => void runExecute("valid")}>
          Verify approved payload
        </button>
        <button type="button" className="dash-btn dash-btn-danger" disabled={busy} onClick={() => void runExecute("tampered")}>
          Send tampered payload
        </button>
        <button type="button" className="dash-btn dash-btn-outline" disabled={busy} onClick={() => void checkout()}>
          Stripe (after gate allows)
        </button>
      </section>

      <p className="demo-hint">
        Sample line (override with AgentPhone):{" "}
        <span style={{ color: "var(--text)" }}>{DEFAULT_RIDE_TRANSCRIPT}</span>
      </p>

      {execResult ? (
        <div className={`demo-banner demo-banner-${execResult.variant}`} role="status">
          <strong>{execResult.title}</strong>
          <p>{execResult.body}</p>
        </div>
      ) : null}

      {snap?.pipeline_error ? (
        <div className="demo-banner demo-banner-bad" role="alert">
          <strong>Pipeline error</strong>
          <p>{snap.pipeline_error}</p>
        </div>
      ) : null}

      <section className="demo-milestones">
        <h2 className="demo-h2">Flow</h2>
        <ol className="demo-flow-list">
          {milestones.map((m) => (
            <li key={m.key} className={m.done ? "done" : ""}>
              <span className="demo-flow-dot">{m.done ? "✓" : "○"}</span>
              <span>{m.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="demo-panels">
        <Panel title="1 · Voice transcript">
          <pre className="demo-pre">{snap?.voice?.transcript ?? "—"}</pre>
          <p className="demo-mini">
            Caller: {snap?.voice?.caller ?? "—"} · Channel: {snap?.voice?.channel ?? "—"}
          </p>
        </Panel>

        <Panel title="2 · Structured task (Gemini / Gemma)">
          {planner ? (
            <pre className="demo-pre">{JSON.stringify(planner, null, 2)}</pre>
          ) : (
            <p className="demo-muted">Waiting for transcript processing.</p>
          )}
        </Panel>

        <Panel title="3 · Live web research (Browser Use)">
          {browser?.needs_configuration ? (
            <p className="demo-muted">
              Configure <code>BROWSER_USE_API_KEY</code>, set <code>MOCK_INTEGRATIONS=false</code>, and ensure your Browser Use model has any required LLM keys (e.g.{" "}
              <code>OPENAI_API_KEY</code>) so the agent can browse real results — no fabricated marketplace rows are injected.
            </p>
          ) : null}
          {browser?.search_query ? (
            <p className="demo-mini">
              Search entry: <code>{String(browser.search_query)}</code>
            </p>
          ) : null}
          {browser?.start_url ? (
            <p className="demo-mini">
              Started from: <code>{String(browser.start_url)}</code>
            </p>
          ) : null}
          {opts?.length ? (
            <ul className="demo-option-list">
              {opts.map((o, i) => (
                <li key={i}>
                  <strong>{String(o.vendor_or_site ?? o.title)}</strong> — {String(o.title)}{" "}
                  {o.price_usd != null ? `· ~$${String(o.price_usd)}` : ""}
                  {o.url ? (
                    <>
                      {" "}
                      ·{" "}
                      <a href={String(o.url)} target="_blank" rel="noreferrer">
                        link
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <pre className="demo-pre demo-pre-tall">{browser ? JSON.stringify(browser, null, 2) : "—"}</pre>
        </Panel>

        <Panel title="4 · Policy & memory (Moss + Supermemory)">
          <ul className="demo-bullet">
            {(snap?.moss_lines ?? []).length ? (
              snap!.moss_lines!.map((l) => <li key={l}>{l}</li>)
            ) : (
              <li className="demo-muted">No Moss lines yet.</li>
            )}
          </ul>
          <pre className="demo-pre">{snap?.supermemory_text ?? "—"}</pre>
        </Panel>

        <Panel title="5 · Fingerprint & approval">
          {snap?.intent?.id ? (
            <>
              <p>
                Intent <code>{snap.intent.id}</code> · Status <strong>{snap.intent.approval_status}</strong>
              </p>
              <p className="demo-mini">
                Code: <strong>{snap.intent.verification_code}</strong>
              </p>
              <p className="demo-mini hash">{snap.intent.action_hash}</p>
              <dl className="demo-dl">
                <dt>Vendor / option</dt>
                <dd>{snap.intent.vendor}</dd>
                <dt>Amount</dt>
                <dd>${snap.intent.amount}</dd>
                <dt>Summary</dt>
                <dd>{snap.intent.raw_input?.action_summary ?? "—"}</dd>
                <dt>Research URL</dt>
                <dd>
                  {snap.intent.raw_input?.research_source_url ? (
                    <a href={snap.intent.raw_input.research_source_url} target="_blank" rel="noreferrer">
                      {snap.intent.raw_input.research_source_url}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </dl>
            </>
          ) : (
            <p className="demo-muted">No intent until Browser Use returns a priced selection.</p>
          )}
        </Panel>

        <Panel title="6 · Notifications">
          <p>
            AgentMail: <strong>{snap?.approval_delivery?.agentmail ?? "—"}</strong>
          </p>
          <p>
            AgentPhone outbound: <strong>{snap?.approval_delivery?.agentphone ?? "—"}</strong>
          </p>
        </Panel>

        <Panel title="7 · Execution gate">
          <p>
            Approved payload test:{" "}
            {snap?.execution?.last_valid ? (
              <span className="dash-pill dash-pill-ok">{snap.execution.last_valid.result}</span>
            ) : (
              <span className="demo-muted">not run</span>
            )}
          </p>
          <p>
            Tampered payload test:{" "}
            {snap?.execution?.last_tampered ? (
              <>
                <span className="dash-pill dash-pill-bad">{snap.execution.last_tampered.result}</span>
                <span className="demo-mini block">{snap.execution.last_tampered.block_reason}</span>
              </>
            ) : (
              <span className="demo-muted">not run</span>
            )}
          </p>
        </Panel>

        <Panel title="8 · Audit trail">
          <ul className="demo-receipts">
            {(snap?.receipts ?? []).slice(-12).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {(snap?.receipts ?? []).length === 0 ? (
            <p className="demo-muted">Receipts appear after mail/calls/gate events.</p>
          ) : null}
        </Panel>
      </div>

      <footer className="dash-footer-links">
        <Link href="/">Home</Link>
        {" · "}
        <a href="/api/health" target="_blank" rel="noreferrer">
          Integration health
        </a>
        {" · "}
        <Link href="/rides">Legacy fixture page</Link>
      </footer>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="demo-panel">
      <h2 className="demo-panel-title">{title}</h2>
      {children}
    </section>
  );
}

function computeMilestones(s: DashboardSnapshot | null) {
  const browser = s?.browser_use as { needs_configuration?: boolean; options?: unknown[] } | undefined;
  const browserOk =
    !!browser &&
    !browser.needs_configuration &&
    Array.isArray(browser.options) &&
    browser.options.length > 0;
  return [
    { key: "v", label: "Signed voice webhook + transcript", done: !!s?.voice?.transcript },
    { key: "p", label: "Gemini/Gemma structured task", done: !!s?.planner_task },
    { key: "b", label: "Browser Use live web options", done: browserOk },
    { key: "f", label: "Action fingerprint + intent", done: !!s?.intent?.id },
    { key: "n", label: "AgentMail + guardian call/SMS", done: !!s?.approval_delivery },
    { key: "a", label: "Human approval + token", done: s?.intent?.approval_status === "approved" },
    { key: "g", label: "Execution gate + Stripe path", done: !!s?.execution?.last_valid },
  ];
}
