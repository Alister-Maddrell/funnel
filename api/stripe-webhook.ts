import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const resendApiKey = process.env.RESEND_API_KEY!;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;

const TALLY_FORM_URL = "https://tally.so/r/pbGZdZ";
const SITE_URL = "https://maddrelldesign.com";
const CAL_URL = "https://cal.com/alister-maddrell-rmtqo9/15-min-discovery-call";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"] as string;
  const rawBody = await getRawBody(req);

  // Verify webhook signature manually (no SDK needed)
  if (!verifyStripeSignature(rawBody, sig, endpointSecret)) {
    console.error("Webhook signature verification failed");
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(rawBody);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name?.split(" ")[0] || "there";

    if (customerEmail) {
      try {
        await sendConfirmationEmail(customerEmail, customerName);
        console.log(`Confirmation email sent to ${customerEmail}`);
      } catch (err: any) {
        console.error("Failed to send email:", err.message);
      }
    }
  }

  return res.status(200).json({ received: true });
}

function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  const parts = header.split(",").reduce((acc: Record<string, string>, part) => {
    const [key, val] = part.split("=");
    acc[key] = val;
    return acc;
  }, {});

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function sendConfirmationEmail(email: string, name: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Ster Maddrell <hello@maddrelldesign.com>",
      to: email,
      subject: "You're in — let's build your website",
      html: buildEmailHtml(name),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error: ${response.status} ${errorBody}`);
  }
}

function buildEmailHtml(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 16px;">

    <!-- Header -->
    <div style="background: #000; border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
      <p style="margin: 0; font-size: 14px; letter-spacing: 0.5px; color: rgba(255,255,255,0.5); text-transform: uppercase;">Maddrell Design</p>
      <h1 style="margin: 16px 0 0; font-size: 28px; font-weight: 800; color: #fff; line-height: 1.3;">You're in, ${name}.</h1>
    </div>

    <!-- Body -->
    <div style="background: #fff; padding: 36px 32px; border-left: 1px solid #e5e5e5; border-right: 1px solid #e5e5e5;">
      <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.7;">
        Your deposit has been received and your project is officially locked in. I'll be in touch within 48 hours to kick things off.
      </p>

      <p style="margin: 0 0 28px; font-size: 16px; color: #333; line-height: 1.7;">
        In the meantime, there's one thing I need from you — a quick form about your business. The more you share, the better your site will be. But don't stress — even just your business name is enough to get started.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${TALLY_FORM_URL}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 16px 40px; border-radius: 999px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px;">Fill in the form</a>
      </div>

      <!-- Timeline -->
      <div style="background: #fafafa; border-radius: 12px; padding: 24px; margin: 28px 0 0;">
        <p style="margin: 0 0 16px; font-size: 13px; font-weight: 700; color: #000; text-transform: uppercase; letter-spacing: 0.5px;">What happens next</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 12px 8px 0; vertical-align: top; width: 24px; font-size: 14px; font-weight: 700; color: #000;">1.</td>
            <td style="padding: 8px 0; font-size: 14px; color: #555; line-height: 1.5;">You fill in the form (takes 5–10 min)</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px 8px 0; vertical-align: top; width: 24px; font-size: 14px; font-weight: 700; color: #000;">2.</td>
            <td style="padding: 8px 0; font-size: 14px; color: #555; line-height: 1.5;">I design your layout and send a wireframe for approval</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px 8px 0; vertical-align: top; width: 24px; font-size: 14px; font-weight: 700; color: #000;">3.</td>
            <td style="padding: 8px 0; font-size: 14px; color: #555; line-height: 1.5;">I build and you get a live preview link to check</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px 8px 0; vertical-align: top; width: 24px; font-size: 14px; font-weight: 700; color: #000;">4.</td>
            <td style="padding: 8px 0; font-size: 14px; color: #555; line-height: 1.5;">Your site goes live — customers start finding you</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #fafafa; border-radius: 0 0 16px 16px; padding: 24px 32px; border: 1px solid #e5e5e5; border-top: none; text-align: center;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #555;">
        Got questions? <a href="${CAL_URL}" style="color: #000; font-weight: 600; text-decoration: underline;">Book a free 15-min call</a>
      </p>
      <p style="margin: 0; font-size: 13px; color: #999;">
        Ster Maddrell · Web Designer · Sydney<br />
        <a href="mailto:alistermaddrell@gmail.com" style="color: #999;">alistermaddrell@gmail.com</a>
      </p>
    </div>

  </div>
</body>
</html>`;
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
