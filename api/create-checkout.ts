import type { VercelRequest, VercelResponse } from "@vercel/node";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const SITE_URL = process.env.SITE_URL || "https://maddrelldesign.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        mode: "payment",
        "line_items[0][price_data][currency]": "aud",
        "line_items[0][price_data][product_data][name]": "Website Design Package",
        "line_items[0][price_data][product_data][description]":
          "Custom-designed website. Hand-coded, mobile-first, live in 10 days.",
        "line_items[0][price_data][unit_amount]": "99900",
        "line_items[0][quantity]": "1",
        success_url: `${SITE_URL}/success`,
        cancel_url: `${SITE_URL}/#pricing`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Stripe API error:", JSON.stringify(data));
      return res.status(response.status).json({ error: data.error?.message || "Stripe error" });
    }

    res.redirect(303, data.url);
  } catch (err: any) {
    console.error("Checkout error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
