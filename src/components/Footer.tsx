"use client";
import { personalInfo } from "@/data/portfolio";
import logo from "@/assets/logo.png";
import { Mail, Linkedin, Github } from "lucide-react";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

const SOCIAL_LINKS = [
  { icon: Mail, label: "Email", href: `mailto:${personalInfo.email}` },
  { icon: Linkedin, label: "LinkedIn", href: personalInfo.linkedin },
  { icon: Github, label: "GitHub", href: personalInfo.github },
];

const Footer = () => (
  <footer className="border-t border-white/10 py-12 mt-8">
    <div className="container-narrow">

      {/* Top row — Logo + nav */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
        <a href="#" className="flex items-center gap-2.5 group shrink-0">
          <img src={logo.src} alt="NK" className="w-8 h-8 opacity-60 group-hover:opacity-100 transition-opacity" />
          <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
            Nikunj Khitha
          </span>
        </a>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-white/5 mb-8" />

      {/* Bottom row — copyright + social icons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground/60 order-2 sm:order-1">
          © {new Date().getFullYear()} Nikunj Khitha · Built with Next.js &amp; Tailwind
        </p>

        <div className="flex items-center gap-2 order-1 sm:order-2">
          {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("mailto") ? undefined : "_blank"}
              rel="noopener noreferrer"
              aria-label={label}
              className="w-8 h-8 rounded-lg glass-subtle flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
            >
              <Icon className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
