"use client";

import { useSyncExternalStore } from "react";
import { initialBubbleState, reduceBubble, type AskHost, type BubbleAction, type BubbleState } from "@/lib/guide/bubble-policy";
import { emitGuide } from "@/lib/guide/bus";
// Loads the mood store with this module, so it hears events (chat/open) sent
// before the lazily mounted companion has loaded.
import "@/lib/guide/store";
import { readGuidePrefs, writeGuidePrefs } from "@/lib/guide/prefs";
import { resolveAskHost } from "@/lib/guide/ask-hosts";

/**
 * UI state shared by the companion avatar, its bubble and the full chat panel:
 * which bubble is showing, whether the panel is open, and the tip budget.
 * Transitions go through the pure `reduceBubble`.
 */
type CompanionState = BubbleState & {
  /** A question to send as soon as the ask bubble opens (from "Ask about this"). */
  pendingQuestion: string | null;
  /**
   * The hero avatar is on screen (desktop homepage). While it is, it is the
   * only character: it hosts the conversation inline and the scroll companion
   * stays hidden. Reported by the hero avatar itself.
   */
  heroVisible: boolean;
  /** Nex has landed in the footer's slot (desktop), reported by the companion. */
  footerDocked: boolean;
  /** The homepage section that owns the screen (the companion reports it). */
  section: string | null;
  /** The section whose dock Nex is resting in right now (desktop), or null. */
  dockSection: string | null;
};

let state: CompanionState = { ...initialBubbleState, pendingQuestion: null, heroVisible: false, footerDocked: false, section: null, dockSection: null };
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

/** Whether an in-page host is laid out on this page right now (it renders `data-nex-host`). */
function hostAvailable(host: AskHost) {
  if (typeof document === "undefined") return false;
  const node = document.querySelector<HTMLElement>(`[data-nex-host="${host}"]`);
  return Boolean(node && node.getClientRects().length > 0);
}

/**
 * Where a new ask box opens (`resolveAskHost`): the place asked for when it
 * is on the page, else the hero while Nex sits there, the footer once it has
 * landed, the section in view, and the bubble beside Nex last. Phones: the sheet.
 */
export function chooseAskHost(requested?: AskHost): AskHost {
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  return resolveAskHost({ requested, isMobile, heroVisible: state.heroVisible, footerDocked: state.footerDocked, section: state.section, available: hostAvailable, nearest: nearestPageRow() });
}

/**
 * Off the homepage, the page row for what is being read: the last row
 * (`page:*`, in page order) whose top is above 60% of the screen, else the first.
 */
function nearestPageRow(): AskHost | null {
  if (typeof document === "undefined") return null;
  const rows = [...document.querySelectorAll<HTMLElement>('[data-nex-host^="page:"]')].filter((row) => row.getClientRects().length > 0);
  let best: string | undefined;
  for (const row of rows) if (row.getBoundingClientRect().top <= window.innerHeight * 0.6) best = row.dataset.nexHost;
  return ((best ?? rows[0]?.dataset.nexHost) as AskHost | undefined) ?? null;
}

/**
 * What had focus when the ask box was opened, so an in-page host can hand
 * focus back on close. Read before the composer mounts and takes focus.
 */
let opener: HTMLElement | null = null;
export function takeAskOpener() {
  const element = opener;
  opener = null;
  return element?.isConnected ? element : null;
}

/** Opens the ask box, optionally sending a question once it is up. */
export function openAsk(question?: string, host?: AskHost) {
  if (typeof document !== "undefined" && state.bubble !== "ask") {
    const active = document.activeElement;
    opener = active instanceof HTMLElement && active !== document.body && !active.closest("[data-nex-host-live], #nex-bubble") ? active : null;
  }
  // The full panel is already showing the conversation: queue it there. The
  // panel sends it with its own options (offline state, navigation) once the
  // chat is free, so a question asked mid-answer isn't dropped.
  if (state.panelOpen) {
    if (question) set({ ...state, pendingQuestion: question });
    return;
  }
  dispatchCompanion({ type: "ask/open", host: chooseAskHost(host) });
  if (question) set({ ...state, pendingQuestion: question });
}

export function takePendingQuestion() {
  const question = state.pendingQuestion;
  if (question) set({ ...state, pendingQuestion: null });
  return question;
}

export function setHeroVisible(visible: boolean) {
  if (state.heroVisible !== visible) set({ ...state, heroVisible: visible });
}

export function setCompanionSection(section: string | null) {
  if (state.section !== section) set({ ...state, section });
}

export function setDockSection(section: string | null) {
  if (state.dockSection !== section) set({ ...state, dockSection: section });
}

export function setFooterDocked(docked: boolean) {
  if (state.footerDocked !== docked) set({ ...state, footerDocked: docked });
}

/**
 * What the visitor has typed but not sent. Shared so it survives the ask box
 * moving between the hero and the companion. Not reactive on purpose: each
 * composer reads it once when it mounts.
 */
let draft = "";
export function getAskDraft() {
  return draft;
}
export function setAskDraft(text: string) {
  draft = text;
}

/**
 * The ask box's composer mode. "role-fit": the visitor pastes a role and what
 * they send is wrapped as a fit question (`roleFitQuestion`). Set when the ask
 * box is opened for it (the Contact tip, the chip); read once by the composer.
 */
let composerMode: "ask" | "role-fit" = "ask";
export function takeComposerMode() {
  const mode = composerMode;
  composerMode = "ask";
  return mode;
}
export function openRoleFit(host?: AskHost) {
  composerMode = "role-fit";
  openAsk(undefined, host);
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
  loadPrefs();
  return state;
}

const serverState = state;
export function useCompanionState() {
  return useSyncExternalStore(subscribeCompanion, getCompanionState, () => serverState);
}
