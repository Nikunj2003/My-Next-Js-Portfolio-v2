import { z } from "zod";

export const CONTACT_REASONS = ["Hiring", "Collaboration", "Open Source", "Other"] as const;

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
