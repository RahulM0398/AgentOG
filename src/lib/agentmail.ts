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
  const text = `Your AI agent wants to complete this exact action:

Action: ${params.intentSummary.action_label ?? "High-impact action"}
Vendor: ${params.intentSummary.vendor}
Amount: $${params.intentSummary.amount}
Pickup: ${params.intentSummary.pickup}
Dropoff: ${params.intentSummary.dropoff}
Time: ${params.intentSummary.scheduled_time}
Required conditions: ${JSON.stringify(params.intentSummary.required_conditions)}
Risk: ${params.intentSummary.risk_level}

Data shared:
${(params.intentSummary.data_shared as string[])?.map((x) => `- ${x}`).join("\n")}

Data blocked:
${(params.intentSummary.data_blocked as string[])?.map((x) => `- ${x}`).join("\n")}

Verification code: ${params.verificationCode}

Approve exact action:
${params.approvalUrl}
`;

  const html = `
  <p><strong>AgentOG Approval Required</strong></p>
  <p>Your AI agent wants to complete this <strong>exact</strong> action.</p>
  <ul>
    <li><strong>Vendor:</strong> ${params.intentSummary.vendor}</li>
    <li><strong>Amount:</strong> $${params.intentSummary.amount}</li>
    <li><strong>Pickup:</strong> ${params.intentSummary.pickup}</li>
    <li><strong>Dropoff:</strong> ${params.intentSummary.dropoff}</li>
    <li><strong>Time:</strong> ${params.intentSummary.scheduled_time}</li>
    <li><strong>Risk:</strong> ${params.intentSummary.risk_level}</li>
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
