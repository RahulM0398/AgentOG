import type { ActionIntentInput } from "./types";
import { getStore } from "./agentog-store";
import { getBaseUrl } from "./env";
import { parseVoiceRequestToTask, classifyHighImpactAction } from "./gemini";
import { queryPolicies } from "./moss-client";
import { fetchSupermemoryContext } from "./supermemory-client";
import { runBrowserUseRideResearch } from "./browser-use-client";
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

function sharedDefaults(): string[] {
  return [
    "name",
    "phone",
    "pickup_location",
    "dropoff_location",
    "accessibility_need",
  ];
}

export function buildActionPayload(params: {
  task: Record<string, unknown>;
  browser: Record<string, unknown>;
  classifier: Record<string, unknown>;
}): ActionIntentInput {
  const task = params.task;
  const browser = params.browser;
  const sensitive =
    (params.classifier.sensitive_fields as string[] | undefined) ?? [];

  const shared = new Set(sharedDefaults());
  for (const f of sensitive) {
    if (f.includes("pickup")) shared.add("pickup_location");
    else if (f.includes("dropoff")) shared.add("dropoff_location");
    else if (f.includes("accessibility")) shared.add("accessibility_need");
    else shared.add(f);
  }

  const req =
    (task.required_conditions as string[] | undefined) ?? [
      "wheelchair_assistance",
    ];

  return {
    action_type: String(task.action_type ?? "book_service"),
    domain: String(task.domain ?? "transportation"),
    vendor: String(browser.selected_vendor ?? "MockRide Assist"),
    amount: Number(browser.amount ?? 42),
    currency: "USD",
    pickup: String(task.pickup ?? ""),
    dropoff: String(task.dropoff ?? ""),
    scheduled_time: String(browser.scheduled_time ?? "5:20 PM"),
    required_conditions: req,
    data_shared: [...shared],
    data_blocked: blockedDefaults(),
  };
}

export async function processVoiceTranscript(params: {
  transcript: string;
  caller?: string;
  channel?: string;
}) {
  const store = getStore();
  const base = getBaseUrl();

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

  const mossQuery =
    "What approval policies apply to booking wheelchair-assisted transportation under $50 with guardian approval?";
  const mossLines = await queryPolicies(mossQuery);
  store.touchDashboard({ moss_lines: mossLines });

  const smQuery =
    "What are this user's approval preferences and sensitive data restrictions for transportation booking?";
  const supermemoryText = await fetchSupermemoryContext(smQuery);
  store.touchDashboard({ supermemory_text: supermemoryText });

  const browser = await runBrowserUseRideResearch(base);
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

  const guardianEmail =
    process.env.GUARDIAN_EMAIL?.trim() ||
    process.env.AGENT_OG_APPROVER_EMAIL?.trim();
  if (guardianEmail) {
    const summary = {
      action_label: "Book wheelchair-assisted ride",
      vendor: intent.raw_input.vendor,
      amount: intent.raw_input.amount,
      pickup: intent.raw_input.pickup,
      dropoff: intent.raw_input.dropoff,
      scheduled_time: intent.raw_input.scheduled_time,
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
    await sendAgentMailEmail({ to: guardianEmail, subject, text, html });
    store.appendReceiptLine(`Approval email queued/sent to ${guardianEmail}`);
  }

  const guardianPhone =
    process.env.GUARDIAN_PHONE?.trim() ||
    process.env.AGENT_OG_APPROVER_PHONE?.trim();
  if (guardianPhone) {
    const greeting = [
      "AgentOG approval request. Your AI agent wants to complete a high-impact action.",
      `Action: Book a wheelchair-assisted ride.`,
      `Vendor: ${intent.raw_input.vendor}.`,
      `Amount: ${intent.raw_input.amount} dollars.`,
      `Pickup: ${intent.raw_input.pickup}.`,
      `Dropoff: ${intent.raw_input.dropoff}.`,
      `Time: ${intent.raw_input.scheduled_time}.`,
      `Data shared: ${intent.raw_input.data_shared.join(", ")}.`,
      `Say approve ${intent.verification_code}, reject, or revise.`,
    ].join(" ");

    try {
      await agentPhoneOutboundCall({
        toNumber: guardianPhone,
        initialGreeting: greeting,
      });
      store.appendReceiptLine(`Guardian outbound call initiated to ${guardianPhone}`);
    } catch (e) {
      store.appendReceiptLine(
        `Guardian call failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return {
    intent_id: intent.id,
    action_hash: intent.action_hash,
    approval_url: approvalUrl,
    verification_code: intent.verification_code,
    spoken_summary: `AgentOG created approval intent ${intent.id}. Check email or approve at your dashboard. Verification code ${intent.verification_code}.`,
  };
}
