# AgentOG

## Description

AgentOG is a human approval and execution-control layer for high-impact AI agent actions.

It sits between AI agents and real-world systems like payments, bookings, forms, APIs, and external workflows. Before an agent executes an action, AgentOG creates an action fingerprint, gets human approval, issues a short-lived action-bound token, and blocks execution if the final payload changes.

## Project Vercel Link

**Production demo:** [https://agent-og.vercel.app](https://agent-og.vercel.app)

---

## Core Idea

Normal MFA verifies the user.  
AgentOG verifies the exact AI agent action.

Instead of asking, “Do you approve this agent?”, AgentOG asks:

> Do you approve this exact action, with this vendor, amount, data, and conditions?

If the agent changes the price, vendor, timing, sensitive data, or execution payload after approval, AgentOG blocks it.

---

## How It Works

```text
User / Web / AI Agent
        ↓
Agent proposes action
        ↓
AgentOG creates action fingerprint
        ↓
Human approves exact action
        ↓
Short-lived token issued
        ↓
Execution gate verifies final payload
       ↙   ↘
 Allowed   Blocked
    ↓        ↓
Payment /  Tampered payload rejected
Booking /
Forms
        ↓
Audit receipt
```

---

## Demo Flow

For the demo, AgentOG uses a ride-booking scenario to show the general framework.

```text
User calls AgentPhone
        ↓
AgentOG receives voice webhook
        ↓
Request is parsed into structured action
        ↓
Browser Use / seeded flow selects an option
        ↓
AgentOG creates action fingerprint
        ↓
AgentMail sends approval link
        ↓
AgentPhone calls guardian
        ↓
Human approves exact action
        ↓
AgentOG issues short-lived token (fingerprint gate clears on approve)
        ↓
Valid execution allowed
        ↓
Tampered execution blocked
        ↓
Stripe sandbox opens only after approval
        ↓
AgentMail sends audit receipt
```

The ride-booking flow is only the example. AgentOG is built for any high-impact AI action.

---

## Use Cases

- Agent commerce
- Payments and procurement
- Booking and scheduling
- Form submission
- Healthcare and caregiving workflows
- Accessibility support
- Refund negotiation
- External email actions
- API execution
- Sensitive data sharing

---

## Sponsored Tools Used

### AgentPhone

Used for voice request intake and guardian approval calls.

### Browser Use

Used for browser automation and option selection.

### AgentMail

Used for approval links and audit receipts.

### Stripe Sandbox

Used for simulated payment execution after AgentOG approval.

### Gemini / Gemma

Used for parsing natural language requests into structured actions and classifying high-impact actions.

### Moss

Used for real-time policy and context retrieval.

### Supermemory

Used for long-term user preferences, approval rules, and guardian context.

---

## What Makes AgentOG Different

Payment tools help agents pay.  
Browser tools help agents act.  
Email and voice tools help agents communicate.

AgentOG decides whether the agent is allowed to execute.

The core value is action-bound approval: human approval is tied to the exact payload, and execution is blocked if the payload changes.

---

## Hackathon Scope

This project demonstrates:

- Voice-based agent request
- Structured action creation
- Action fingerprinting
- Human approval flow
- Short-lived execution token
- Execution verification
- Tampered payload blocking
- Stripe sandbox execution
- Audit receipt generation

---

## One-Line Pitch

AgentOG is transaction signing for AI agents: before an AI agent spends money, books a service, submits a form, or shares sensitive data, AgentOG verifies human approval and blocks execution if the final action changes.
