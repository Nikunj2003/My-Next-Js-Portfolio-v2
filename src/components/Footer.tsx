"use client";
import { personalInfo } from "@/data/portfolio";
import logo from "@/assets/logo.png";

const Footer = () => (
  <footer className="border-t border-white/10 py-8">
    <div className="container-narrow flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <img src={logo.src} alt="NK" className="w-5 h-5 opacity-50" />
        <span className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Nikunj Khitha
        </span>
      </div>
      <div className="flex items-center gap-4">
        {[
          { label: "Email", href: `mailto:${personalInfo.email}` },
          { label: "LinkedIn", href: personalInfo.linkedin },
          { label: "GitHub", href: personalInfo.github },
        ].map((l) => (
          <a
            key={l.label}
            href={l.href}
            target={l.href.startsWith("mailto") ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  </footer>
);

export default Footer;
