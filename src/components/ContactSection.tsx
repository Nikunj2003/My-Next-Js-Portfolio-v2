"use client";
import { RoleFitAsk } from "@/components/ai/RoleFitAsk";
import Image from "next/image";
import { useRef, useState } from "react";
import { Send, Download, Briefcase, Users, GitPullRequest, MessageSquare } from "lucide-react";
import { personalInfo } from "@/data/portfolio";
import { toast } from "@/components/ui/sonner";
import {
  CONTACT_CLIENT_TIMEOUT_MS,
  CONTACT_HONEYPOT_FIELD,
  CONTACT_REASONS,
  contactSchema,
  type ContactFormData,
} from "@/lib/contact";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import cardImage from "@/assets/card.png";
import { SOCIAL_LINKS } from "@/data/site-links";

/**
 * One icon per contact reason.
 *
 * Keyed off CONTACT_REASONS so adding a reason surfaces here as a type error
 * rather than silently rendering without an icon.
 */
const REASON_ICONS: Record<(typeof CONTACT_REASONS)[number], React.ElementType> = {
  Hiring: Briefcase,
  Collaboration: Users,
  "Open Source": GitPullRequest,
  Other: MessageSquare,
};

const INITIAL_FORM: ContactFormData = {
  name: "",
  email: "",
  reason: CONTACT_REASONS[0],
  message: "",
};

type ContactField = keyof ContactFormData;
type ContactErrors = Partial<Record<ContactField, string>>;

const ContactSection = () => {
  const [form, setForm] = useState<ContactFormData>(INITIAL_FORM);
  const [honeypot, setHoneypot] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [errors, setErrors] = useState<ContactErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State updates are async, so a fast second submit could slip past isSubmitting.
  const inFlightRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlightRef.current) return;

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors = parsed.error.issues.reduce<ContactErrors>((acc, issue) => {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in acc)) {
          acc[field as ContactField] = issue.message;
        }
        return acc;
      }, {});

      setErrors(nextErrors);
      toast.error("Please review the form", {
        description: parsed.error.issues[0]?.message || "Check the highlighted fields and try again.",
      });
      return;
    }

    setErrors({});

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CONTACT_CLIENT_TIMEOUT_MS);

    inFlightRef.current = true;
    try {
      setIsSubmitting(true);

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...parsed.data,
          startedAt,
          [CONTACT_HONEYPOT_FIELD]: honeypot,
        }),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error || "Unable to send your message right now.");
      }

      setForm(INITIAL_FORM);
      setHoneypot("");
      setStartedAt(Date.now());
      setErrors({});
      toast.success("Message sent", {
        description: "Thanks for reaching out. I will get back to you soon.",
      });
    } catch (error) {
      toast.error("Unable to send your message", {
        description:
          error instanceof DOMException && error.name === "AbortError"
            ? "The request took too long. Please try again."
            : error instanceof Error
              ? error.message
              : "Unable to send your message right now.",
      });
    } finally {
      window.clearTimeout(timeoutId);
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    // Shorter top padding than other sections: from the navbar's Contact link
    // the heading and both panels fit one screen from 720px tall up.
    <section id="contact" className="relative z-10 pb-20 pt-[clamp(1.5rem,4svh,2.5rem)] md:pb-28 lg:pb-32">
      <div className="container-narrow">

        {/* Heading: the panels below carry the detail, so it stays one line. */}
        <h2 className="heading-xl mb-[clamp(1rem,2.5svh,1.5rem)] text-center">
          Get in <span className="text-gradient">Touch</span>
        </h2>

        {/* Mobile-only card (the pointer tilt it had never ran on touch screens). */}
        <div className="mx-auto mb-10 block w-full max-w-xs sm:max-w-sm lg:hidden">
            <Image
              src={cardImage}
              alt=""
              aria-hidden="true"
              className="w-full h-auto rounded-3xl border border-foreground/10 shadow-accent-strong pointer-events-none select-none"
              draggable={false}
              sizes="(min-width: 640px) 384px, 100vw"
            />
        </div>

        {/* Two equal panels with Spotlight */}
        <div data-guide-spot="contact" className="grid items-stretch gap-6 lg:grid-cols-2">

          {/* Left panel */}
          <SpotlightCard className="h-full">
            <div className="contact-panel flex h-full flex-col p-6">
              <div>
                <h3 className="heading-lg mb-2">Let&apos;s Build Something</h3>
                <p className="text-[0.9375rem] leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
                  {personalInfo.focus}
                </p>
              </div>

              {/* Contact links, one compact row (the full address is the tooltip) */}
              <ul className="grid grid-cols-3 gap-2">
                {SOCIAL_LINKS.map(({ icon: Icon, label, value, href }) => (
                  <li key={label} className="min-w-0">
                    <a
                      href={href}
                      target={href.startsWith("mailto") ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      title={value}
                      aria-label={`${label}: ${value}`}
                      className="group flex min-h-12 items-center justify-center gap-2 rounded-xl border border-foreground/[0.08] px-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                        <Icon className="h-4 w-4 text-primary-text" aria-hidden="true" />
                      </span>
                      <span className="hidden min-[380px]:inline">{label}</span>
                    </a>
                  </li>
                ))}
              </ul>

              <RoleFitAsk />

              {/* Pinned to bottom */}
              <div className="mt-auto flex flex-col gap-2.5">
                <a href={personalInfo.resumeUrl} download className="btn-cta-primary w-full">
                  <Download aria-hidden="true" />
                  Download resume
                </a>
                <p className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary motion-safe:animate-pulse" />
                  Available for new opportunities
                </p>
              </div>
            </div>
          </SpotlightCard>

          {/* Right panel — Form */}
          <SpotlightCard className="h-full">
            <form data-guide-target="contact-form" onSubmit={handleSubmit} className="contact-panel relative flex h-full flex-col p-6" aria-busy={isSubmitting} noValidate>
              <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name={CONTACT_HONEYPOT_FIELD}
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                />
              </div>

              {/* Grows to fill */}
              <div className="contact-stack flex flex-1 flex-col">
                <div>
                  <h3 className="heading-lg mb-2">Send a Message</h3>
                  <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
                    Share the role, team, problem space, or product idea and I&apos;ll reply with context that&apos;s actually useful.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="text-xs font-mono font-medium text-foreground/70 mb-2 block uppercase tracking-wider">Name</label>
                    <input
                      id="contact-name"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      disabled={isSubmitting}
                      value={form.name}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value });
                        if (errors.name) {
                          setErrors((current) => ({ ...current, name: undefined }));
                        }
                      }}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "contact-name-error" : undefined}
                      className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
                      placeholder="Your name"
                    />
                    {errors.name && (
                      <p id="contact-name-error" className="mt-2 text-sm text-destructive">
                        {errors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="text-xs font-mono font-medium text-foreground/70 mb-2 block uppercase tracking-wider">Email</label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      maxLength={120}
                      autoComplete="email"
                      disabled={isSubmitting}
                      value={form.email}
                      onChange={(e) => {
                        setForm({ ...form, email: e.target.value });
                        if (errors.email) {
                          setErrors((current) => ({ ...current, email: undefined }));
                        }
                      }}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "contact-email-error" : undefined}
                      className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
                      placeholder="you@company.com"
                    />
                    {errors.email && (
                      <p id="contact-email-error" className="mt-2 text-sm text-destructive">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-reason" className="text-xs font-mono font-medium text-foreground/70 mb-2 block uppercase tracking-wider">Reason</label>
                  {/*
                    Radix Select rather than a native <select>: the OS renders a
                    native dropdown's option list itself, so it cannot be themed
                    and appeared as a plain grey system menu against the rest of
                    the portfolio. This one is real markup, so it follows the
                    site's glass and accent language.
                  */}
                  <Select
                    value={form.reason}
                    disabled={isSubmitting}
                    onValueChange={(value) => {
                      setForm({ ...form, reason: value as ContactFormData["reason"] });
                      if (errors.reason) {
                        setErrors((current) => ({ ...current, reason: undefined }));
                      }
                    }}
                  >
                    <SelectTrigger
                      id="contact-reason"
                      aria-invalid={Boolean(errors.reason)}
                      aria-describedby={errors.reason ? "contact-reason-error" : undefined}
                    >
                      {/*
                        Explicit content rather than <SelectValue/>: Radix mirrors
                        the selected item's children into the trigger, which would
                        drag the icon tile and hint line in with it. The collapsed
                        trigger shows the icon at label scale and the label only.
                      */}
                      <span className="flex min-w-0 items-center gap-2.5">
                        {(() => {
                          const ReasonIcon = REASON_ICONS[form.reason];
                          return <ReasonIcon className="h-4 w-4 shrink-0 text-primary-text" />;
                        })()}
                        <span className="truncate">{form.reason}</span>
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_REASONS.map((r) => (
                        <SelectItem key={r} value={r} icon={REASON_ICONS[r]}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.reason && (
                    <p id="contact-reason-error" className="mt-2 text-sm text-destructive">
                      {errors.reason}
                    </p>
                  )}
                </div>

                <div className="flex flex-1 flex-col">
                  <label htmlFor="contact-message" className="text-xs font-mono font-medium text-foreground/70 mb-2 block uppercase tracking-wider">Message</label>
                  <textarea
                    id="contact-message"
                    required
                    minLength={10}
                    maxLength={2000}
                    disabled={isSubmitting}
                    value={form.message}
                    onChange={(e) => {
                      setForm({ ...form, message: e.target.value });
                      if (errors.message) {
                        setErrors((current) => ({ ...current, message: undefined }));
                      }
                    }}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? "contact-message-error" : undefined}
                    rows={4}
                    className="min-h-[clamp(5rem,11svh,7.5rem)] w-full flex-1 resize-none rounded-xl border border-black/10 bg-black/5 px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5"
                    placeholder="Tell me about the opportunity or idea..."
                  />
                  {errors.message && (
                    <p id="contact-message-error" className="mt-2 text-sm text-destructive">
                      {errors.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Pinned to bottom */}
              <div className="mt-auto flex flex-col gap-2.5">
                <button type="submit" disabled={isSubmitting} className="btn-cta-secondary w-full disabled:cursor-not-allowed disabled:opacity-60">
                  <Send aria-hidden="true" />
                  {isSubmitting ? "Sending..." : "Send message"}
                </button>
                <p className="text-center text-[11px] font-medium text-muted-foreground/70">
                  Messages are sent securely to {personalInfo.email} with your email set as the reply-to.
                </p>
              </div>
            </form>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
