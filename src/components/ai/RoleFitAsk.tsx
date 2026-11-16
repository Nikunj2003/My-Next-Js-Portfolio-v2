"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { InlineAnswer } from "@/components/ai/InlineAnswer";
import { MAX_ROLE_LENGTH, roleFitQuestion } from "@/lib/chat/role-fit";

/**
 * "Does he fit this role?" in Contact, kept apart from the contact form: the
 * visitor pastes a role, Nex answers in place from the case studies (gaps
 * included), and nothing is sent to Nikunj. The form below is for that.
 */
export function RoleFitAsk() {
  const [role, setRole] = useState("");
  const [question, setQuestion] = useState<string | null>(null);
  const left = MAX_ROLE_LENGTH - role.length;

  return (
    <div className="rounded-2xl border border-primary/20 glass-subtle p-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (role.trim()) setQuestion(roleFitQuestion(role));
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <label htmlFor="role-fit" className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary-text" aria-hidden="true" />
              Check the fit first
            </label>
            <p id="role-fit-hint" className="mt-0.5 text-[0.8125rem] leading-snug text-muted-foreground">
              Paste a role; Nex says how his work fits, gaps included. Nothing is sent to Nikunj.
            </p>
          </div>
          <button
            type="submit"
            disabled={!role.trim()}
            className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-primary/30 px-4 text-sm font-semibold text-primary-text transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            Check fit
          </button>
        </div>
        <textarea
          id="role-fit"
          aria-describedby="role-fit-hint"
          value={role}
          onChange={(event) => setRole(event.target.value.slice(0, MAX_ROLE_LENGTH))}
          // Open from the start, sized to the screen's height (it never jumps on focus).
          style={{ height: "clamp(4rem, 11svh, 8rem)" }}
          maxLength={MAX_ROLE_LENGTH}
          placeholder="e.g. Senior applied AI engineer: agent tooling, evals, RAG over internal docs…"
          className="w-full resize-none rounded-xl border border-foreground/10 bg-background/55 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/45 focus:ring-2 focus:ring-primary/15"
        />
        {left < 200 && (
          <span className="self-end text-[11px] text-muted-foreground/80 tabular-nums" aria-live="polite">
            {left} characters left
          </span>
        )}
      </form>
      {question && (
        <InlineAnswer key={question} question={question} className="mt-3" onDismiss={() => setQuestion(null)} />
      )}
    </div>
  );
}
