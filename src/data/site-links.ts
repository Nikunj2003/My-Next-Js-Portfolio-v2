import { Github, Linkedin, Mail, type LucideIcon } from "lucide-react";
import { personalInfo } from "@/data/portfolio";

/** The homepage sections, in page order. Used by the navbar and the footer. */
export const SECTION_LINKS = [
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#work", label: "Work" },
  { href: "#skills", label: "Skills" },
  { href: "#ai-twin", label: "AI Twin" },
  { href: "#contact", label: "Contact" },
] as const;

const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/** Ways to reach Nikunj. Used by the contact section and the footer. */
export const SOCIAL_LINKS: { icon: LucideIcon; label: string; value: string; href: string }[] = [
  { icon: Mail, label: "Email", value: personalInfo.email, href: `mailto:${personalInfo.email}` },
  { icon: Linkedin, label: "LinkedIn", value: bare(personalInfo.linkedin), href: personalInfo.linkedin },
  { icon: Github, label: "GitHub", value: bare(personalInfo.github), href: personalInfo.github },
];
