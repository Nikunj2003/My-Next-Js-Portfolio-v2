"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Mail, Linkedin, Github, Send, Download, ArrowUpRight } from "lucide-react";
import { personalInfo } from "@/data/portfolio";
import Card3D from "./Card3D";
import cardImage from "@/assets/card.png";

const SOCIAL_LINKS = [
  {
    icon: Mail,
    label: "Email",
    value: personalInfo.email,
    href: `mailto:${personalInfo.email}`,
    desc: "Drop me a line anytime",
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    value: "nikunj-khitha",
    href: personalInfo.linkedin,
    desc: "Let's connect professionally",
  },
  {
    icon: Github,
    label: "GitHub",
    value: "Nikunj2003",
    href: personalInfo.github,
    desc: "Explore my open-source work",
  },
];

const REASONS = ["Hiring", "Collaboration", "Open Source", "Other"];

import { SpotlightCard } from "@/components/ui/spotlight-card";

// ... [Keep SOCIAL_LINKS, REASONS, etc.] ...

const ContactSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [form, setForm] = useState({ name: "", email: "", reason: "Hiring", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[${form.reason}] ${form.name}`);
    const body = encodeURIComponent(`Hi Nikunj,\n\n${form.message}\n\n— ${form.name} (${form.email})`);
    window.open(`mailto:${personalInfo.email}?subject=${subject}&body=${body}`);
  };

  return (
    <section id="contact" className="section-padding relative z-10">
      <div className="container-narrow" ref={ref}>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="block lg:hidden mb-10 mx-auto w-full max-w-xs sm:max-w-sm"
        >
          <Card3D>
            <img src={cardImage.src} alt="Business Card" className="w-full h-auto rounded-3xl border border-white/10 shadow-2xl" />
          </Card3D>
        </motion.div>

        {/* Two equal panels with Spotlight */}
        <div className="grid lg:grid-cols-2 gap-6 items-stretch max-w-5xl mx-auto">

          {/* Left panel */}
          <SpotlightCard delay={0.1} className="h-full">
            <div className="p-6 sm:p-8 md:p-10 flex flex-col gap-6 h-full">
              {/* Grows to fill */}
              <div className="flex flex-col gap-6 flex-1">
                <div>
                  <h3 className="text-3xl font-bold mb-3 tracking-tight">Let's Build Something</h3>
                  <p className="text-base text-muted-foreground leading-relaxed" style={{ textWrap: "pretty" }}>
                    Whether you're looking to hire, collaborate on an open-source project, or just want to chat about GenAI — I'm all ears.
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
              <div className="flex flex-col gap-4 mt-auto">
                <a
                  href={personalInfo.resumeUrl}
                  download
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(41,214,185,0.2)] hover:shadow-[0_0_30px_rgba(41,214,185,0.3)] transition-all duration-300 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  Download Resume
                </a>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground border-t border-black/10 dark:border-white/5 pt-4">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0 shadow-[0_0_8px_rgba(41,214,185,0.5)]" />
                  Available for new opportunities
                </div>
              </div>
            </div>
          </SpotlightCard>

          {/* Right panel — Form */}
          <SpotlightCard delay={0.2} className="h-full">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 md:p-10 flex flex-col gap-6 h-full">
              {/* Grows to fill */}
              <div className="flex flex-col gap-6 flex-1">
                <div>
                  <h3 className="text-3xl font-bold mb-3 tracking-tight">Send a Message</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Fill in the form and I'll get back to you within 24 hours.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono font-medium text-foreground/70 mb-2 block uppercase tracking-wider">Name</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono font-medium text-foreground/70 mb-2 block uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono font-medium text-foreground/70 mb-2 block uppercase tracking-wider">Reason</label>
                  <div className="relative">
                    <select
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all appearance-none"
                    >
                      {REASONS.map((r) => (
                        <option key={r} value={r} className="bg-background text-foreground">{r}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-[140px]">
                  <label className="text-xs font-mono font-medium text-foreground/70 mb-2 block uppercase tracking-wider">Message</label>
                  <textarea
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="flex-1 w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/40"
                    placeholder="Tell me about the opportunity or idea..."
                  />
                </div>
              </div>

              {/* Pinned to bottom */}
              <div className="flex flex-col gap-4 mt-auto">
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground font-bold text-sm tracking-wide hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98]"
                >
                  <Send className="w-4 h-4 text-primary" />
                  Send Message
                </button>
                <p className="text-[11px] font-medium text-muted-foreground/60 text-center border-t border-black/10 dark:border-white/5 pt-4">
                  Opens your email client with a pre-filled message
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
