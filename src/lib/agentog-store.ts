import type {
  ActionIntentInput,
  ActionIntentRecord,
  ApprovalStatus,
  AuditEvent,
  DashboardSnapshot,
  ExecutionAttempt,
} from "./types";
import { actionFingerprint } from "./canonical";
import { getApprovalTtlMs } from "./env";

function nowIso() {
  return new Date().toISOString();
}

function randomIntentId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `intent_${hex}`;
}

function randomVerificationCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
  return String(n).padStart(4, "0");
}

const globalForStore = globalThis as unknown as {
  __agentog?: AgentOGMemoryStore;
};

class AgentOGMemoryStore {
  intents = new Map<string, ActionIntentRecord>();
  audit: AuditEvent[] = [];
  executions: ExecutionAttempt[] = [];
  dashboard: DashboardSnapshot = { updated_at: nowIso() };
  webhookSeen = new Map<string, number>();

  touchDashboard(patch: Partial<DashboardSnapshot>) {
    this.dashboard = {
      ...this.dashboard,
      ...patch,
      updated_at: nowIso(),
    };
  }

  addAudit(intent_id: string, event_type: string, event_details: Record<string, unknown>) {
    const evt: AuditEvent = {
      id: `aud_${crypto.randomUUID()}`,
      intent_id,
      event_type,
      event_details,
      created_at: nowIso(),
    };
    this.audit.push(evt);
    return evt;
  }

  createIntent(params: {
    input: ActionIntentInput;
    user_id?: string;
    agent_id?: string;
    risk_level?: string;
    approval_required?: boolean;
    extras?: Partial<ActionIntentRecord>;
  }): ActionIntentRecord {
    const id = randomIntentId();
    const hash = actionFingerprint(params.input);
    const ttl = getApprovalTtlMs();
    const record: ActionIntentRecord = {
      id,
      user_id: params.user_id ?? "user_001",
      agent_id: params.agent_id ?? "agent_001",
      created_at: nowIso(),
      expires_at: new Date(Date.now() + ttl).toISOString(),
      risk_level: params.risk_level ?? "medium",
      approval_required: params.approval_required ?? true,
      approval_status: "pending",
      verification_code: randomVerificationCode(),
      raw_input: params.input,
      action_hash: hash,
      ...params.extras,
    };
    this.intents.set(id, record);
    this.addAudit(id, "intent_created", { action_hash: hash });
    return record;
  }

  getIntent(id: string) {
    return this.intents.get(id);
  }

  setApprovalStatus(id: string, status: ApprovalStatus) {
    const r = this.intents.get(id);
    if (!r) return null;
    r.approval_status = status;
    this.intents.set(id, r);
    this.addAudit(id, "approval_status", { status });
    return r;
  }

  attachApprovalToken(id: string, token: string, expiresAt: string) {
    const r = this.intents.get(id);
    if (!r) return null;
    r.approval_token = token;
    r.approval_token_expires_at = expiresAt;
    this.intents.set(id, r);
    this.addAudit(id, "approval_token_issued", { expires_at: expiresAt });
    return r;
  }

  pushExecutionAttempt(a: ExecutionAttempt) {
    this.executions.push(a);
    const prev = this.dashboard.execution ?? {};
    if (a.result === "allowed") {
      this.touchDashboard({
        execution: { ...prev, last_valid: a },
      });
    } else {
      this.touchDashboard({
        execution: { ...prev, last_tampered: a },
      });
    }
  }

  appendReceiptLine(line: string) {
    const receipts = [...(this.dashboard.receipts ?? [])];
    receipts.push(`${nowIso()} ${line}`);
    this.touchDashboard({ receipts });
  }

  /** True if this webhook delivery id was already handled (idempotent ACK). */
  isWebhookDuplicate(id: string, ttlMs = 86_400_000): boolean {
    if (!id.trim()) return false;
    const prev = this.webhookSeen.get(id);
    return !!prev && Date.now() - prev < ttlMs;
  }

  recordWebhook(id: string) {
    if (id.trim()) this.webhookSeen.set(id, Date.now());
  }
}

export function getStore(): AgentOGMemoryStore {
  if (!globalForStore.__agentog) {
    globalForStore.__agentog = new AgentOGMemoryStore();
  }
  return globalForStore.__agentog;
}
