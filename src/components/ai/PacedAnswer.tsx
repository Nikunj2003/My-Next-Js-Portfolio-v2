"use client";

import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { advanceReveal, answerPace, initialReveal, splitMarkdownBlocks, type RevealState } from "@/lib/answer-reveal";

type PacedAnswerProps = {
  text: string;
  /** True while more text may still arrive. */
  streaming: boolean;
  /** Show everything at once (reduced motion, errors, restored history). */
  instant: boolean;
  components: Components;
};

/**
 * Renders an answer word by word at a steady pace instead of token by token.
 *
 * Markdown is split into blocks on blank lines. Finished blocks are memoised,
 * so each tick re-parses only the block that is still being written, which
 * keeps long answers from re-rendering the whole message on every word.
 *
 * It never scrolls anything: surfaces keep the question in view and let the
 * answer grow below it (see `useTurnAnchor`).
 */
export function PacedAnswer({ text, streaming, instant, components }: PacedAnswerProps) {
  // Text that is already complete on mount (restored history) is not replayed.
  const [reveal, setReveal] = useState<RevealState>(() =>
    streaming || instant ? initialReveal : { ...initialReveal, shown: text.length },
  );
  const latest = useRef({ text, streaming });
  useEffect(() => {
    latest.current = { text, streaming };
  }, [text, streaming]);

  const caughtUp = reveal.shown >= text.length;
  const ticking = !instant && (!caughtUp || streaming);

  useEffect(() => {
    if (!ticking) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - last;
      last = now;
      setReveal((state) => advanceReveal(state, latest.current.text, latest.current.streaming, elapsed));
    }, answerPace.tickMs);
    return () => window.clearInterval(id);
  }, [ticking]);

  const visible = instant ? text : text.slice(0, Math.min(reveal.shown, text.length));
  const blocks = splitMarkdownBlocks(visible);

  return (
    <>
      {blocks.map((block, index) => (
        <MarkdownBlock key={index} source={block} components={components} />
      ))}
    </>
  );
}

const MarkdownBlock = memo(function MarkdownBlock({ source, components }: { source: string; components: Components }) {
  if (!source.trim()) return null;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {source}
    </ReactMarkdown>
  );
});
