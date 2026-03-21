"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Mail, Linkedin, Github, Send, Download } from "lucide-react";
import { personalInfo } from "@/data/portfolio";
import Card3D from "./Card3D";
import cardImage from "@/assets/card.png";

const ContactSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 });
  const [form, setForm] = useState({ name: "", email: "", reason: "Hiring", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[${form.reason}] ${form.name}`);
    const body = encodeURIComponent(`Hi Nikunj,

${form.message}

— ${form.name} (${form.email})`);
    window.open(`mailto:${personalInfo.email}?subject=${subject}&body=${body}`);
  };

  return (
    <section id="contact" className="section-padding">
      <div className="container-narrow" ref={ref}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-4xl font-bold text-center mb-16 tracking-tight"
        >
          Get in Touch
        </motion.h2>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Card + Links */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-8"
          >
            <Card3D className="max-w-sm mx-auto lg:mx-0">
              <img src={cardImage.src} alt="Business Card" className="w-full h-auto rounded-2xl" />
            </Card3D>

            <div className="flex flex-col gap-3">
              {[
                { icon: Mail, label: personalInfo.email, href: `mailto:${personalInfo.email}` },
                { icon: Linkedin, label: "LinkedIn", href: personalInfo.linkedin },
                { icon: Github, label: "GitHub", href: personalInfo.github },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 glass-subtle rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all duration-200"
                >
                  <Icon className="w-4 h-4 text-primary" />
                  {label}
                </a>
              ))}

              <a
                href={personalInfo.resumeUrl}
                download
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 active:scale-[0.97] mt-2"
              >
                <Download className="w-4 h-4" />
                Download Resume
              </a>
            </div>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleSubmit}
            className="glass rounded-2xl p-6 sm:p-8 flex flex-col gap-5"
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
                {["Hiring", "Collaboration", "Open Source", "Other"].map((r) => (
                  <option key={r} value={r} className="bg-card text-card-foreground">{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Message</label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/40"
                placeholder="Tell me about the opportunity or idea..."
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 active:scale-[0.97]"
            >
              <Send className="w-4 h-4" />
              Send Message
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
