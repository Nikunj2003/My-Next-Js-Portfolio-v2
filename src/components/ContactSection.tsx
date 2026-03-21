"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Mail, Linkedin, Github, Send, Download, MessageSquare } from "lucide-react";
import { personalInfo } from "@/data/portfolio";
import Card3D from "./Card3D";
import cardImage from "@/assets/card.png";

const LINKS = [
  { icon: Mail, label: personalInfo.email, href: `mailto:${personalInfo.email}`, desc: "Email me directly" },
  { icon: Linkedin, label: "LinkedIn", href: personalInfo.linkedin, desc: "Connect professionally" },
  { icon: Github, label: "GitHub", href: personalInfo.github, desc: "See my open source work" },
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
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-subtle border border-primary/20 text-xs font-mono text-primary mb-5">
            <MessageSquare className="w-3 h-3" />
            Let's talk
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Get in Touch</h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
            Open to new opportunities, collaborations, and interesting conversations. I usually respond within 24 hours.
          </p>
        </motion.div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-2 gap-10 items-start max-w-5xl mx-auto">

          {/* Left — Card + links */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-8"
          >
            <div className="mx-auto lg:mx-0 w-full max-w-xs sm:max-w-sm">
              <Card3D>
                <img src={cardImage.src} alt="Business Card" className="w-full h-auto rounded-2xl" />
              </Card3D>
            </div>

            <div className="flex flex-col gap-2.5">
              {LINKS.map(({ icon: Icon, label, href, desc }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 px-4 py-3.5 glass-subtle rounded-xl hover:bg-white/10 transition-all duration-200 border border-white/5 hover:border-primary/20"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                </a>
              ))}

              <a
                href={personalInfo.resumeUrl}
                download
                className="flex items-center justify-center gap-2 mt-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 active:scale-[0.97]"
              >
                <Download className="w-4 h-4" />
                Download Resume
              </a>
            </div>
          </motion.div>

          {/* Right — Form */}
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleSubmit}
            className="glass rounded-2xl p-6 sm:p-8 flex flex-col gap-5 border border-white/5"
          >
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

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/40"
                placeholder="Tell me about the opportunity or idea..."
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 active:scale-[0.97] mt-1"
            >
              <Send className="w-4 h-4" />
              Send Message
            </button>

            <p className="text-[11px] text-muted-foreground/60 text-center">
              Opens your email client with a pre-filled message
            </p>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
