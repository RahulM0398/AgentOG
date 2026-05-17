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
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(params.amountUsd * 100),
          product_data: {
            name: `${params.vendor} — AgentOG approved ride`,
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

  return { simulated: false as const, url: session.url, id: session.id };
}
