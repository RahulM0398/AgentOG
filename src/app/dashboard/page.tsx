"use client";

import Link from "next/link";
import { receiptLineForDisplay } from "@/lib/receipt-display";
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.has("approved") || q.has("rejected")) {
      void refresh();
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [refresh]);

  async function resetDemo() {
    setBusy(true);
    setExecResult(null);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const hint =
          data.error === "disabled"
            ? "Demo endpoints are off in this environment. For production, set ALLOW_DEMO_ENDPOINTS=true, or run the app locally."
            : `Request failed (${res.status}).`;
        setExecResult({
          title: "Could not reset",
          body: hint,
          variant: "bad",
        });
        return;
      }
      try {
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith("agentog_token_")) localStorage.removeItem(k);
        }
      } catch {
        /* ignore */
      }
      setExecResult({
        title: "Demo reset",
        body: "Server state and saved approval tokens in this browser were cleared.",
        variant: "ok",
      });
    } finally {
      await refresh();
      setBusy(false);
    }
  }

  async function simulateVoice() {
    setBusy(true);
    setExecResult(null);
    const res = await fetch("/api/demo/simulate-transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    await refresh();
    setBusy(false);
    if (!res.ok) {
      setExecResult({
        title: "Try sample utterance failed",
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
        body: "Run “Try sample utterance” (needs Gemini). Web research can use live Browser Use or a demo fallback.",
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
        body: "Open Approval page, enter the OTP, then approve.",
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
        body: "Approve the intent, run Gate · match, then Pay (Stripe).",
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
    const data = (await res.json()) as { url?: string; message?: string; error?: string };
    setBusy(false);
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setExecResult({
      title: "Checkout blocked",
      body:
        data.message ??
        (data.error === "execute_gate_required"
          ? 'Run “Gate · match” successfully before paying.'
          : data.error === "invalid_token"
            ? "Approval token missing or expired — approve again on this browser."
            : data.error === "not_approved"
              ? "Approve the intent first."
              : "Stripe did not return a link — check STRIPE_SECRET_KEY and simulated mode."),
      variant: "bad",
    });
  }

  const planner = snap?.planner_task as Record<string, unknown> | undefined;
  const browser = snap?.browser_use as Record<string, unknown> | undefined;
  const opts = browser?.options as Array<Record<string, unknown>> | undefined;

  const plannerBrief = useMemo(() => {
    if (!planner) return null;
    return {
      action_type: String(planner.action_type ?? "—"),
      domain: String(planner.domain ?? "—"),
      goal: String(planner.user_goal_summary ?? planner.web_search_query ?? "").trim().slice(0, 320),
    };
  }, [planner]);

  return (
    <main className="demo-shell demo-shell-wide dash-wrap">
      <header className="demo-hero">
        <h1>AgentOG demo</h1>
        <p className="demo-lead">
          Fingerprint → approval card → short-lived token → execution gate → optional payment.
        </p>
      </header>

      <section className="demo-actions demo-actions-toolbar demo-actions-compact">
        <button type="button" className="dash-btn dash-btn-outline demo-action-btn" disabled={busy} onClick={() => void resetDemo()}>
          Clear demo
        </button>
        <button type="button" className="dash-btn dash-btn-primary demo-action-btn" disabled={busy} onClick={() => void simulateVoice()}>
          Sample request
        </button>
        {snap?.intent?.approval_url ? (
          <Link
            href={snap.intent.approval_url}
            className="dash-btn dash-btn-outline demo-action-btn"
            style={{ textDecoration: "none" }}
          >
            Approval page
          </Link>
        ) : (
          <span className="dash-btn dash-btn-outline demo-action-btn" style={{ opacity: 0.4, cursor: "not-allowed" }}>
            Approval page
          </span>
        )}
        <button type="button" className="dash-btn dash-btn-outline demo-action-btn" disabled={busy} onClick={() => void runExecute("valid")}>
          Gate · match
        </button>
        <button type="button" className="dash-btn dash-btn-danger demo-action-btn" disabled={busy} onClick={() => void runExecute("tampered")}>
          Gate · tampered
        </button>
        <button type="button" className="dash-btn dash-btn-outline demo-action-btn" disabled={busy} onClick={() => void checkout()}>
          Pay (Stripe)
        </button>
      </section>

      <p className="demo-hint demo-sample-line">
        <span className="demo-hint-label">Sample line</span>
        <span className="demo-sample-text">{DEFAULT_RIDE_TRANSCRIPT}</span>
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

      <div className="demo-dash-grid">
        <Panel title="Voice">
          <pre className="demo-pre demo-pre-compact">{snap?.voice?.transcript ?? "—"}</pre>
          <p className="demo-mini">
            Caller {snap?.voice?.caller ?? "—"} · {snap?.voice?.channel ?? "—"}
          </p>
        </Panel>

        <Panel title="Structured task">
          {plannerBrief ? (
            <ul className="demo-kv-list">
              <li>
                <span>Action</span> <span>{plannerBrief.action_type}</span>
              </li>
              <li>
                <span>Domain</span> <span>{plannerBrief.domain}</span>
              </li>
              {plannerBrief.goal ? (
                <li className="demo-kv-full">
                  <span>Goal</span> <span>{plannerBrief.goal}</span>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="demo-muted">Run an utterance to see Gemini&apos;s plan.</p>
          )}
          <Collapsible label="Raw JSON" value={planner} />
        </Panel>

        <Panel title="Options & quotes" className="demo-panel-span-2">
          {browser?.research_provider ? (
            <p className="demo-mini">
              Source · <strong>{String(browser.research_provider)}</strong>
            </p>
          ) : null}
          {browser?.demo_fallback ? (
            <p className="demo-fallback-badge">
              Demo estimate — every provider in <code>AGENTOG_RESEARCH_CHAIN</code> failed or returned no price. Default
              chain is Browser Use → OpenAI JSON → Gemini JSON. Add keys accordingly.
            </p>
          ) : null}
          {!browser?.demo_fallback &&
          (browser?.research_provider === "openai_json" || browser?.research_provider === "gemini_json") ? (
            <p className="demo-info-badge">
              Structured quotes from the model — not a live browser tab. Put <code>browser_use</code> first in{" "}
              <code>AGENTOG_RESEARCH_CHAIN</code> for real crawling.
            </p>
          ) : null}
          {browser?.needs_configuration && !browser?.demo_fallback ? (
            <p className="demo-muted">
              This step needs API keys for the providers in your chain (Browser Use, OpenAI, or Gemini).
            </p>
          ) : null}
          {browser?.search_query ? (
            <p className="demo-mini">
              Search: <code>{String(browser.search_query)}</code>
            </p>
          ) : null}
          {opts?.length ? (
            <ul className="demo-option-list">
              {opts.map((o, i) => (
                <li key={i}>
                  <strong>{String(o.vendor_or_site ?? o.title)}</strong>
                  {o.price_usd != null ? ` · ~$${String(o.price_usd)}` : ""}
                  {o.url ? (
                    <>
                      {" "}
                      ·{" "}
                      <a href={String(o.url)} target="_blank" rel="noreferrer">
                        source
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : !browser?.needs_configuration && !browser?.demo_fallback ? (
            <p className="demo-muted">No options yet.</p>
          ) : null}
          <Collapsible label="Raw research payload" value={browser} />
        </Panel>

        <Panel title="Approval envelope">
          {snap?.intent?.id ? (
            <>
              <ul className="demo-kv-list">
                <li>
                  <span>Intent</span>{" "}
                  <span>
                    <code>{snap.intent.id}</code>
                  </span>
                </li>
                <li>
                  <span>Status</span> <span>{snap.intent.approval_status}</span>
                </li>
                <li>
                  <span>Code</span> <strong>{snap.intent.verification_code}</strong>
                </li>
                <li>
                  <span>Vendor</span> <span>{snap.intent.vendor}</span>
                </li>
                <li>
                  <span>Amount</span> <span>${snap.intent.amount}</span>
                </li>
              </ul>
              <p className="demo-mini hash">{snap.intent.action_hash}</p>
              <p className="demo-muted" style={{ marginTop: "0.75rem", fontSize: "0.8125rem" }}>
                {snap.intent.raw_input?.action_summary ?? "—"}
              </p>
              {snap.intent.raw_input?.research_source_url ? (
                <p className="demo-mini">
                  <a href={snap.intent.raw_input.research_source_url} target="_blank" rel="noreferrer">
                    Research link
                  </a>
                </p>
              ) : null}
            </>
          ) : (
            <p className="demo-muted">No fingerprint until the pipeline produces a priced action.</p>
          )}
        </Panel>

        <Panel title="Policy & memory">
          <ul className="demo-bullet">
            {(snap?.moss_lines ?? []).length ? (
              snap!.moss_lines!.map((l) => <li key={l}>{l}</li>)
            ) : (
              <li className="demo-muted">No Moss lines.</li>
            )}
          </ul>
          <p className="demo-meta-preview">{snap?.supermemory_text ?? "—"}</p>
        </Panel>

        <Panel title="Notifications">
          <p className="demo-mini">
            AgentMail: <strong>{snap?.approval_delivery?.agentmail ?? "—"}</strong>
          </p>
          <p className="demo-mini">
            AgentPhone: <strong>{snap?.approval_delivery?.agentphone ?? "—"}</strong>
          </p>
        </Panel>

        <Panel title="Execution gate">
          <p className="demo-mini">
            Approved payload:{" "}
            {snap?.execution?.last_valid ? (
              <span className="dash-pill dash-pill-ok">{snap.execution.last_valid.result}</span>
            ) : (
              <span className="demo-muted">not run</span>
            )}
          </p>
          <p className="demo-mini">
            Tampered payload:{" "}
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

        <Panel title="Recent activity" className="demo-panel-span-2">
          <ul className="demo-receipts">
            {(snap?.receipts ?? [])
              .slice(-12)
              .reverse()
              .map((r, i) => (
                <li key={`${snap?.updated_at ?? "snap"}-${i}-${r.slice(0, 48)}`}>
                  {receiptLineForDisplay(r)}
                </li>
              ))}
          </ul>
          {(snap?.receipts ?? []).length === 0 ? <p className="demo-muted">No events yet.</p> : null}
        </Panel>
      </div>

      <footer className="dash-footer-links demo-dash-footer">
        <Link href="/">Home</Link>
        {" · "}
        <Link href="/rides">Test scenario (static quotes)</Link>
        {" · "}
        <a className="footer-health" href="/api/health" target="_blank" rel="noreferrer">
          App health status
        </a>
      </footer>
    </main>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`demo-panel ${className ?? ""}`}>
      <h2 className="demo-panel-title">{title}</h2>
      {children}
    </section>
  );
}

function Collapsible({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  const str = JSON.stringify(value, null, 2);
  return (
    <details className="demo-details">
      <summary>{label}</summary>
      <pre className="demo-pre demo-pre-compact">{str}</pre>
    </details>
  );
}
