import Stripe from "stripe";
import { getBaseUrl, stripeSimulated } from "./env";

export async function createRideCheckoutSession(params: {
  intentId: string;
  vendor: string;
  amountUsd: number;
}) {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const base = getBaseUrl();

  if (stripeSimulated() || !secret) {
    return {
      simulated: true as const,
      url: `${base}/checkout/success?intent_id=${encodeURIComponent(params.intentId)}&simulated=1`,
    };
  }

  const stripe = new Stripe(secret);
  const cents = Math.round(params.amountUsd * 100);
  if (!Number.isFinite(cents) || cents < 50) {
    return {
      error: "invalid_amount" as const,
      message: "Amount must be at least $0.50 USD for Stripe Checkout.",
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: cents,
            product_data: {
              name: `${params.vendor} — AgentOG approved action`,
            },
          },
        },
      ],
      success_url: `${base}/checkout/success?intent_id=${encodeURIComponent(params.intentId)}`,
      cancel_url: `${base}/checkout/cancel?intent_id=${encodeURIComponent(params.intentId)}`,
      metadata: {
        intent_id: params.intentId,
      },
    });

    if (!session.url) {
      return {
        error: "checkout_unavailable" as const,
        message: "Stripe did not return a checkout URL.",
      };
    }

    return { simulated: false as const, url: session.url, id: session.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      error: "stripe_error" as const,
      message: msg,
    };
  }
}
