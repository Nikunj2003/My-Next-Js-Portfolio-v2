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
    <section id="contact" className="section-padding">
      <div className="container-narrow" ref={ref}>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Get in Touch</h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
            Open to new opportunities, collaborations, and interesting conversations.
          </p>
        </motion.div>

        {/* Mobile-only card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="block lg:hidden mb-6 mx-auto w-full max-w-xs sm:max-w-sm"
        >
          <Card3D>
            <img src={cardImage.src} alt="Business Card" className="w-full h-auto rounded-2xl" />
          </Card3D>
        </motion.div>

        {/* Two equal panels */}
        <div className="grid lg:grid-cols-2 gap-6 items-stretch max-w-5xl mx-auto">

          {/* Left panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="glass rounded-2xl p-7 sm:p-8 flex flex-col gap-5 border border-white/5"
          >
            {/* Grows to fill — intro + social links */}
            <div className="flex flex-col gap-5 flex-1">
              <div>
                <p className="text-xs font-mono text-primary mb-3 uppercase tracking-widest">Contact</p>
                <h3 className="text-2xl font-bold mb-2">Let's Build Something</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
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
                    className="group flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/3 hover:bg-white/8 border border-white/5 hover:border-primary/20 transition-all duration-200"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-mono text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium truncate">{value}</p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            </div>

            {/* Pinned to bottom — matches Send Message button height */}
            <div className="flex flex-col gap-3 pt-2">
              <a
                href={personalInfo.resumeUrl}
                download
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 active:scale-[0.97]"
              >
                <Download className="w-4 h-4" />
                Download Resume
              </a>
              <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-white/5 pt-3">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                Available for new opportunities
              </div>
            </div>
          </motion.div>

          {/* Right panel — Form */}
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleSubmit}
            className="glass rounded-2xl p-7 sm:p-8 flex flex-col gap-5 border border-white/5"
          >
            {/* Grows to fill — intro + form fields */}
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <p className="text-xs font-mono text-primary mb-3 uppercase tracking-widest">Message</p>
                <h3 className="text-2xl font-bold mb-2">Send a Message</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fill in the form and I'll get back to you within 24 hours.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Reason</label>
                <select
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r} className="bg-card text-card-foreground">{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Message</label>
                <textarea
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="flex-1 min-h-[100px] w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/40"
                  placeholder="Tell me about the opportunity or idea..."
                />
              </div>
            </div>

            {/* Pinned to bottom — mirrors Download Resume button on the left */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 active:scale-[0.97]"
              >
                <Send className="w-4 h-4" />
                Send Message
              </button>
              <p className="text-[11px] text-muted-foreground/50 text-center border-t border-white/5 pt-3">
                Opens your email client with a pre-filled message
              </p>
            </div>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
