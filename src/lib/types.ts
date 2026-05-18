export type ActionIntentInput = {
  action_type: string;
  domain?: string;
  vendor: string;
  amount: number;
  currency: string;
  pickup?: string;
  dropoff?: string;
  scheduled_time?: string;
  /** One-line human summary of what was approved (any domain). */
  action_summary?: string;
  /** Primary page where Browser Use found the selected option. */
  research_source_url?: string;
  required_conditions: string[];
  data_shared: string[];
  data_blocked: string[];
};

export type ApprovalStatus = "pending" | "approved" | "rejected" | "revise_requested";

export type ActionIntentRecord = {
  id: string;
  user_id: string;
  agent_id: string;
  created_at: string;
  expires_at: string;
  risk_level: string;
  approval_required: boolean;
  approval_status: ApprovalStatus;
  verification_code: string;
  raw_input: ActionIntentInput;
  action_hash: string;
  approval_token?: string;
  approval_token_expires_at?: string;
  planner_task?: Record<string, unknown>;
  classifier?: Record<string, unknown>;
  moss_summary?: string[];
  supermemory_summary?: string;
  browser_selection?: Record<string, unknown>;
  caller_phone?: string;
  voice_transcript?: string;
};

export type AuditEvent = {
  id: string;
  intent_id: string;
  event_type: string;
  event_details: Record<string, unknown>;
  created_at: string;
};

export type ExecutionAttempt = {
  id: string;
  intent_id: string;
  final_payload: ActionIntentInput;
  final_action_hash: string;
  result: "allowed" | "blocked";
  block_reason?: string;
  created_at: string;
};

/** Set after each voice pipeline run — whether AgentMail / AgentPhone were invoked. */
export type ApprovalDeliverySnapshot = {
  agentmail:
    | "sent"
    | "skipped_no_guardian_email"
    | "skipped_missing_agentmail_config"
    | "send_failed";
  agentphone:
    | "outbound_initiated"
    | "skipped_no_guardian_phone"
    | "skipped_missing_agentphone_config"
    | "failed";
};

export type DashboardSnapshot = {
  updated_at: string;
  /** Set when the voice pipeline fails before creating an intent (e.g. Browser Use misconfigured). */
  pipeline_error?: string;
  approval_delivery?: ApprovalDeliverySnapshot;
  voice?: {
    transcript?: string;
    caller?: string;
    channel?: string;
    event?: string;
  };
  planner_task?: Record<string, unknown>;
  classifier?: Record<string, unknown>;
  moss_lines?: string[];
  supermemory_text?: string;
  browser_use?: Record<string, unknown>;
  intent?: {
    id: string;
    action_hash: string;
    approval_status: ApprovalStatus;
    approval_url?: string;
    verification_code?: string;
    vendor?: string;
    amount?: number;
    raw_input?: ActionIntentInput;
  };
  execution?: {
    last_valid?: ExecutionAttempt;
    last_tampered?: ExecutionAttempt;
  };
  /** Short human-readable activity lines (newest shown first on dashboard). */
  receipts?: string[];
};
