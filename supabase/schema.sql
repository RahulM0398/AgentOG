-- Optional Supabase schema for durable AgentOG state (not wired in hackathon build — memory store default).

create table if not exists user_policies (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  max_amount numeric,
  approval_required_over_amount numeric,
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  blocked_data_fields jsonb,
  required_conditions jsonb,
  created_at timestamptz default now()
);

create table if not exists action_intents (
  id text primary key,
  user_id text,
  agent_id text,
  action_type text,
  domain text,
  vendor text,
  amount numeric,
  currency text,
  action_payload_json jsonb,
  action_hash text,
  risk_level text,
  approval_required boolean,
  approval_status text,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  intent_id text references action_intents (id),
  approver_name text,
  approver_channel text,
  verification_code text,
  approval_token_hash text,
  status text,
  approved_at timestamptz
);

create table if not exists execution_attempts (
  id uuid primary key default gen_random_uuid(),
  intent_id text references action_intents (id),
  final_payload_json jsonb,
  final_action_hash text,
  result text,
  block_reason text,
  created_at timestamptz default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  intent_id text,
  event_type text,
  event_details jsonb,
  created_at timestamptz default now()
);
