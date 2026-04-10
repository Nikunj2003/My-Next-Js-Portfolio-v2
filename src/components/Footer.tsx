"use client";
import Image from "next/image";
import { personalInfo } from "@/data/portfolio";
import logo from "@/assets/logo.png";
import { Mail, Linkedin, Github } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Skills", href: "#skills" },
  { label: "AI Twin", href: "#ai-twin" },
  { label: "Contact", href: "#contact" },
];

const SOCIAL_LINKS = [
  { icon: Mail, label: "Email", href: `mailto:${personalInfo.email}` },
  { icon: Linkedin, label: "LinkedIn", href: personalInfo.linkedin },
  { icon: Github, label: "GitHub", href: personalInfo.github },
];

const Footer = () => (
  <footer className="py-8 px-4 relative z-10">
    <div className="container-narrow">
      <SpotlightCard className="w-full">
        <div className="px-6 py-8 sm:px-10">
          
          {/* Mobile: centered stack | Desktop: logo-left nav-right */}
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-8">
            <a href="#hero" className="flex items-center gap-3 group shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <Image src={logo} alt="" aria-hidden="true" className="w-8 h-8 opacity-80 group-hover:opacity-100 relative z-10 transition-opacity pointer-events-none" draggable={false} />
              </div>
              <span className="text-base font-bold text-muted-foreground group-hover:text-foreground transition-colors tracking-tight">
                Nikunj Khitha
              </span>
            </a>

            <nav className="flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:justify-end">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8 text-center sm:text-left">
            <p className="text-sm font-medium text-foreground/85">
              Open to backend, full-stack, platform, and AI product engineering roles.
            </p>
            <a
              href={personalInfo.resumeUrl}
              download
              className="inline-flex items-center justify-center gap-2 self-center sm:self-auto rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              Download Resume
            </a>
          </div>

          {/* Mobile: centered social icons above copyright | Desktop: copyright-left icons-right */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-6">
            <p className="text-xs text-muted-foreground/60 text-center sm:text-left font-medium">
              © {new Date().getFullYear()} Nikunj Khitha · Built with Next.js &amp; Tailwind
            </p>

            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full glass-subtle border border-white/5 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-white/5 hover:border-primary/20 transition-all duration-300"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

        </div>
      </SpotlightCard>
    </div>
  </footer>
);

export default Footer;
