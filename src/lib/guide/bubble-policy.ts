import { TIP_RULES } from "@/lib/guide/tips";
import type { AskHost } from "@/lib/guide/ask-hosts";

/**
 * What the companion's single bubble is showing. One bubble at a time, by
 * priority: ask > tour > tip. A tip is the first thing to go whenever anything
 * else wants the visitor's attention, and it never outlives the companion.
 */
export type BubbleKind = "none" | "tip" | "ask" | "tour";

/**
 * Where an open ask box lives (`lib/guide/ask-hosts.ts`): an in-page host
 * (the hero, the footer, a section's dock) or `float`, the companion's bubble
 * (the sheet on phones). Chosen when it opens; scrolling never changes it.
 */
export type { AskHost };

export type BubbleState = {
  bubble: BubbleKind;
  /** Set while `bubble` is "ask", null otherwise. */
  askHost: AskHost | null;
  panelOpen: boolean;
  companionVisible: boolean;
  tip: { section: string; text: string } | null;
  tipBudget: { shown: string[]; lastAt: number; dismissals: number; muted: boolean };
};

export type BubbleAction =
  | { type: "ask/open"; host?: AskHost }
  | { type: "ask/close" }
  | { type: "panel/open" }
  | { type: "panel/close" }
  | { type: "tour/open" }
  | { type: "tour/close" }
  | { type: "tip/offer"; section: string; text: string; now: number }
  | { type: "tip/expire" }
  | { type: "tip/dismiss"; forever: boolean }
  | { type: "companion/visible"; visible: boolean }
  | { type: "escape" };

export const initialBubbleState: BubbleState = {
  bubble: "none",
  askHost: null,
  panelOpen: false,
  companionVisible: false,
  tip: null,
  tipBudget: { shown: [], lastAt: 0, dismissals: 0, muted: false },
};

function dropTip(state: BubbleState): BubbleState {
  return state.bubble === "tip" ? { ...state, bubble: "none", tip: null } : state.tip ? { ...state, tip: null } : state;
}

/** Leaving "ask" always clears its host: `askHost !== null` iff `bubble === "ask"`. */
function withBubble(state: BubbleState, bubble: BubbleKind): BubbleState {
  return { ...state, bubble, askHost: bubble === "ask" ? state.askHost : null };
}

export function reduceBubble(state: BubbleState, action: BubbleAction): BubbleState {
  switch (action.type) {
    case "ask/open":
      // With the full panel open the conversation is already on screen; a
      // second surface beside it would split it in two.
      if (state.panelOpen) return state;
      {
        const host = action.host ?? "float";
        // Already open: opening it from somewhere else moves it there.
        if (state.bubble === "ask") return state.askHost === host ? state : { ...state, askHost: host };
        return { ...dropTip(state), bubble: "ask", askHost: host };
      }
    case "ask/close":
      return state.bubble === "ask" ? withBubble(state, "none") : state;
    case "panel/open":
      // The panel takes over the conversation; the bubble closes beside it.
      return withBubble({ ...dropTip(state), panelOpen: true }, state.bubble === "tour" ? "tour" : "none");
    case "panel/close":
      return state.panelOpen ? { ...state, panelOpen: false } : state;
    case "tour/open":
      return withBubble(dropTip(state), "tour");
    case "tour/close":
      return state.bubble === "tour" ? { ...state, bubble: "none" } : state;
    case "tip/offer": {
      if (!canOfferTip(state, action.section, action.now)) return state;
      return {
        ...state,
        bubble: "tip",
        tip: { section: action.section, text: action.text },
        tipBudget: { ...state.tipBudget, shown: [...state.tipBudget.shown, action.section], lastAt: action.now },
      };
    }
    case "tip/expire":
      return dropTip(state);
    case "tip/dismiss": {
      const dismissals = state.tipBudget.dismissals + 1;
      return {
        ...dropTip(state),
        // One dismissal silences tips for this visit (canOfferTip); "Don't show tips" persists it.
        tipBudget: { ...state.tipBudget, dismissals, muted: state.tipBudget.muted || action.forever },
      };
    }
    case "companion/visible": {
      if (state.companionVisible === action.visible) return state;
      const next = { ...state, companionVisible: action.visible };
      // A hidden companion takes its tip with it (the orphaned-hint bug).
      return action.visible ? next : dropTip(next);
    }
    case "escape":
      if (state.bubble !== "none") return { ...withBubble(state, "none"), tip: null };
      if (state.panelOpen) return { ...state, panelOpen: false };
      return state;
    default:
      return state;
  }
}

/** Tips are rationed: never over something else, one per section, spaced out, capped, mutable. */
export function canOfferTip(state: BubbleState, section: string, now: number) {
  const budget = state.tipBudget;
  if (!state.companionVisible || state.panelOpen || state.bubble !== "none") return false;
  if (budget.muted || budget.dismissals > 0) return false;
  if (budget.shown.includes(section) || budget.shown.length >= TIP_RULES.maxPerSession) return false;
  if (budget.lastAt && now - budget.lastAt < TIP_RULES.gapMs) return false;
  return true;
}
