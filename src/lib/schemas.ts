import { z } from "zod";

export const ActionIntentInputSchema = z.object({
  action_type: z.string(),
  domain: z.string().optional(),
  vendor: z.string(),
  amount: z.number(),
  currency: z.string().default("USD"),
  pickup: z.string().optional(),
  dropoff: z.string().optional(),
  scheduled_time: z.string().optional(),
  required_conditions: z.array(z.string()).default([]),
  data_shared: z.array(z.string()).default([]),
  data_blocked: z.array(z.string()).default([]),
});

export const ExecutionRequestSchema = z.object({
  intent_id: z.string(),
  approval_token: z.string(),
  final_payload: ActionIntentInputSchema,
});
