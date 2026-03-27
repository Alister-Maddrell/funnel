import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const SITE_URL = process.env.SITE_URL || "https://maddrelldesign.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: "Website Design Package",
              description:
                "Custom-designed website for local businesses in Sydney. Hand-coded, mobile-first, live in 10 days. $1,999 all-in — $999 deposit to start.",
            },
            unit_amount: 99900,
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/success`,
      cancel_url: `${SITE_URL}/#pricing`,
    });

    // Redirect to Stripe Checkout
    res.redirect(303, session.url!);
  } catch (err: any) {
    console.error("Checkout session error:", err.message, err.type, err.statusCode);
    res.status(500).json({ error: err.message });
  }
}
