# AgentOG Hackathon Build Version

This document is the **standard vision and build specification** for AgentOG. Implementation details will follow in separate instructions.

---

## What we are building

**AgentOG is a general-purpose human approval and execution-control framework for AI agents.** When an AI agent wants to perform a high-impact action such as booking a service, making a purchase, submitting a form, sending sensitive data, or completing a transaction, AgentOG creates an **action fingerprint**, asks a trusted human to approve the exact action, issues a short-lived approval token, and blocks execution if the final action changes.

The ride-booking flow is only the live demo:

> “Book a cab from 560 20th Street to Ghirardelli Square after 5 PM, under $50, with wheelchair assistance.”

But the same AgentOG framework can support:

- ride booking
- pharmacy pickup
- SaaS purchase
- appointment scheduling
- form submission
- refund negotiation
- enterprise procurement
- healthcare/caregiving workflows

The key demo point stays:

> **Normal MFA verifies the user. AgentOG verifies the exact AI agent action the user approved.**

AgentOG should be an action-bound verification layer, not just a static approval page.

---

## Core demo flow

```text
User voice request
        ↓
AgentPhone voice agent
        ↓
Gemini / Gemma 4 task planner
        ↓
Gemma lightweight policy classifier
        ↓
Browser Use researches ride options
        ↓
Moss retrieves relevant user rules in real time
        ↓
Supermemory stores long-term user preferences
        ↓
Agent OG API creates action intent + fingerprint
        ↓
AgentMail sends approval card
        ↓
AgentPhone calls/SMS human approver
        ↓
Human approves exact action
        ↓
Agent OG issues short-lived approval token
        ↓
Execution gate verifies final payload
        ↓
Simulated booking / Stripe sandbox checkout
        ↓
Audit receipt sent through AgentMail
```

**Integration references (for builders):**

- **AgentPhone** — phone numbers for SMS, calls, voice, webhooks: [docs.agentphone.ai](https://docs.agentphone.ai/welcome)
- **Browser Use** — AI browser automation: [docs.browser-use.com](https://docs.browser-use.com/cloud/quickstart)
- **AgentMail** — API-controlled inboxes for agent email: [agentmail.to](https://www.agentmail.to/)

---

## What makes this general-purpose

Do **not** hardcode “ride booking” into AgentOG.

Instead, build a generic action schema.

```json
{
  "action_type": "book_service | purchase_item | submit_form | send_message | schedule_appointment | negotiate_refund",
  "actor": {
    "agent_id": "agent_001",
    "user_id": "user_001"
  },
  "target": {
    "vendor": "MockRide Assist",
    "service_or_item": "Wheelchair-assisted ride"
  },
  "constraints": {
    "max_amount": 50,
    "currency": "USD",
    "time_window": "after 5 PM",
    "required_conditions": ["wheelchair_assistance"]
  },
  "data_shared": [
    "name",
    "phone",
    "pickup_location",
    "dropoff_location",
    "accessibility_need"
  ],
  "data_blocked": [
    "medical_condition",
    "diagnosis",
    "ssn",
    "payment_card"
  ],
  "execution_payload": {
    "amount": 42,
    "pickup": "560 20th Street, San Francisco",
    "dropoff": "Ghirardelli Square, San Francisco",
    "scheduled_time": "5:20 PM"
  }
}
```

For the hackathon, the ride demo uses this schema. Tomorrow, the same schema can represent:

```text
purchase SaaS subscription
submit healthcare intake form
book doctor appointment
order pharmacy refill
accept refund offer
send vendor email
```

That is how you keep the product general-purpose while still having a focused demo.

---

## Live demo scenario

### User calls AgentOG

The user calls the AgentPhone number and says:

> “Book a cab from 560 20th Street to Ghirardelli Square after 5 PM. Keep it under $50 and make sure wheelchair assistance is available.”

AgentPhone sends the call transcript to your backend webhook.

```json
{
  "channel": "voice",
  "caller": "+1-user-phone",
  "transcript": "Book a cab from 560 20th Street to Ghirardelli Square after 5 PM. Keep it under $50 and make sure wheelchair assistance is available."
}
```

---

## Step 1: Gemini / Gemma task planner

Use Gemini/Gemma to convert the voice request into a structured task. Google’s Gemma-on-Gemini API docs list hosted Gemma 4 models such as `gemma-4-31b-it` and `gemma-4-26b-a4b-it` for fast prototyping: [Google AI for Developers — Gemma on Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api)

**Output:**

```json
{
  "task_type": "book_service",
  "domain": "transportation",
  "pickup": "560 20th Street, San Francisco",
  "dropoff": "Ghirardelli Square, San Francisco",
  "time_constraint": "after 5 PM",
  "budget": 50,
  "special_requirement": "wheelchair assistance",
  "requires_payment": true,
  "requires_location_data": true
}
```

---

## Step 2: Gemma lightweight policy classifier

Gemma classifies whether this is a high-impact action.

```json
{
  "high_impact_action": true,
  "approval_required": true,
  "risk_level": "medium",
  "reason": "The agent is booking transportation, spending money, sharing location data, and using accessibility-related information.",
  "sensitive_fields": [
    "pickup_location",
    "dropoff_location",
    "accessibility_need"
  ]
}
```

AgentOG should **not** ask for approval on every tiny action. It should focus on **high-impact actions**.

**High-impact examples:**

```text
spending money
booking a service
sharing sensitive data
submitting a form
changing account settings
accepting a financial offer
sending external communication
performing an irreversible action
```

---

## Step 3: Moss retrieves live user rules

Use Moss to retrieve the relevant policy rules during the voice flow. Moss: real-time semantic search for conversational AI and voice agents: [moss.dev](https://www.moss.dev/)

**Retrieved rules:**

```json
{
  "approval_required_over_amount": 25,
  "transport_budget_limit": 50,
  "accessibility_required_for_transport": true,
  "guardian_approval_required": true,
  "blocked_data_fields": [
    "medical_condition",
    "diagnosis",
    "ssn",
    "insurance_number",
    "payment_card"
  ]
}
```

Use Moss as the **fast live retrieval layer**.

---

## Step 4: Supermemory stores long-term preferences

Use Supermemory for durable user profile and historical preferences: [supermemory.ai docs](https://supermemory.ai/docs/intro)

**Stored user profile:**

```json
{
  "user_id": "user_001",
  "guardian_name": "Rahul",
  "guardian_phone": "+1-guardian-phone",
  "guardian_email": "guardian@example.com",
  "default_transport_budget": 50,
  "accessibility_preference": "wheelchair assistance required",
  "approval_mode": "voice_and_email",
  "blocked_data_fields": [
    "medical_condition",
    "diagnosis",
    "ssn",
    "insurance_number"
  ]
}
```

**Judge-friendly explanation:**

```text
Supermemory stores the user's long-term preferences.
Moss retrieves the right rules fast during the live voice interaction.
```

---

## Step 5: Browser Use researches options

Browser Use researches ride options. For the hackathon, do not depend on Uber/Lyft or real providers. Build a controlled mock provider page and let Browser Use navigate it.

**Mock page:** `/rides`

**Option 1:** Vendor: MockRide Assist — Price: $42 — Wheelchair assistance: Yes — Available: 5:20 PM  
**Option 2:** Vendor: CityCare Ride — Price: $48 — Wheelchair assistance: Yes — Available: 5:45 PM  
**Option 3:** Vendor: QuickCab — Price: $35 — Wheelchair assistance: No — Available: 5:10 PM  
**Option 4:** Vendor: PremiumAssist — Price: $67 — Wheelchair assistance: Yes — Available: 5:15 PM  

**Browser Use selects:**

```json
{
  "selected_vendor": "MockRide Assist",
  "amount": 42,
  "available_time": "5:20 PM",
  "wheelchair_assistance": true,
  "reason": "Lowest valid option under $50 with wheelchair assistance after 5 PM."
}
```

The mock page keeps the demo reliable while still proving the browser-agent workflow.

---

## Step 6: AgentOG creates action intent and fingerprint

AgentOG receives the prepared action.

```json
{
  "action_type": "book_service",
  "domain": "transportation",
  "vendor": "MockRide Assist",
  "amount": 42,
  "currency": "USD",
  "pickup": "560 20th Street, San Francisco",
  "dropoff": "Ghirardelli Square, San Francisco",
  "scheduled_time": "5:20 PM",
  "required_conditions": [
    "wheelchair_assistance"
  ],
  "data_shared": [
    "name",
    "phone",
    "pickup_location",
    "dropoff_location",
    "accessibility_need"
  ],
  "data_blocked": [
    "medical_condition",
    "diagnosis",
    "ssn",
    "insurance_number",
    "payment_card"
  ]
}
```

AgentOG creates:

```json
{
  "intent_id": "intent_123",
  "action_hash": "sha256_abc123",
  "risk_level": "medium",
  "approval_required": true,
  "approval_url": "https://agentog.app/approve/intent_123"
}
```

This is the core product.

---

## Step 7: AgentMail sends approval card

AgentMail sends the human approver an approval card.

```text
Subject: AgentOG Approval Required

Your AI agent wants to complete a high-impact action.

Action: Book wheelchair-assisted ride
Vendor: MockRide Assist
Amount: $42
Pickup: 560 20th Street, San Francisco
Dropoff: Ghirardelli Square, San Francisco
Time: 5:20 PM
Required condition: Wheelchair assistance
Risk: Medium

Data shared:
- Name
- Phone
- Pickup location
- Dropoff location
- Accessibility need

Data blocked:
- Medical condition
- Diagnosis
- SSN
- Insurance number
- Payment card

Approve exact action:
[Approval Link]
```

**Buttons:**

- Approve Exact Action
- Reject
- Ask Agent to Revise

Use **Approve Exact Action** — that is the product wording.

---

## Step 8: AgentPhone calls/SMS human approver

AgentPhone calls or texts the guardian.

**Voice script:**

> “AgentOG approval request. Your AI agent wants to book a wheelchair-assisted ride from 560 20th Street to Ghirardelli Square at 5:20 PM for $42 with MockRide Assist. This is under the $50 limit. It will share name, phone, pickup location, dropoff location, and accessibility need. Say ‘approve 4829,’ ‘reject,’ or ‘revise.’”

The 4-digit code feels like MFA, but the approval is tied to the **action payload**, not just identity.

---

## Step 9: Human approves exact action

After approval, AgentOG issues a short-lived approval token.

```json
{
  "approval_token": "signed_token_abc",
  "intent_id": "intent_123",
  "approved_action_hash": "sha256_abc123",
  "approved_by": "guardian_001",
  "scope": "execute:book_service",
  "expires_in_minutes": 10
}
```

**Rule:** This token is valid only for the exact approved action hash.

---

## Step 10: Execution gate verifies final payload

Before checkout/booking, the agent must submit the final payload.

### Valid final payload

```json
{
  "intent_id": "intent_123",
  "approval_token": "signed_token_abc",
  "final_payload": {
    "action_type": "book_service",
    "vendor": "MockRide Assist",
    "amount": 42,
    "currency": "USD",
    "pickup": "560 20th Street, San Francisco",
    "dropoff": "Ghirardelli Square, San Francisco",
    "scheduled_time": "5:20 PM",
    "required_conditions": [
      "wheelchair_assistance"
    ],
    "data_shared": [
      "name",
      "phone",
      "pickup_location",
      "dropoff_location",
      "accessibility_need"
    ]
  }
}
```

AgentOG returns:

```json
{
  "status": "allowed",
  "reason": "Final payload matches approved action fingerprint."
}
```

### Tampered final payload

```json
{
  "intent_id": "intent_123",
  "approval_token": "signed_token_abc",
  "final_payload": {
    "action_type": "book_service",
    "vendor": "PremiumAssist",
    "amount": 67,
    "currency": "USD",
    "pickup": "560 20th Street, San Francisco",
    "dropoff": "Ghirardelli Square, San Francisco",
    "scheduled_time": "5:15 PM",
    "required_conditions": [],
    "data_shared": [
      "name",
      "phone",
      "pickup_location",
      "dropoff_location",
      "accessibility_need",
      "medical_condition"
    ]
  }
}
```

AgentOG returns:

```json
{
  "status": "blocked",
  "reason": "Final action does not match approved action. Vendor changed from MockRide Assist to PremiumAssist, amount changed from $42 to $67, wheelchair assistance was removed, and medical_condition was added."
}
```

This is the killer demo moment.

---

## Step 11: Simulated booking / Stripe sandbox checkout

Only after AgentOG allows execution should you send the user to simulated checkout or Stripe sandbox: [Stripe Sandboxes](https://docs.stripe.com/sandboxes)

**Flow:**

```text
Execution gate allowed
        ↓
Create simulated booking
        ↓
Create Stripe sandbox checkout for $42
        ↓
Return success page
        ↓
Send audit receipt
```

Do not pitch AgentOG as replacing Stripe. Stripe’s agentic commerce docs describe ACP as a standard for AI agents completing purchases: [Stripe Agentic Commerce Protocol](https://docs.stripe.com/agentic-commerce/acp)

**Positioning:**

> Stripe helps agents pay. AgentOG verifies whether the agent is allowed to execute.

---

## Step 12: Audit receipt through AgentMail

Send final audit receipt.

```text
Subject: AgentOG Action Receipt

Action completed:
Book wheelchair-assisted ride

Approved by:
Rahul

Approval channel:
Voice + Email

Approved action:
Vendor: MockRide Assist
Amount: $42
Pickup: 560 20th Street, San Francisco
Dropoff: Ghirardelli Square, San Francisco
Time: 5:20 PM
Required condition: Wheelchair assistance

Data shared:
Name, phone, pickup location, dropoff location, accessibility need

Data blocked:
Medical condition, diagnosis, SSN, insurance number, payment card

Execution result:
Allowed. Final payload matched approved action fingerprint.

Action hash:
sha256_abc123
```

**Blocked-action audit entry:**

```text
Blocked attempt:
PremiumAssist, $67, wheelchair assistance removed, medical_condition added.

Reason:
Final payload did not match approved action fingerprint.
```

---

## Build timeline (5 hours)

### Hour 1: Core app and generic action schema

```text
Next.js app
AgentOG dashboard
Generic action schema
Mock ride marketplace page
Scenario object for ride booking
```

Do not make the backend ride-specific. Use `action_type`, `constraints`, `data_shared`, and `execution_payload`.

### Hour 2: AgentOG security core

```text
POST /api/action-intents
POST /api/approve/:intent_id
POST /api/execute
GET /api/audit/:intent_id
```

**Core functions:**

```text
canonicalize payload
create SHA-256 action fingerprint
store approved action hash
generate short-lived approval token
verify final payload hash
allow/block execution
write audit log
```

This is the main product. Do this before integrations.

### Hour 3: Live voice intake + planner/classifier

```text
AgentPhone inbound call webhook
Gemini/Gemma task planner
Gemma high-impact action classifier
Moss policy retrieval
Supermemory preference retrieval
```

**Minimum working version:**

```text
Real call → transcript → structured JSON → approval required
```

### Hour 4: Approval experience

```text
AgentMail approval email
Approval card page
Approve Exact Action button
AgentPhone guardian call/SMS
Approval token issuance
```

The approval card must show:

```text
exact action
amount
vendor
required conditions
data shared
data blocked
risk level
verification code
```

### Hour 5: Execution, Stripe sandbox, and demo polish

```text
Browser Use research over mock ride page
Valid execution button
Tampered execution button
Stripe sandbox or simulated checkout
AgentMail audit receipt
Demo dashboard
```

The dashboard should show the full flow:

```text
Voice request received
Intent parsed
Policy matched
Browser options found
Action fingerprint created
Approval sent
Human approved
Execution allowed
Tampered execution blocked
Audit receipt sent
```

---

## Recommended demo dashboard

### Panel 1: Live Voice Request

```text
Caller transcript:
“Book a cab from 560 20th Street to Ghirardelli Square after 5 PM. Keep it under $50 and make sure wheelchair assistance is available.”
```

### Panel 2: Parsed Agent Intent

```json
{
  "task_type": "book_service",
  "domain": "transportation",
  "budget": 50,
  "requires_payment": true,
  "requires_location_data": true,
  "special_requirement": "wheelchair assistance"
}
```

### Panel 3: Policy Decision

```text
High-impact action: Yes
Reason: Payment + location + accessibility-related data
Approval required: Yes
Risk: Medium
```

### Panel 4: Browser Research

```text
MockRide Assist — $42 — wheelchair assistance — selected
CityCare Ride — $48 — wheelchair assistance — valid
QuickCab — $35 — no wheelchair assistance — rejected
PremiumAssist — $67 — over budget — rejected
```

### Panel 5: AgentOG Approval

```text
Action hash: sha256_abc123
Approval status: Approved
Approval channel: Voice + Email
Token: short-lived, action-bound
```

### Panel 6: Execution Gate

```text
Valid final payload: Allowed
Tampered final payload: Blocked
```

### Panel 7: Audit Receipt

```text
Receipt sent through AgentMail
```

---

## Final hackathon positioning

**Primary:**

> **AgentOG is a Human Approval Framework for high-impact AI agent actions. A user can call an AI agent and ask it to book, buy, submit, or send something, but before the agent executes, AgentOG creates an action fingerprint, gets human approval, and blocks execution if the final payload changes.**

**General-purpose:**

> **The ride-booking demo is just one example. The framework is general-purpose: the same approval layer can protect agentic purchases, healthcare forms, SaaS procurement, refund negotiation, appointment scheduling, and any action where an AI agent touches money, identity, location, or sensitive data.**

**Sharpest one-liner:**

> **Stripe helps agents pay. Browser Use helps agents act. AgentMail helps agents communicate. Supermemory and Moss help agents remember context. AgentOG decides whether the agent is allowed to execute.**

---

## Document purpose

- **Vision:** Action-bound human approval for high-impact agent actions; rides are the demo, not the product core.
- **Non-goals for schema:** Hardcoding ride-specific logic as the only supported path.
- **Implementation:** Follow subsequent task instructions; use this file as the north star for scope and messaging.
