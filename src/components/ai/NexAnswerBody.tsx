"use client";

import { type Components } from "react-markdown";
import { Wrench } from "lucide-react";
import { PacedAnswer } from "@/components/ai/PacedAnswer";
import type { ChatToolCall } from "@/lib/chat-contract";
import type { Message } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { MAX_CARDS_PER_ANSWER, parseCard, type AnswerCard } from "@/lib/chat/cards";

// The cards carry the full case-study and metric data, so they load on first use.
const AnswerCards = dynamic(() => import("@/components/ai/answer-cards/AnswerCards"), { ssr: false });

type NexAnswerBodyProps = {
  message: Message;
  components: Components;
  reducedMotion: boolean;
  /** Show "Take me there" for on-page targets too (surfaces that cover the page). */
  showTakeMeThere: boolean;
  onTakeMeThere?: (call: ChatToolCall) => void;
};

/**
 * An assistant answer as both the ask bubble and the full panel show it: the
 * live tool calls, the paced answer text, the progress label, and the
 * collapsed trace. One component, so the two surfaces never drift apart.
 */
export function NexAnswerBody({ message, components, reducedMotion, showTakeMeThere, onTakeMeThere }: NexAnswerBodyProps) {
  const calls = message.toolCalls ?? [];
  // Before any answer text, the running tools ARE the progress, so they lead.
  // Once the answer starts they move under it: the answer is what people read,
  // the tools are how it was produced.
  const answered = message.content.length > 0;
  const cards: AnswerCard[] = [];
  for (const call of calls) {
    const card = call.status === "done" && !call.refused ? parseCard(call.card) : null;
    if (card && cards.length < MAX_CARDS_PER_ANSWER && !cards.some((seen) => JSON.stringify(seen) === JSON.stringify(card))) cards.push(card);
  }
  const toolList =
    calls.length > 0 ? (
        <ul className={cn("flex flex-col gap-1.5 border-l-2 border-primary/25 pl-3", answered ? "mt-3" : "mb-1")}>
          {calls.map((call) => (
            <li key={call.id} className="flex items-start gap-2 font-mono text-[11px] leading-relaxed">
              <Wrench
                className={cn(
                  "mt-[0.3em] h-3 w-3 shrink-0",
                  call.status === "running" ? "animate-spin motion-reduce:animate-none text-primary" : "text-primary/70"
                )}
              />
              {/* One wrapping block: the call and its result share the row's
                  width and break between words. Only the button is fixed, so
                  the call can never be squeezed to one letter per line. */}
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                <span className="text-foreground/75">{call.label}</span>
                {call.status === "done" && (
                  <span className={call.refused ? "text-amber-500/90" : "text-muted-foreground/70"}>
                    {call.refused ? " · none" : ` · ${call.summary}`}
                  </span>
                )}
              </span>
              {call.status === "done" && !call.refused && call.name === "navigate_to" && call.href && (showTakeMeThere || !call.href.startsWith("#")) && !/\.pdf$/i.test(call.href) && (
                <button
                  type="button"
                  onClick={() => onTakeMeThere?.(call)}
                  className="ml-auto inline-flex min-h-8 shrink-0 items-center rounded-full bg-primary/10 px-3 font-sans text-[11px] font-semibold text-primary-text transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Take me there
                </button>
              )}
            </li>
          ))}
        </ul>
    ) : null;

  return (
    <>
      {!answered && toolList}
      <PacedAnswer
        text={message.content}
        streaming={Boolean(message.streaming)}
        instant={reducedMotion || Boolean(message.error)}
        components={components}
        />

      {message.streaming && message.content.length > 0 && (
        <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-primary/70 align-middle motion-reduce:animate-none" />
      )}

      {/* Progress label from the server while a tool round runs and
          no answer text has arrived yet. The server has always sent
          these; the client used to drop them on the floor. */}
      {message.streaming && message.status && message.content.length === 0 && (
        <p className="font-mono text-[11px] text-muted-foreground/70">
          {message.status}
          <span className="ml-1 animate-pulse motion-reduce:animate-none">…</span>
        </p>
      )}

      {answered && toolList}

      {/* Page components for what the tools found, once the answer is complete. */}
      {!message.streaming && !message.error && cards.length > 0 && <AnswerCards cards={cards} />}

      {/* Collapsed by default: a recruiter never has to open it,
          an engineer can. */}
      {message.trace && !message.error && (
        <details className="group mt-3 border-t border-border/30 pt-2">
          <summary className="cursor-pointer list-none font-mono text-[11px] text-muted-foreground/70 transition-colors hover:text-primary">
            <span className="group-open:hidden">
              trace · {message.trace.toolCount} tool{message.trace.toolCount === 1 ? "" : "s"} ·{" "}
              {(message.trace.elapsedMs / 1000).toFixed(1)}s
            </span>
            <span className="hidden group-open:inline">hide trace</span>
          </summary>
          <dl className="mt-2 flex flex-col gap-1 font-mono text-[10.5px] text-muted-foreground/70">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0">rounds</dt>
              <dd>{message.trace.rounds}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0">latency</dt>
              <dd>{(message.trace.elapsedMs / 1000).toFixed(2)}s</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0">model</dt>
              <dd className="break-all">{message.trace.model}</dd>
            </div>
            {message.trace.sources.length > 0 && (
              <div className="flex gap-2">
                <dt className="w-16 shrink-0">grounded</dt>
                <dd className="break-words">{message.trace.sources.join(", ")}</dd>
              </div>
            )}
            {message.trace.refusals.length > 0 && (
              <div className="flex gap-2 text-amber-500/90">
                <dt className="w-16 shrink-0">declined</dt>
                <dd className="break-words">{message.trace.refusals.join("; ")}</dd>
              </div>
            )}
          </dl>
        </details>
      )}
    </>
  );
}
