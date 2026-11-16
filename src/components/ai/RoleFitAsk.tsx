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
    <div className="rounded-2xl border border-primary/20 glass-subtle p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-primary-text" aria-hidden="true" />
        Check the fit first
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Paste a role and Nex will say how his work fits it, gaps included. This doesn&apos;t message Nikunj.
      </p>
      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (role.trim()) setQuestion(roleFitQuestion(role));
        }}
      >
        <label htmlFor="role-fit" className="sr-only">
          Role description
        </label>
        <textarea
          id="role-fit"
          value={role}
          onChange={(event) => setRole(event.target.value.slice(0, MAX_ROLE_LENGTH))}
          rows={3}
          maxLength={MAX_ROLE_LENGTH}
          placeholder="e.g. Senior applied AI engineer: agent tooling, evals, RAG over internal docs…"
          className="w-full resize-y rounded-xl border border-foreground/10 bg-background/55 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/45 focus:ring-2 focus:ring-primary/15"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground/80 tabular-nums" aria-live="off">
            {left < 200 ? `${left} characters left` : ""}
          </span>
          <button type="submit" disabled={!role.trim()} className="btn-cta-secondary disabled:opacity-60">
            Check fit
          </button>
        </div>
      </form>
      {question && (
        <InlineAnswer key={question} question={question} className="mt-3" onDismiss={() => setQuestion(null)} />
      )}
    </div>
  );
}
