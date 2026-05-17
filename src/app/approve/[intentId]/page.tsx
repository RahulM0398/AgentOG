"use client";

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
      "Approved. Token saved in this browser for the execution demo. Use the dashboard to run Execute Valid.",
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
      <main style={{ padding: "2rem 1.25rem", maxWidth: 720, margin: "0 auto" }}>
        <p>Loading intent…</p>
      </main>
    );
  }

  const r = intent.raw_input;

  return (
    <main style={{ padding: "2rem 1.25rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>AgentOG approval</h1>
      <p style={{ color: "var(--muted)" }}>
        Approve the <strong>exact</strong> payload below. Normal MFA verifies the
        user — AgentOG verifies the exact agent action.
      </p>
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.25rem",
          background: "var(--panel)",
          marginBottom: "1.25rem",
        }}
      >
        <p>
          <strong>Vendor:</strong> {String(r.vendor)}
        </p>
        <p>
          <strong>Amount:</strong> ${String(r.amount)} {String(r.currency)}
        </p>
        <p>
          <strong>Pickup:</strong> {String(r.pickup ?? "")}
        </p>
        <p>
          <strong>Dropoff:</strong> {String(r.dropoff ?? "")}
        </p>
        <p>
          <strong>Time:</strong> {String(r.scheduled_time ?? "")}
        </p>
        <p>
          <strong>Required conditions:</strong>{" "}
          {JSON.stringify(r.required_conditions)}
        </p>
        <p>
          <strong>Risk:</strong> {intent.risk_level}
        </p>
        <p>
          <strong>Approval status:</strong> {intent.approval_status}
        </p>
        <p>
          <strong>Action hash:</strong>{" "}
          <code style={{ wordBreak: "break-all" }}>{intent.action_hash}</code>
        </p>
        <p>
          <strong>Data shared:</strong> {JSON.stringify(r.data_shared)}
        </p>
        <p>
          <strong>Data blocked:</strong> {JSON.stringify(r.data_blocked)}
        </p>
      </section>

      <label style={{ display: "block", marginBottom: 8 }}>
        Verification code (from email / voice)
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="4829"
          style={{
            display: "block",
            marginTop: 6,
            width: "100%",
            maxWidth: 320,
            padding: "0.6rem 0.75rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "#0f1620",
            color: "var(--text)",
          }}
        />
      </label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <button
          type="button"
          onClick={() => void approve()}
          disabled={loading}
          style={{
            padding: "0.65rem 1rem",
            borderRadius: 8,
            border: "none",
            fontWeight: 600,
            background: "var(--accent)",
            color: "#042f2e",
          }}
        >
          Approve Exact Action
        </button>
        <button
          type="button"
          onClick={() => void reject()}
          disabled={loading}
          style={{
            padding: "0.65rem 1rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text)",
          }}
        >
          Reject
        </button>
      </div>

      {msg ? (
        <p style={{ marginTop: "1rem", color: "var(--accent)" }}>{msg}</p>
      ) : null}
    </main>
  );
}
