"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DashboardSnapshot } from "@/lib/types";

export default function DashboardPage() {
  const [snap, setSnap] = useState<DashboardSnapshot | null>(null);
  const [execResult, setExecResult] = useState<string | null>(null);
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
      setExecResult("Create an intent first (call AgentPhone or run Simulate Voice).");
      return;
    }
    let token: string | null = null;
    try {
      token = localStorage.getItem(`agentog_token_${intentId}`);
    } catch {
      token = null;
    }
    if (!token) {
      setExecResult("Approve the intent in /approve and enter the verification code.");
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
    const data = await res.json();
    setBusy(false);
    setExecResult(`${data.status}: ${data.reason ?? JSON.stringify(data)}`);
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
      setExecResult("Need approval token in browser storage.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent_id: intentId, approval_token: token }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.url) {
      window.location.href = data.url as string;
    } else {
      setExecResult(JSON.stringify(data));
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1.25rem 3rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: "0 0 0.35rem" }}>AgentOG dashboard</h1>
        <p style={{ margin: 0, color: "var(--muted)", maxWidth: 720 }}>
          Action-bound verification for high-impact agent actions — fingerprint,
          human approval, short-lived token, execution gate, audit trail. Ride
          booking is the demo scenario only.
        </p>
        <nav style={{ marginTop: "1rem", display: "flex", gap: 16 }}>
          <Link href="/rides">Mock /rides</Link>
          <a href="/api/health" target="_blank" rel="noreferrer">
            /api/health
          </a>
        </nav>
      </header>

      <section style={{ marginBottom: "1rem", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void simulateVoice()}
          disabled={busy}
          style={btnPrimary}
        >
          Simulate voice transcript (demo)
        </button>
        {snap?.intent?.approval_url ? (
          <Link href={snap.intent.approval_url} style={{ ...btnGhost, lineHeight: "2.4rem" }}>
            Open approval page
          </Link>
        ) : null}
        <button type="button" onClick={() => void runExecute("valid")} disabled={busy} style={btnGhost}>
          Execute Valid Payload
        </button>
        <button type="button" onClick={() => void runExecute("tampered")} disabled={busy} style={btnDanger}>
          Execute Tampered Payload
        </button>
        <button type="button" onClick={() => void checkout()} disabled={busy} style={btnGhost}>
          Stripe checkout (after allowed execute)
        </button>
      </section>

      {execResult ? (
        <pre
          style={{
            padding: "1rem",
            borderRadius: 8,
            background: "var(--panel)",
            border: "1px solid var(--border)",
            whiteSpace: "pre-wrap",
          }}
        >
          {execResult}
        </pre>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1rem",
        }}
      >
        <Panel title="Panel 1 — Live voice">
          <p style={{ color: "var(--muted)" }}>Caller</p>
          <code>{snap?.voice?.caller ?? "—"}</code>
          <p style={{ color: "var(--muted)" }}>Transcript</p>
          <blockquote style={{ margin: 0, color: "var(--text)" }}>
            {snap?.voice?.transcript ??
              "Waiting for AgentPhone webhook or demo simulate…"}
          </blockquote>
        </Panel>

        <Panel title="Panel 2 — Planner (Gemini/Gemma)">
          <JsonBlock value={snap?.planner_task} />
        </Panel>

        <Panel title="Panel 3 — High-impact classifier">
          <JsonBlock value={snap?.classifier} />
        </Panel>

        <Panel title="Panel 4 — Moss + Supermemory">
          <p style={{ color: "var(--muted)" }}>Moss</p>
          <ul>
            {(snap?.moss_lines ?? []).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p style={{ color: "var(--muted)" }}>Supermemory</p>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {snap?.supermemory_text ?? "—"}
          </pre>
        </Panel>

        <Panel title="Panel 5 — Browser Use selection">
          <JsonBlock value={snap?.browser_use} />
        </Panel>

        <Panel title="Panel 6 — Action fingerprint">
          <p>
            Intent: <code>{snap?.intent?.id ?? "—"}</code>
          </p>
          <p>
            Hash:{" "}
            <code style={{ wordBreak: "break-all" }}>
              {snap?.intent?.action_hash ?? "—"}
            </code>
          </p>
          <p>Status: {snap?.intent?.approval_status ?? "—"}</p>
        </Panel>

        <Panel title="Panel 7 — Execution gate">
          <p>
            Valid:{" "}
            {snap?.execution?.last_valid?.result ?? "—"}{" "}
            {snap?.execution?.last_valid?.created_at ?? ""}
          </p>
          <p style={{ color: "var(--danger)" }}>
            Tampered:{" "}
            {snap?.execution?.last_tampered?.result ?? "—"}{" "}
            {snap?.execution?.last_tampered?.block_reason ?? ""}
          </p>
        </Panel>

        <Panel title="Panel 8 — Audit / receipts">
          <ul style={{ paddingLeft: "1.1rem" }}>
            {(snap?.receipts ?? []).slice(-8).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "1rem 1.1rem",
        background: "var(--panel)",
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: "1rem" }}>{title}</h2>
      {children}
    </section>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  if (!value) return <span style={{ color: "var(--muted)" }}>—</span>;
  return (
    <pre
      style={{
        margin: 0,
        fontSize: "0.8rem",
        overflow: "auto",
        maxHeight: 280,
        whiteSpace: "pre-wrap",
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 8,
  border: "none",
  fontWeight: 600,
  background: "var(--accent)",
  color: "#042f2e",
};

const btnGhost: React.CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
};

const btnDanger: React.CSSProperties = {
  ...btnGhost,
  borderColor: "var(--danger)",
  color: "var(--danger)",
};
