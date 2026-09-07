"use client";

import { useState } from "react";
import { Compass } from "lucide-react";
import { InlineAnswer } from "@/components/ai/InlineAnswer";

const EXAMPLES = [
  "Which study proves he can debug production infrastructure?",
  "Which two studies show agent memory and tool governance?",
  "What should I read if I only have five minutes?",
];

/**
 * "What should I read to judge X?" box for the /work index.
 *
 * Nine-plus studies is enough that a visitor without a specific study in mind
 * benefits from a ranked entry point rather than scanning every card. Seeded
 * with concrete example questions rather than a bare "ask me anything" input,
 * since an empty box invites a vague question that produces a thin answer.
 */
export function ReadingPathAsk() {
  const [question, setQuestion] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const ask = (q: string) => {
    if (!q.trim()) return;
    setQuestion(q.trim());
  };

  return (
    <div className="mb-16 rounded-2xl border border-primary/20 glass-subtle p-6 sm:p-7">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
        <Compass className="h-3.5 w-3.5" />
        Not sure where to start?
      </div>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Tell the AI Twin what you&apos;re evaluating for, and it will point at the studies that actually prove it.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(input);
        }}
        className="mt-4 flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="e.g. Which study best shows agent evaluation?"
          className="flex-1 rounded-xl border border-white/10 bg-black/5 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50 dark:bg-white/5"
        />
        <button type="submit" className="btn-cta-secondary shrink-0 justify-center">
          Ask
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => ask(example)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            {example}
          </button>
        ))}
      </div>

      {question && (
        // Keyed on the question so a NEW question (another example chip, or a
        // resubmitted form) remounts the answer instead of the component
        // silently keeping the previous one's state.
        <div className="mt-4">
          <InlineAnswer
            key={question}
            question={question}
            className="mt-0"
            onDismiss={() => setQuestion(null)}
          />
        </div>
      )}
    </div>
  );
}
