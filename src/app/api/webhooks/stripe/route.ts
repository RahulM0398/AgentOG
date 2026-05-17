import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStore } from "@/lib/agentog-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const store = getStore();
  const intentId =
    event.type === "checkout.session.completed"
      ? ((event.data.object as Stripe.Checkout.Session).metadata?.intent_id ??
        undefined)
      : undefined;

  store.addAudit(intentId ?? "unknown", "stripe_webhook", {
    type: event.type,
    id: event.id,
  });

  return NextResponse.json({ received: true });
}
