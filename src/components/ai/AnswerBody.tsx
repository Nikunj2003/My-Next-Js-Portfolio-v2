"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { scrollToHash } from "@/lib/scroll";

/**
 * The markdown renderer shared by the AI Twin panel and every inline answer
 * surface.
 *
 * Extracted from `AITwinChat.tsx`'s `markdownComponents` so an inline answer
 * and the panel render identically rather than forking the markdown/link
 * styling into two implementations that drift.
 */
export function buildAnswerComponents(navigateToSection: (href: string) => void): Components {
  return {
    a: ({ href = "", children, ...props }) => {
      const isHashLink = href.startsWith("#");
      const isInternalPath = href.startsWith("/");
      const isResumeLink = /resume|\.pdf$/i.test(href);
      const isExternalLink = !isHashLink && !isInternalPath && !href.startsWith("mailto:");

      return (
        <a
          {...props}
          href={href}
          download={isResumeLink && isInternalPath ? true : undefined}
          target={isExternalLink ? "_blank" : undefined}
          rel={isExternalLink ? "noopener noreferrer" : undefined}
          onClick={(event) => {
            props.onClick?.(event);
            if (event.defaultPrevented || !isHashLink) return;
            event.preventDefault();
            navigateToSection(href);
          }}
          className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary/80 break-words"
        >
          {children}
        </a>
      );
    },
    p: ({ children }) => <p className="mb-3 last:mb-0 whitespace-pre-wrap">{children}</p>,
    ul: ({ children }) => <ul className="mb-3 list-disc space-y-2 pl-5 marker:text-primary last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-3 list-decimal space-y-2 pl-5 marker:text-primary last:mb-0">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="text-foreground/90">{children}</em>,
    h1: ({ children }) => <h1 className="mb-3 text-base font-semibold tracking-tight text-foreground">{children}</h1>,
    h2: ({ children }) => <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-foreground">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-2 text-sm font-semibold tracking-tight text-foreground">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-2 border-primary/40 pl-3 text-foreground/80">{children}</blockquote>
    ),
    hr: () => <hr className="my-4 border-border/40" />,
    pre: ({ children }) => (
      <pre className="my-4 overflow-x-auto rounded-xl border border-border/40 bg-background/70 p-3 text-xs leading-6">
        {children}
      </pre>
    ),
    code: ({ className, children, ...props }) => {
      const isBlock = Boolean(className);

      return (
        <code
          {...props}
          className={cn(
            "font-mono",
            isBlock ? "text-[12px] text-foreground" : "rounded-md bg-background/70 px-1.5 py-0.5 text-[0.82em] text-primary",
            className
          )}
        >
          {children}
        </code>
      );
    },
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-xl border border-border/40 bg-background/40">
        <table className="min-w-[34rem] w-full border-collapse text-left text-xs sm:text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-background/60">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-border/20">{children}</tbody>,
    tr: ({ children }) => <tr className="align-top">{children}</tr>,
    th: ({ children }) => (
      <th className="border-b border-border/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/80 sm:text-xs">
        {children}
      </th>
    ),
    td: ({ children }) => <td className="px-3 py-2 text-foreground/90">{children}</td>,
  };
}

/** Default hash navigation: scroll the page, closing nothing (inline surfaces have no panel to close). */
function defaultNavigate(href: string) {
  scrollToHash(href);
}

export function AnswerBody({
  content,
  navigateToSection = defaultNavigate,
}: {
  content: string;
  navigateToSection?: (href: string) => void;
}) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildAnswerComponents(navigateToSection)}>
      {content}
    </ReactMarkdown>
  );
}
