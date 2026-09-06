"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import {
  ArrowRight,
  CornerDownLeft,
  Download,
  ExternalLink,
  FileText,
  Github,
  Layers,
  Linkedin,
  Mail,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { caseStudies, getCaseStudyPath } from "@/data/case-studies";
import { personalInfo, projects } from "@/data/portfolio";
import { getProjectAnchor } from "@/lib/ai-twin";
import { useLenisLock } from "@/hooks/useLenisLock";
import { scrollToHash } from "@/lib/scroll";
import { cn } from "@/lib/utils";

/** `terms` widens matching so "cv", "stack" or "hire" land somewhere sensible. */
const SECTIONS = [
  { label: "About", href: "#about", terms: "profile bio who" },
  { label: "Experience", href: "#experience", terms: "career history roles timeline armorcode" },
  { label: "Work", href: "#work", terms: "projects case studies portfolio systems" },
  { label: "Skills", href: "#skills", terms: "stack technologies tools expertise" },
  { label: "Contact", href: "#contact", terms: "email hire reach out message" },
];

const groupClass =
  "mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/60";

/** Matches the item chrome used across the site: subtle glass, primary on hover. */
const itemClass =
  "flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground outline-none transition-colors data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground";

/**
 * Cmd/Ctrl+K palette.
 *
 * Built on Radix Dialog + cmdk directly rather than the shadcn `CommandDialog`
 * wrapper, for two reasons: that wrapper renders no DialogTitle (a real
 * accessibility failure Radix warns about at runtime), and its stock
 * `bg-popover` / `rounded-md` chrome does not match the site's glass language.
 */
const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  // Hand wheel control back to the browser so the list scrolls and the page does not.
  useLenisLock(open);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => {
          if (current) setQuery("");
          return !current;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-command-palette", onOpen);
    return () => window.removeEventListener("open-command-palette", onOpen);
  }, []);

  /**
   * Clearing on every close — not just on select — so ESC or an overlay click
   * does not leave a stale search waiting on the next open.
   */
  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  }, []);

  const run = useCallback((action: () => void) => {
    setOpen(false);
    setQuery("");
    // Let the dialog finish closing so focus restoration doesn't fight the scroll.
    window.setTimeout(action, 120);
  }, []);

  const goToHash = useCallback(
    (href: string) => {
      run(() => {
        if (window.location.pathname === "/") {
          scrollToHash(href);
        } else {
          router.push(`/${href}`);
        }
      });
    },
    [router, run]
  );

  const askTwin = useCallback(
    (question: string) => {
      run(() => {
        window.dispatchEvent(new CustomEvent("open-ai-twin", { detail: { question } }));
      });
    },
    [run]
  );

  const trimmedQuery = query.trim();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[110] overscroll-contain bg-black/70 glass-scrim data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-[12vh] z-[120] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2",
            "flex max-h-[min(30rem,72vh)] flex-col overflow-hidden rounded-2xl border border-white/10 glass-strong glass-overlay shadow-accent-card",
            "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          {/* Radix requires a title on every dialog; it is visually hidden here
              because the input's placeholder already labels the surface. */}
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search sections and case studies, or ask the AI Twin a question.
          </DialogPrimitive.Description>

          <Command loop className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4">
              <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search, or ask a question..."
                className="h-14 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <kbd className="hidden shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
                ESC
              </kbd>
            </div>

            <Command.List
              data-lenis-prevent
              className="scroll-panel min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 scrollbar-thin"
            >
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                {trimmedQuery.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => askTwin(trimmedQuery)}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <Sparkles className="h-4 w-4" />
                    Ask the AI Twin instead
                  </button>
                ) : (
                  "No results."
                )}
              </Command.Empty>

              <Command.Group
                heading="Case studies"
                className={groupClass}
              >
                {caseStudies.map((study) => (
                  <Command.Item
                    key={study.slug}
                    value={`${study.title} ${study.tags.join(" ")} ${study.stack.join(" ")} ${study.aliases.join(" ")}`}
                    onSelect={() => run(() => router.push(getCaseStudyPath(study.slug)))}
                    className={itemClass}
                  >
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{study.title}</span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50">
                      {study.tags[0]}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Projects" className={groupClass}>
                {projects.map((project) => (
                  <Command.Item
                    key={project.slug}
                    value={`${project.title} ${project.category} ${project.tech.join(" ")}`}
                    onSelect={() =>
                      project.live
                        ? run(() => window.open(project.live, "_blank", "noopener,noreferrer"))
                        : goToHash(getProjectAnchor(project.slug))
                    }
                    className={itemClass}
                  >
                    <Layers className="h-4 w-4 shrink-0 opacity-50" />
                    <span className="truncate">{project.title}</span>
                    {project.live ? (
                      <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                        <ExternalLink className="h-2.5 w-2.5" />
                        live
                      </span>
                    ) : (
                      <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50">
                        {project.category}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Go to" className={groupClass}>
                {SECTIONS.map((section) => (
                  <Command.Item key={section.href} value={`${section.label} ${section.terms}`} onSelect={() => goToHash(section.href)} className={itemClass}>
                    <ArrowRight className="h-4 w-4 shrink-0 opacity-50" />
                    {section.label}
                  </Command.Item>
                ))}
                <Command.Item value="ai twin chat assistant agent ask question" onSelect={() => askTwin("")} className={itemClass}>
                  <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
                  Open the AI Twin
                </Command.Item>
              </Command.Group>

              <Command.Group
                heading="Links"
                className={groupClass}
              >
                <Command.Item
                  value="resume download cv curriculum vitae pdf"
                  onSelect={() => run(() => window.open(personalInfo.resumeUrl, "_blank", "noopener,noreferrer"))}
                  className={itemClass}
                >
                  <Download className="h-4 w-4 shrink-0 opacity-50" />
                  Download resume
                </Command.Item>
                <Command.Item
                  value="email contact mail reach out hire"
                  onSelect={() => run(() => { window.location.href = `mailto:${personalInfo.email}`; })}
                  className={itemClass}
                >
                  <Mail className="h-4 w-4 shrink-0 opacity-50" />
                  Email Nikunj
                </Command.Item>
                <Command.Item
                  value="github repositories code source open source"
                  onSelect={() => run(() => window.open(personalInfo.github, "_blank", "noopener,noreferrer"))}
                  className={itemClass}
                >
                  <Github className="h-4 w-4 shrink-0 opacity-50" />
                  GitHub
                </Command.Item>
                <Command.Item
                  value="linkedin profile social"
                  onSelect={() => run(() => window.open(personalInfo.linkedin, "_blank", "noopener,noreferrer"))}
                  className={itemClass}
                >
                  <Linkedin className="h-4 w-4 shrink-0 opacity-50" />
                  LinkedIn
                </Command.Item>
              </Command.Group>
              {trimmedQuery.length > 2 && (
                <Command.Group
                  heading="Ask the AI Twin"
                  className={groupClass}
                >
                  <Command.Item value={`ask ${trimmedQuery}`} onSelect={() => askTwin(trimmedQuery)} className={itemClass}>
                    <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">
                      Ask the AI Twin: <span className="text-foreground">&ldquo;{trimmedQuery}&rdquo;</span>
                    </span>
                    <CornerDownLeft className="ml-auto h-3 w-3 shrink-0 opacity-40" />
                  </Command.Item>
                </Command.Group>
              )}

            </Command.List>

            {/* Footer hints, matching the mono micro-copy used site-wide. */}
            <div className="flex shrink-0 items-center gap-4 border-t border-white/10 px-4 py-2.5 font-mono text-[10px] text-muted-foreground/60">
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">↑↓</kbd>
                navigate
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">↵</kbd>
                select
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5">
                <Sparkles className="h-2.5 w-2.5 text-primary/70" aria-hidden="true" />
                type to ask the twin
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default CommandPalette;
