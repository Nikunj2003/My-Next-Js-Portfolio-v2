import { NextResponse } from "next/server";
import { Resend } from "resend";
import { personalInfo } from "@/data/portfolio";
import { contactSchema } from "@/lib/contact";

export const runtime = "nodejs";

const RATE_LIMIT = 5;
const WINDOW_MS = 10 * 60_000;

const requestStore = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const firstIp = forwardedFor.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip") || "";
  const ip = firstIp || realIp || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return `${ip}-${userAgent}`;
}

function checkRateLimit(request: Request): {
  limited: boolean;
  remaining: number;
  retryAfter: number;
} {
  const clientKey = getClientKey(request);
  const now = Date.now();
  const entry = requestStore.get(clientKey);

  if (!entry || now >= entry.resetAt) {
    requestStore.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, remaining: RATE_LIMIT - 1, retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > RATE_LIMIT) {
    return {
      limited: true,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  return {
    limited: false,
    remaining: RATE_LIMIT - entry.count,
    retryAfter: 0,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  const rateLimitResult = checkRateLimit(request);
  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(RATE_LIMIT),
    "X-RateLimit-Remaining": String(rateLimitResult.remaining),
  };

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
    const recipient = process.env.CONTACT_EMAIL_TO?.trim() || personalInfo.email;

    if (!apiKey || !sender) {
      return NextResponse.json(
        { error: "Contact email is not configured on the server yet." },
        { status: 503, headers: rateLimitHeaders }
      );
    }

    const resend = new Resend(apiKey);
    const { name, email, reason, message } = parsed.data;
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

    const { data, error } = await resend.emails.send({
      from: sender,
      to: [recipient],
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
    });

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
