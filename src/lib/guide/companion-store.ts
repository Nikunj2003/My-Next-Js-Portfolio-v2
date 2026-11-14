"use client";

import { useSyncExternalStore } from "react";
import { initialBubbleState, reduceBubble, type BubbleAction, type BubbleState } from "@/lib/guide/bubble-policy";
import { emitGuide } from "@/lib/guide/bus";
import { readGuidePrefs, writeGuidePrefs } from "@/lib/guide/prefs";

/**
 * UI state shared by the companion avatar, its bubble and the full chat panel:
 * which bubble is showing, whether the panel is open, and the tip budget.
 * Transitions go through the pure `reduceBubble`.
 */
type CompanionState = BubbleState & {
  /** A question to send as soon as the ask bubble opens (from "Ask about this"). */
  pendingQuestion: string | null;
};

let state: CompanionState = { ...initialBubbleState, pendingQuestion: null };
let prefsLoaded = false;
const listeners = new Set<() => void>();

function set(next: CompanionState) {
  if (next === state) return;
  const wasOpen = state.panelOpen || state.bubble === "ask";
  const isOpen = next.panelOpen || next.bubble === "ask";
  state = next;
  // The avatar listens while any conversation surface is open.
  if (wasOpen !== isOpen) emitGuide({ type: isOpen ? "chat/open" : "chat/close" });
  listeners.forEach((listener) => listener());
}

export function dispatchCompanion(action: BubbleAction) {
  loadPrefs();
  const reduced = reduceBubble(state, action);
  if (reduced === state) return;
  const next = { ...state, ...reduced };
  if (reduced.tipBudget.muted && !state.tipBudget.muted) writeGuidePrefs({ tipsMuted: true });
  set(next);
}

function loadPrefs() {
  if (prefsLoaded || typeof window === "undefined") return;
  prefsLoaded = true;
  if (readGuidePrefs().tipsMuted) state = { ...state, tipBudget: { ...state.tipBudget, muted: true } };
}

/** Opens the ask bubble, optionally sending a question once it is up. */
export function openAsk(question?: string) {
  dispatchCompanion({ type: "ask/open" });
  if (question) set({ ...state, pendingQuestion: question });
}

export function takePendingQuestion() {
  const question = state.pendingQuestion;
  if (question) set({ ...state, pendingQuestion: null });
  return question;
}

export function openPanel() {
  dispatchCompanion({ type: "panel/open" });
}

export function closePanel() {
  dispatchCompanion({ type: "panel/close" });
}

export function subscribeCompanion(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCompanionState() {
  return state;
}

const serverState = state;
export function useCompanionState() {
  return useSyncExternalStore(subscribeCompanion, getCompanionState, () => serverState);
}
