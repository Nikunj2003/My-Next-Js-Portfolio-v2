/**
 * Paced, word-by-word reveal of a streaming answer.
 *
 * Tokens arrive in bursts; rendering each one re-parses the markdown and makes
 * the text jitter. Instead the panel shows whole words at a steady rate: slow
 * at first so the opening reads naturally, then ramping up so a long answer
 * never takes more than a few seconds to catch up. The pacing curve follows
 * Bible Strong's study assistant (50 → 400 chars/s, smoothstep after 3s).
 *
 * Pure functions only, so the curve is unit-tested without a DOM.
 */

export const answerPace = {
  slowCharactersPerSecond: 50,
  fastCharactersPerSecond: 400,
  slowStartMs: 3000,
  rampMs: 1000,
  tickMs: 40,
};

export type AnswerPace = typeof answerPace;

/** Characters per second after `writtenMs` of revealing. */
export function paceAt(writtenMs: number, pace: AnswerPace = answerPace): number {
  const ramp = Math.min(1, Math.max(0, (writtenMs - pace.slowStartMs) / pace.rampMs));
  const eased = ramp * ramp * (3 - 2 * ramp);
  return pace.slowCharactersPerSecond + (pace.fastCharactersPerSecond - pace.slowCharactersPerSecond) * eased;
}

export type RevealState = {
  /** How many characters of the text are shown. Always on a word boundary. */
  shown: number;
  /** Unspent character allowance carried between ticks. */
  budget: number;
  /** Time spent revealing, which drives the pace ramp. */
  writtenMs: number;
};

export const initialReveal: RevealState = { shown: 0, budget: 0, writtenMs: 0 };

/**
 * Advances the reveal by `elapsedMs`.
 *
 * - Only whole words are revealed. While the stream is still open, the last
 *   word is held back because it may still be growing.
 * - Time spent waiting on the network is not banked, so text does not burst
 *   out after a stall.
 * - A text that became shorter (a server-side replace) clamps `shown`.
 */
export function advanceReveal(
  state: RevealState,
  text: string,
  streaming: boolean,
  elapsedMs: number,
  pace: AnswerPace = answerPace,
): RevealState {
  const shownStart = Math.min(state.shown, text.length);
  if (!streaming && shownStart >= text.length) {
    return shownStart === state.shown ? state : { ...state, shown: shownStart };
  }

  const writtenMs = state.writtenMs + elapsedMs;
  const rate = paceAt(writtenMs, pace);
  let budget = state.budget + (rate * elapsedMs) / 1000;
  let shown = shownStart;
  let held = false;

  while (shown < text.length) {
    const next = nextWordEnd(text, shown);
    const length = next - shown;
    if (streaming && next >= text.length) {
      held = true;
      break;
    }
    if (length > budget) break;
    budget -= length;
    shown = next;
  }

  if (held || shown >= text.length) {
    budget = Math.min(budget, rate * 0.1);
  }

  return { shown, budget, writtenMs };
}

/** Index just past the next word and the whitespace that follows it. */
function nextWordEnd(text: string, from: number): number {
  let index = from;
  while (index < text.length && /\s/.test(text[index])) index += 1;
  while (index < text.length && !/\s/.test(text[index])) index += 1;
  while (index < text.length && /\s/.test(text[index])) index += 1;
  return index;
}

/**
 * Splits markdown on blank lines, keeping fenced code blocks whole so a code
 * sample with an empty line inside it is not broken into two blocks.
 */
export function splitMarkdownBlocks(source: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;
  for (const line of source.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && line.trim() === "" && current.length > 0) {
      blocks.push(current.join("\n"));
      current = [];
      continue;
    }
    if (inFence || line.trim() !== "") current.push(line);
  }
  if (current.length > 0) blocks.push(current.join("\n"));
  return blocks;
}
