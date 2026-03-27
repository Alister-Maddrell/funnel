import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const resendApiKey = process.env.RESEND_API_KEY!;

// TODO: Replace pbGZdZ with your actual Tally form ID
const TALLY_FORM_URL = "https://tally.so/r/pbGZdZ";
const SITE_URL = process.env.SITE_URL || "https://your-funnel-site.vercel.app";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name;

    if (customerEmail) {
      try {
        await sendConfirmationEmail(customerEmail, customerName || "there");
        console.log(`Confirmation email sent to ${customerEmail}`);
      } catch (err: any) {
        console.error("Failed to send email:", err.message);
      }
    }
  }

  return res.status(200).json({ received: true });
}

async function sendConfirmationEmail(email: string, name: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Ster Maddrell <onboarding@resend.dev>",
      to: email,
      subject: "You're in! Let's build your website",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 28px; font-weight: 800; color: #111; margin: 0 0 16px;">Hey ${name} 👋</h1>
          <p style="font-size: 16px; color: #666; line-height: 1.6; margin: 0 0 24px;">
            Your deposit has been received — we're officially underway.
          </p>
          <p style="font-size: 16px; color: #666; line-height: 1.6; margin: 0 0 24px;">
            To get started, fill in this quick form so I know the basics about your business:
          </p>
          <a href="${TALLY_FORM_URL}" style="display: inline-block; background: #00B67A; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: 600; font-size: 16px;">
            Fill in the form →
          </a>
          <p style="font-size: 14px; color: #999; line-height: 1.6; margin: 32px 0 0;">
            Or if you'd prefer, you can also fill it in on the <a href="${SITE_URL}/success" style="color: #111;">confirmation page</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 13px; color: #999;">
            Ster Maddrell · Web Designer · Sydney<br />
            alistermaddrell@gmail.com
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error: ${response.status} ${errorBody}`);
  }
}

function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
