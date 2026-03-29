import { NextResponse } from "next/server";
import { Resend } from "resend";
import { personalInfo } from "@/data/portfolio";
import { contactSchema } from "@/lib/contact";
import { checkRateLimit, getClientKey, getRateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";

const RATE_LIMIT = 5;
const WINDOW_MS = 10 * 60_000;
const RESEND_TIMEOUT_MS = 15_000;

const requestStore = new Map<string, { count: number; resetAt: number }>();

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error("Email request timed out.")), timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getRecipients(recipientList?: string) {
  const recipients = recipientList
    ?.split(/[;,]/)
    .map((value) => value.trim())
    .filter(Boolean);

  return recipients && recipients.length > 0 ? [...new Set(recipients)] : [personalInfo.email];
}

export async function POST(request: Request) {
  const rateLimitResult = checkRateLimit(requestStore, getClientKey(request), {
    limit: RATE_LIMIT,
    windowMs: WINDOW_MS,
  });
  const rateLimitHeaders = getRateLimitHeaders(RATE_LIMIT, rateLimitResult.remaining);

  if (rateLimitResult.limited) {
    return NextResponse.json(
      { error: "Too many contact requests. Please wait a few minutes before trying again." },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(rateLimitResult.retryAfter),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid contact form submission." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const sender = process.env.CONTACT_EMAIL_FROM?.trim();
    const recipients = getRecipients(process.env.CONTACT_EMAIL_TO);

    if (!apiKey || !sender) {
      return NextResponse.json(
        { error: "Contact email is not configured on the server yet." },
        { status: 503, headers: rateLimitHeaders }
      );
    }

    const resend = new Resend(apiKey);
    const { name, email, reason, message } = parsed.data;
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

    const { data, error } = await withTimeout(
      resend.emails.send({
        from: sender,
        to: recipients,
        replyTo: email,
        subject: `[Portfolio] ${reason} inquiry from ${name}`,
        text: [
          "New portfolio contact form submission",
          "",
          `Name: ${name}`,
          `Email: ${email}`,
          `Reason: ${reason}`,
          "",
          "Message:",
          message,
        ].join("\n"),
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 16px;">New portfolio contact form submission</h2>
            <p style="margin: 0 0 8px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p style="margin: 0 0 8px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p style="margin: 0 0 8px;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
            <p style="margin: 24px 0 8px;"><strong>Message:</strong></p>
            <div style="padding: 16px; border-radius: 12px; background: #f3f4f6;">${safeMessage}</div>
          </div>
        `,
        tags: [
          { name: "source", value: "portfolio_contact" },
          { name: "channel", value: "website" },
        ],
      }),
      RESEND_TIMEOUT_MS
    );

    if (error) {
      console.error("Resend contact email error:", error);

      return NextResponse.json(
        { error: "Something went wrong while sending your message. Please try again later." },
        { status: 502, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: "Message sent successfully.", id: data?.id },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    console.error("Contact form error:", error);

    return NextResponse.json(
      { error: "Something went wrong while sending your message. Please try again later." },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
