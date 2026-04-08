import { z } from "zod";

export const CONTACT_REASONS = ["Hiring", "Collaboration", "Open Source", "Other"] as const;
export const CONTACT_HONEYPOT_FIELD = "website";
export const CONTACT_MIN_FILL_MS = 1_500;
export const CONTACT_MAX_AGE_MS = 2 * 60 * 60_000;
export const CONTACT_REQUEST_TIMEOUT_MS = 15_000;
export const CONTACT_CLIENT_TIMEOUT_MS = 18_000;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80, "Name is too long."),
  email: z.string().trim().email("Please enter a valid email address.").max(120, "Email is too long."),
  reason: z.enum(CONTACT_REASONS),
  message: z
    .string()
    .trim()
    .min(10, "Please share a little more detail in your message.")
    .max(2000, "Message is too long."),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export const contactRequestSchema = contactSchema.extend({
  [CONTACT_HONEYPOT_FIELD]: z.string().trim().max(200).optional().default(""),
  startedAt: z.number().int().positive("Unable to validate the form timing."),
});

export type ContactRequestData = z.infer<typeof contactRequestSchema>;

type ContactSubmissionIssue =
  | { kind: "honeypot"; message: null }
  | { kind: "timing"; message: string }
  | { kind: "expired"; message: string };

export function getContactSubmissionIssue(
  data: Pick<ContactRequestData, typeof CONTACT_HONEYPOT_FIELD | "startedAt">,
  now = Date.now(),
): ContactSubmissionIssue | null {
  if (data.website.trim().length > 0) {
    return { kind: "honeypot", message: null };
  }

  const elapsed = now - data.startedAt;

  if (!Number.isFinite(elapsed)) {
    return {
      kind: "timing",
      message: "Please refresh the page and try again.",
    };
  }

  if (elapsed < CONTACT_MIN_FILL_MS) {
    return {
      kind: "timing",
      message: "Please take a moment to review your message and try again.",
    };
  }

  if (elapsed > CONTACT_MAX_AGE_MS) {
    return {
      kind: "expired",
      message: "This form expired. Please refresh the page and try again.",
    };
  }

  return null;
}
