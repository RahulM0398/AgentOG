import { getBaseUrl } from "./env";

export async function sendAgentMailEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const apiKey = process.env.AGENTMAIL_API_KEY?.trim();
  const inboxId =
    process.env.AGENTMAIL_INBOX_ID?.trim() ||
    process.env.AGENTMAIL_FROM?.trim();

  if (!apiKey || !inboxId) {
    console.warn("[AgentMail] Missing AGENTMAIL_API_KEY or AGENTMAIL_INBOX_ID");
    return { skipped: true as const };
  }

  const base =
    process.env.AGENTMAIL_API_BASE_URL?.trim() || "https://api.agentmail.to";
  const url = `${base.replace(/\/$/, "")}/inboxes/${encodeURIComponent(inboxId)}/messages/send`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AgentMail send failed: ${res.status} ${errText}`);
  }

  return res.json().catch(() => ({}));
}

export function buildApprovalEmail(params: {
  intentId: string;
  approvalUrl: string;
  verificationCode: string;
  intentSummary: Record<string, unknown>;
}) {
  const subject = "AgentOG Approval Required: High-Impact Agent Action";
  const sum = params.intentSummary;
  const summaryLine = sum.action_summary
    ? `\nSummary: ${sum.action_summary}`
    : "";
  const sourceLine = sum.research_source_url
    ? `\nSource (research): ${sum.research_source_url}`
    : "";
  const text = `Your AI agent wants to complete this exact action:

Action: ${sum.action_label ?? "High-impact action"}
Vendor / option: ${sum.vendor}
Amount: $${sum.amount}
Pickup: ${sum.pickup ?? "—"}
Dropoff: ${sum.dropoff ?? "—"}
Time / detail: ${sum.scheduled_time}${summaryLine}${sourceLine}
Required conditions: ${JSON.stringify(sum.required_conditions)}
Risk: ${sum.risk_level}

Data shared:
${(sum.data_shared as string[])?.map((x) => `- ${x}`).join("\n")}

Data blocked:
${(sum.data_blocked as string[])?.map((x) => `- ${x}`).join("\n")}

Verification code: ${params.verificationCode}

Approve exact action:
${params.approvalUrl}
`;

  const html = `
  <p><strong>AgentOG Approval Required</strong></p>
  <p>Your AI agent wants to complete this <strong>exact</strong> action.</p>
  <ul>
    <li><strong>Action:</strong> ${sum.action_label ?? ""}</li>
    <li><strong>Vendor / option:</strong> ${sum.vendor}</li>
    <li><strong>Amount:</strong> $${sum.amount}</li>
    <li><strong>Pickup:</strong> ${sum.pickup ?? "—"}</li>
    <li><strong>Dropoff:</strong> ${sum.dropoff ?? "—"}</li>
    <li><strong>Time / detail:</strong> ${sum.scheduled_time}</li>
    ${sum.action_summary ? `<li><strong>Summary:</strong> ${String(sum.action_summary).replace(/</g, "&lt;")}</li>` : ""}
    ${sum.research_source_url ? `<li><strong>Research URL:</strong> <a href="${String(sum.research_source_url)}">${String(sum.research_source_url)}</a></li>` : ""}
    <li><strong>Risk:</strong> ${sum.risk_level}</li>
  </ul>
  <p><strong>Verification code:</strong> ${params.verificationCode}</p>
  <p><a href="${params.approvalUrl}">Approve Exact Action</a></p>
  `;

  return { subject, text, html };
}

export function baseUrlRef() {
  return getBaseUrl();
}

export async function sendAuditReceiptEmail(params: {
  to: string;
  lines: string[];
}) {
  const subject = "AgentOG Action Receipt";
  const text = params.lines.join("\n");
  const html = `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${params.lines
    .map((l) =>
      l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    )
    .join("\n")}</pre>`;
  return sendAgentMailEmail({
    to: params.to,
    subject,
    text,
    html,
  });
}
