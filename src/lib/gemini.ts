import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { DEFAULT_RIDE_TRANSCRIPT } from "./demo-default-transcript";
import { getGeminiApiKey, mockIntegrations } from "./env";

function plannerModelName() {
  return (
    process.env.GEMINI_PLANNER_MODEL?.trim() ||
    process.env.GEMMA_MODEL?.trim() ||
    "gemini-2.5-flash"
  );
}

function classifierModelName() {
  return (
    process.env.GEMINI_CLASSIFIER_MODEL?.trim() ||
    process.env.GEMMA_MODEL?.trim() ||
    "gemini-2.5-flash"
  );
}

function extractJsonObject(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object in model output");
  return JSON.parse(match[0]) as Record<string, unknown>;
}

export async function parseVoiceRequestToTask(transcript: string) {
  const t = transcript?.trim() || DEFAULT_RIDE_TRANSCRIPT;

  if (mockIntegrations() || !getGeminiApiKey()) {
    return {
      action_type: "user_request",
      domain: "general",
      pickup: "",
      dropoff: "",
      time_constraint: "",
      max_amount: 500,
      required_conditions: [] as string[],
      requires_payment: true,
      requires_location_data: false,
      web_search_query: t.slice(0, 220),
      user_goal_summary: t.slice(0, 900),
      planner_fallback: true,
    };
  }

  const genAI = new GoogleGenerativeAI(getGeminiApiKey()!);
  const model = genAI.getGenerativeModel({
    model: plannerModelName(),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          action_type: { type: SchemaType.STRING },
          domain: { type: SchemaType.STRING },
          pickup: { type: SchemaType.STRING },
          dropoff: { type: SchemaType.STRING },
          time_constraint: { type: SchemaType.STRING },
          max_amount: { type: SchemaType.NUMBER },
          required_conditions: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          requires_payment: { type: SchemaType.BOOLEAN },
          requires_location_data: { type: SchemaType.BOOLEAN },
          web_search_query: {
            type: SchemaType.STRING,
            description: "Short query optimized for a web search engine",
          },
          user_goal_summary: {
            type: SchemaType.STRING,
            description: "One paragraph summarizing what the user wants",
          },
        },
        required: [
          "action_type",
          "domain",
          "max_amount",
          "required_conditions",
          "requires_payment",
          "requires_location_data",
          "web_search_query",
          "user_goal_summary",
        ],
      },
    },
  });

  const prompt = `Convert the caller transcript into structured JSON for an AI approval system (AgentOG).
Transcript:\n"""${t}"""\n
Rules:
- Infer action_type (e.g. purchase_item, book_service, schedule_appointment, submit_form) and domain.
- If locations matter (rides, deliveries), fill pickup/dropoff/time_constraint; otherwise use empty strings for those fields.
- web_search_query must be a concise search-engine query reflecting the user's goal (no PII).
- user_goal_summary explains the intended action in plain English.
- required_conditions: snake_case tokens (e.g. wheelchair_assistance, no_subscription).
Use empty string "" for unknown optional location/time fields.`;

  const res = await model.generateContent(prompt);
  const text = res.response.text();
  const obj = extractJsonObject(text);
  if (typeof obj.pickup !== "string") obj.pickup = "";
  if (typeof obj.dropoff !== "string") obj.dropoff = "";
  if (typeof obj.time_constraint !== "string") obj.time_constraint = "";
  return obj;
}

export async function classifyHighImpactAction(task: Record<string, unknown>) {
  if (mockIntegrations() || !getGeminiApiKey()) {
    return {
      high_impact_action: true,
      approval_required: true,
      risk_level: "medium",
      reason:
        "Autonomous agent may spend money, share personal data, or commit to an external party — requires action-bound human approval.",
      sensitive_fields: ["contact_preferences", "delivery_or_location_details"],
      planner_fallback: true,
    };
  }

  const genAI = new GoogleGenerativeAI(getGeminiApiKey()!);
  const model = genAI.getGenerativeModel({
    model: classifierModelName(),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          high_impact_action: { type: SchemaType.BOOLEAN },
          approval_required: { type: SchemaType.BOOLEAN },
          risk_level: { type: SchemaType.STRING },
          reason: { type: SchemaType.STRING },
          sensitive_fields: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: [
          "high_impact_action",
          "approval_required",
          "risk_level",
          "reason",
          "sensitive_fields",
        ],
      },
    },
  });

  const prompt = `Classify whether executing this agent task is a high-impact action requiring human approval before execution (money, bookings, forms, sensitive data, external commitments).

Task JSON:\n${JSON.stringify(task)}`;

  const res = await model.generateContent(prompt);
  return extractJsonObject(res.response.text());
}
