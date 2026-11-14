import { TIP_RULES } from "@/lib/guide/tips";

/**
 * What the companion's single bubble is showing. One bubble at a time, by
 * priority: ask > tour > tip. A tip is the first thing to go whenever anything
 * else wants the visitor's attention, and it never outlives the companion.
 */
export type BubbleKind = "none" | "tip" | "ask" | "tour";

export type BubbleState = {
  bubble: BubbleKind;
  panelOpen: boolean;
  companionVisible: boolean;
  tip: { section: string; text: string } | null;
  tipBudget: { shown: string[]; lastAt: number; dismissals: number; muted: boolean };
};

export type BubbleAction =
  | { type: "ask/open" }
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
  panelOpen: false,
  companionVisible: false,
  tip: null,
  tipBudget: { shown: [], lastAt: 0, dismissals: 0, muted: false },
};

function dropTip(state: BubbleState): BubbleState {
  return state.bubble === "tip" ? { ...state, bubble: "none", tip: null } : state.tip ? { ...state, tip: null } : state;
}

export function reduceBubble(state: BubbleState, action: BubbleAction): BubbleState {
  switch (action.type) {
    case "ask/open":
      return state.bubble === "ask" ? state : { ...dropTip(state), bubble: "ask" };
    case "ask/close":
      return state.bubble === "ask" ? { ...state, bubble: "none" } : state;
    case "panel/open":
      // The panel takes over the conversation; the bubble closes beside it.
      return { ...dropTip(state), panelOpen: true, bubble: state.bubble === "tour" ? "tour" : "none" };
    case "panel/close":
      return state.panelOpen ? { ...state, panelOpen: false } : state;
    case "tour/open":
      return { ...dropTip(state), bubble: "tour" };
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
        tipBudget: { ...state.tipBudget, dismissals, muted: state.tipBudget.muted || action.forever || dismissals >= 2 },
      };
    }
    case "companion/visible": {
      if (state.companionVisible === action.visible) return state;
      const next = { ...state, companionVisible: action.visible };
      // A hidden companion takes its tip with it (the orphaned-hint bug).
      return action.visible ? next : dropTip(next);
    }
    case "escape":
      if (state.bubble !== "none") return { ...state, bubble: "none", tip: null };
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
