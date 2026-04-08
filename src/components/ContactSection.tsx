"use client";
import Image from "next/image";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Mail, Linkedin, Github, Send, Download, ArrowUpRight } from "lucide-react";
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
import Card3D from "./Card3D";
import cardImage from "@/assets/card.png";

const SOCIAL_LINKS = [
  {
    icon: Mail,
    label: "Email",
    value: personalInfo.email,
    href: `mailto:${personalInfo.email}`,
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    value: "nikunj-khitha",
    href: personalInfo.linkedin,
  },
  {
    icon: Github,
    label: "GitHub",
    value: "Nikunj2003",
    href: personalInfo.github,
  },
];

const INITIAL_FORM: ContactFormData = {
  name: "",
  email: "",
  reason: CONTACT_REASONS[0],
  message: "",
};

type ContactField = keyof ContactFormData;
type ContactErrors = Partial<Record<ContactField, string>>;

const ContactSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [form, setForm] = useState<ContactFormData>(INITIAL_FORM);
  const [honeypot, setHoneypot] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [errors, setErrors] = useState<ContactErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      toast.error(parsed.error.issues[0]?.message || "Please check the form and try again.");
      return;
    }

    setErrors({});

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CONTACT_CLIENT_TIMEOUT_MS);

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
      toast.success("Message sent. I will get back to you soon.");
    } catch (error) {
      toast.error(
        error instanceof DOMException && error.name === "AbortError"
          ? "The request took too long. Please try again."
          : error instanceof Error
            ? error.message
            : "Unable to send your message right now."
      );
    } finally {
      window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="section-padding relative z-10">
      <div className="container-narrow" ref={ref}>

        {/* Heading */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: shouldReduceMotion ? 0.2 : 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center px-3 py-1.5 rounded-full glass-subtle border border-primary/20 text-xs font-mono text-primary mb-6">
            Connect
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Get in <span className="text-gradient">Touch</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-base leading-relaxed">
            Open to new opportunities, collaborations, and interesting conversations.
          </p>
        </motion.div>

        {/* Mobile-only card */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: shouldReduceMotion ? 0.2 : 0.6, delay: shouldReduceMotion ? 0 : 0.05 }}
          className="block lg:hidden mb-10 mx-auto w-full max-w-xs sm:max-w-sm"
        >
          <Card3D>
            <Image
              src={cardImage}
              alt=""
              aria-hidden="true"
              className="w-full h-auto rounded-3xl border border-white/10 shadow-2xl pointer-events-none select-none"
              draggable={false}
              sizes="(min-width: 640px) 384px, 100vw"
            />
          </Card3D>
        </motion.div>

        {/* Two equal panels with Spotlight */}
        <div className="grid lg:grid-cols-2 gap-6 items-stretch max-w-5xl 2xl:max-w-7xl mx-auto">

          {/* Left panel */}
          <SpotlightCard delay={0.1} className="h-full">
            <div className="p-6 sm:p-8 md:p-10 flex flex-col gap-6 h-full">
              {/* Grows to fill */}
              <div className="flex flex-col gap-6 flex-1">
                <div>
                  <h3 className="text-3xl font-bold mb-3 tracking-tight">Let&apos;s Build Something</h3>
                  <p className="text-base text-muted-foreground leading-relaxed" style={{ textWrap: "pretty" }}>
                    Whether you&apos;re looking to hire, collaborate on an open-source project, or just want to chat about GenAI - I&apos;m all ears.
                  </p>
                </div>

                {/* Social links */}
                <div className="flex flex-col gap-3">
                  {SOCIAL_LINKS.map(({ icon: Icon, label, value, href }) => (
                    <a
                      key={label}
                      href={href}
                      target={href.startsWith("mailto") ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 px-5 py-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/5 hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                        <p className="text-sm font-semibold truncate text-foreground/90">{value}</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Pinned to bottom */}
              <div className="mt-auto flex min-h-[122px] flex-col justify-between gap-4">
                <a
                  href={personalInfo.resumeUrl}
                  download
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(41,214,185,0.2)] hover:shadow-[0_0_30px_rgba(41,214,185,0.3)] transition-all duration-300 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  Download Resume
                </a>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground border-t border-black/10 dark:border-white/5 pt-4">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse motion-reduce:animate-none shrink-0 shadow-[0_0_8px_rgba(41,214,185,0.5)]" />
                  Available for new opportunities
                </div>
              </div>
            </div>
          </SpotlightCard>

          {/* Right panel — Form */}
          <SpotlightCard delay={0.2} className="h-full">
            <form onSubmit={handleSubmit} className="relative p-6 sm:p-8 md:p-10 flex flex-col gap-6 h-full" aria-busy={isSubmitting} noValidate>
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
              <div className="flex flex-col gap-6 flex-1">
                <div>
                  <h3 className="text-3xl font-bold mb-3 tracking-tight">Send a Message</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Fill in the form and I&apos;ll get back to you within 24 hours.
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
                  <div className="relative">
                    <select
                      id="contact-reason"
                      disabled={isSubmitting}
                      value={form.reason}
                      onChange={(e) => {
                        setForm({ ...form, reason: e.target.value as ContactFormData["reason"] });
                        if (errors.reason) {
                          setErrors((current) => ({ ...current, reason: undefined }));
                        }
                      }}
                      aria-invalid={Boolean(errors.reason)}
                      aria-describedby={errors.reason ? "contact-reason-error" : undefined}
                      className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all appearance-none"
                    >
                      {CONTACT_REASONS.map((r) => (
                        <option key={r} value={r} className="bg-background text-foreground">{r}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  {errors.reason && (
                    <p id="contact-reason-error" className="mt-2 text-sm text-destructive">
                      {errors.reason}
                    </p>
                  )}
                </div>

                <div className="flex-1 flex flex-col min-h-[140px]">
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
                    className="flex-1 w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/40"
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
              <div className="mt-auto flex min-h-[122px] flex-col justify-between gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground font-bold text-sm tracking-wide hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 text-primary" />
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
                <p className="text-[11px] font-medium text-muted-foreground/60 text-center border-t border-black/10 dark:border-white/5 pt-4">
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
