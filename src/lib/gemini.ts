import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { DEFAULT_RIDE_TRANSCRIPT } from "./demo-default-transcript";
import { getGeminiApiKey, mockIntegrations } from "./env";

function plannerModelName() {
  return (
    process.env.GEMINI_PLANNER_MODEL?.trim() ||
    process.env.GEMMA_MODEL?.trim() ||
    "gemini-2.0-flash"
  );
}

function classifierModelName() {
  return (
    process.env.GEMINI_CLASSIFIER_MODEL?.trim() ||
    process.env.GEMMA_MODEL?.trim() ||
    "gemini-2.0-flash"
  );
}

function extractJsonObject(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object in model output");
  return JSON.parse(match[0]) as Record<string, unknown>;
}

export async function parseVoiceRequestToTask(transcript: string) {
  if (mockIntegrations() || !getGeminiApiKey()) {
    return {
      action_type: "book_service",
      domain: "transportation",
      pickup: "560 20th Street, San Francisco",
      dropoff: "Ghirardelli Square, San Francisco",
      time_constraint: "after 5 PM",
      max_amount: 50,
      required_conditions: ["wheelchair_assistance"],
      requires_payment: true,
      requires_location_data: true,
      demo: true,
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
        },
        required: [
          "action_type",
          "domain",
          "pickup",
          "dropoff",
          "time_constraint",
          "max_amount",
          "required_conditions",
          "requires_payment",
          "requires_location_data",
        ],
      },
    },
  });

  const prompt = `You convert an end-user voice request into structured JSON for an approval system.
Transcript:\n"""${transcript || DEFAULT_RIDE_TRANSCRIPT}"""\n
Assume San Francisco if cities omitted. Use snake_case condition tokens like wheelchair_assistance.`;

  const res = await model.generateContent(prompt);
  const text = res.response.text();
  return extractJsonObject(text);
}

export async function classifyHighImpactAction(task: Record<string, unknown>) {
  if (mockIntegrations() || !getGeminiApiKey()) {
    return {
      high_impact_action: true,
      approval_required: true,
      risk_level: "medium",
      reason:
        "The agent is booking transportation, spending money, sharing location data, and using accessibility-related information.",
      sensitive_fields: ["pickup_location", "dropoff_location", "accessibility_need"],
      demo: true,
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

  const prompt = `Classify whether executing this agent task is a high-impact action requiring human approval.
Task JSON:\n${JSON.stringify(task)}`;

  const res = await model.generateContent(prompt);
  return extractJsonObject(res.response.text());
}
