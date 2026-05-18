import type { ActionIntentInput } from "./types";
import { getStore } from "./agentog-store";
import { getBaseUrl, resolveGuardianEmail, resolveGuardianPhone } from "./env";
import { extractBrowserSelection } from "./browser-selection";
import { parseVoiceRequestToTask, classifyHighImpactAction } from "./gemini";
import { queryPolicies } from "./moss-client";
import { fetchSupermemoryContext } from "./supermemory-client";
import { runResolvedResearch } from "./research-agent-options";
import { buildApprovalEmail, sendAgentMailEmail } from "./agentmail";
import { agentPhoneOutboundCall } from "./agentphone";

function blockedDefaults(): string[] {
  return [
    "medical_condition",
    "diagnosis",
    "ssn",
    "insurance_number",
    "payment_card",
  ];
}

function sharedDefaultsForTransport(): string[] {
  return [
    "name",
    "phone",
    "pickup_location",
    "dropoff_location",
    "accessibility_need",
  ];
}

function sharedDefaultsGeneral(): string[] {
  return ["name", "phone", "email_or_contact"];
}

export function buildActionPayload(params: {
  task: Record<string, unknown>;
  browser: Record<string, unknown>;
  classifier: Record<string, unknown>;
}): ActionIntentInput {
  const task = params.task;
  const browser = params.browser;
  const sel = extractBrowserSelection(browser);
  if (!sel) {
    throw new Error(
      "No priced option available yet. Configure Browser Use for live browsing, or add OPENAI_API_KEY / Gemini keys so AgentOG can build structured quotes.",
    );
  }

  const sensitive =
    (params.classifier.sensitive_fields as string[] | undefined) ?? [];

  const transport =
    String(task.domain ?? "").toLowerCase() === "transportation" ||
    Boolean(task.pickup || task.dropoff);

  const shared = new Set(transport ? sharedDefaultsForTransport() : sharedDefaultsGeneral());
  for (const f of sensitive) {
    const low = f.toLowerCase();
    if (low.includes("pickup")) shared.add("pickup_location");
    else if (low.includes("dropoff")) shared.add("dropoff_location");
    else if (low.includes("access")) shared.add("accessibility_need");
    else shared.add(f.replace(/\s+/g, "_"));
  }

  const req = (task.required_conditions as string[] | undefined) ?? [];

  const summary =
    String(task.user_goal_summary ?? task.web_search_query ?? "").trim() ||
    `${task.action_type ?? "action"} — ${sel.vendor}`;

  return {
    action_type: String(task.action_type ?? "user_request"),
    domain: String(task.domain ?? "general"),
    vendor: sel.vendor,
    amount: sel.amount,
    currency: "USD",
    pickup: String(task.pickup ?? ""),
    dropoff: String(task.dropoff ?? ""),
    scheduled_time: sel.scheduled_time,
    action_summary: summary.slice(0, 800),
    research_source_url: sel.primary_source_url.slice(0, 2000),
    required_conditions: req,
    data_shared: [...shared],
    data_blocked: blockedDefaults(),
  };
}

function actionLabel(actionType: string): string {
  return actionType.replace(/_/g, " ");
}

export async function processVoiceTranscript(params: {
  transcript: string;
  caller?: string;
  channel?: string;
}) {
  const store = getStore();
  const base = getBaseUrl();

  store.touchDashboard({ pipeline_error: undefined });

  try {
    store.touchDashboard({
      voice: {
        transcript: params.transcript,
        caller: params.caller,
        channel: params.channel ?? "voice",
      },
    });

    const plannerTask = await parseVoiceRequestToTask(params.transcript);
    store.touchDashboard({ planner_task: plannerTask });

    const classifier = await classifyHighImpactAction(plannerTask);
    store.touchDashboard({ classifier });

    const mossQuery = `${String(plannerTask.action_type)} ${String(plannerTask.domain)} ${String(plannerTask.user_goal_summary ?? "").slice(0, 400)}`;
    const mossLines = await queryPolicies(mossQuery);
    store.touchDashboard({ moss_lines: mossLines });

    const smQuery = `User preferences and approval rules for: ${String(plannerTask.user_goal_summary ?? plannerTask.web_search_query ?? "").slice(0, 500)}`;
    const supermemoryText = await fetchSupermemoryContext(smQuery);
    store.touchDashboard({ supermemory_text: supermemoryText });

    const browser = await runResolvedResearch({
      transcript: params.transcript,
      plannerTask,
    });
    store.touchDashboard({ browser_use: browser });

    const input = buildActionPayload({
      task: plannerTask,
      browser,
      classifier,
    });

    const intent = store.createIntent({
      input,
      risk_level: String(classifier.risk_level ?? "medium"),
      approval_required: Boolean(classifier.approval_required ?? true),
      extras: {
        planner_task: plannerTask as Record<string, unknown>,
        classifier: classifier as Record<string, unknown>,
        moss_summary: mossLines,
        supermemory_summary: supermemoryText,
        browser_selection: browser,
        caller_phone: params.caller,
        voice_transcript: params.transcript,
      },
    });

    const approvalUrl = `${base}/approve/${intent.id}`;
    store.touchDashboard({
      intent: {
        id: intent.id,
        action_hash: intent.action_hash,
        approval_status: intent.approval_status,
        approval_url: approvalUrl,
        verification_code: intent.verification_code,
        vendor: intent.raw_input.vendor,
        amount: intent.raw_input.amount,
        raw_input: intent.raw_input,
      },
    });

    let agentmailStatus:
      | "sent"
      | "skipped_no_guardian_email"
      | "skipped_missing_agentmail_config"
      | "send_failed" = "skipped_no_guardian_email";
    let agentphoneStatus:
      | "outbound_initiated"
      | "skipped_no_guardian_phone"
      | "skipped_missing_agentphone_config"
      | "failed" = "skipped_no_guardian_phone";

    const guardianEmail = resolveGuardianEmail();
    if (guardianEmail) {
      const summary = {
        action_label: actionLabel(intent.raw_input.action_type),
        vendor: intent.raw_input.vendor,
        amount: intent.raw_input.amount,
        pickup: intent.raw_input.pickup,
        dropoff: intent.raw_input.dropoff,
        scheduled_time: intent.raw_input.scheduled_time,
        action_summary: intent.raw_input.action_summary,
        research_source_url: intent.raw_input.research_source_url,
        required_conditions: intent.raw_input.required_conditions,
        risk_level: intent.risk_level,
        data_shared: intent.raw_input.data_shared,
        data_blocked: intent.raw_input.data_blocked,
      };
      const { subject, text, html } = buildApprovalEmail({
        intentId: intent.id,
        approvalUrl,
        verificationCode: intent.verification_code,
        intentSummary: summary,
      });
      try {
        const mailResult = await sendAgentMailEmail({
          to: guardianEmail,
          subject,
          text,
          html,
        });
        if (
          mailResult &&
          typeof mailResult === "object" &&
          "skipped" in mailResult &&
          mailResult.skipped
        ) {
          agentmailStatus = "skipped_missing_agentmail_config";
          store.appendReceiptLine(
            "AgentMail: skipped — check AGENTMAIL_API_KEY and inbox id (AgentMail dashboard)",
          );
        } else {
          agentmailStatus = "sent";
          store.appendReceiptLine(`AgentMail: approval email sent to ${guardianEmail}`);
        }
      } catch (e) {
        agentmailStatus = "send_failed";
        store.appendReceiptLine(
          `AgentMail send failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    const guardianPhone = resolveGuardianPhone();
    if (guardianPhone) {
      const ri = intent.raw_input;
      const greeting = [
        "AgentOG approval request.",
        `${actionLabel(ri.action_type)} for approximately ${ri.amount} dollars with ${ri.vendor}.`,
        ri.action_summary ? ri.action_summary.slice(0, 320) : "",
        `Verification code ${intent.verification_code}. Say approve ${intent.verification_code}, reject, or revise.`,
      ]
        .filter(Boolean)
        .join(" ");

      try {
        const callResult = await agentPhoneOutboundCall({
          toNumber: guardianPhone,
          initialGreeting: greeting,
        });
        if (
          callResult &&
          typeof callResult === "object" &&
          "skipped" in callResult &&
          callResult.skipped
        ) {
          agentphoneStatus = "skipped_missing_agentphone_config";
          store.appendReceiptLine(
            "AgentPhone: skipped — check AGENTPHONE_API_KEY and AGENTPHONE_AGENT_ID",
          );
        } else {
          agentphoneStatus = "outbound_initiated";
          store.appendReceiptLine(`AgentPhone: outbound call initiated (${guardianPhone})`);
        }
      } catch (e) {
        agentphoneStatus = "failed";
        store.appendReceiptLine(
          `AgentPhone call failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    store.touchDashboard({
      approval_delivery: {
        agentmail: agentmailStatus,
        agentphone: guardianPhone ? agentphoneStatus : "skipped_no_guardian_phone",
      },
    });

    return {
      intent_id: intent.id,
      action_hash: intent.action_hash,
      approval_url: approvalUrl,
      verification_code: intent.verification_code,
      spoken_summary: `AgentOG created approval intent ${intent.id}. Check email or approve at your dashboard. Verification code ${intent.verification_code}.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    store.touchDashboard({
      pipeline_error: msg,
      intent: undefined,
    });
    store.appendReceiptLine(`Pipeline stopped: ${msg}`);
    throw e;
  }
}
