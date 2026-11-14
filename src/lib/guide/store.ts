import { onGuide } from "@/lib/guide/bus";
import { IDLE_LADDER_MS } from "@/lib/guide/expressions";
import { initialGuideModel, reduceGuide, selectGuideView } from "@/lib/guide/reducer";
import type { GuideEvent, GuideModel, GuideView } from "@/lib/guide/types";

/**
 * The guide's single source of truth on the client.
 *
 * Read with `useSyncExternalStore(subscribeGuide, getGuideView, getServerGuideView)`.
 * It owns the timers (transient expiry and the idle doze) so the reducer can
 * stay pure, and it listens to the window bus so emitters never import it.
 */

let model: GuideModel = initialGuideModel;
let view: GuideView = selectGuideView(model);
const listeners = new Set<() => void>();
let transientTimer: ReturnType<typeof setTimeout> | null = null;
let idleTimers: ReturnType<typeof setTimeout>[] = [];
let detachBus: (() => void) | null = null;
let detachActivity: (() => void) | null = null;

function dispatch(event: GuideEvent) {
  const stamped: GuideModel = { ...model, now: Date.now() };
  const next = reduceGuide(stamped, event);
  if (next === stamped) {
    model = stamped;
    return;
  }
  model = next;
  scheduleTransientExpiry();
  if (event.type !== "page/idle" && event.type !== "tick") scheduleIdle();
  const nextView = selectGuideView(model);
  if (!sameView(view, nextView)) {
    view = nextView;
    listeners.forEach((listener) => listener());
  }
}

function scheduleTransientExpiry() {
  if (transientTimer) clearTimeout(transientTimer);
  transientTimer = null;
  const ends = [model.transient?.until, model.reaction?.until].filter((at): at is number => typeof at === "number");
  if (ends.length === 0) return;
  const wait = Math.max(0, Math.min(...ends) - Date.now());
  transientTimer = setTimeout(() => dispatch({ type: "tick", now: Date.now() }), wait + 16);
}

/** Restarts the idle ladder: bored, drowsy, asleep, measured from now. */
function scheduleIdle() {
  idleTimers.forEach(clearTimeout);
  idleTimers = IDLE_LADDER_MS.map((ms, index) =>
    setTimeout(() => dispatch({ type: "page/idle", stage: (index + 1) as 1 | 2 | 3 }), ms)
  );
}

function sameView(a: GuideView, b: GuideView) {
  return (
    a.state === b.state &&
    a.face === b.face &&
    a.caption === b.caption &&
    a.poke === b.poke &&
    a.pointAt?.x === b.pointAt?.x &&
    a.pointAt?.y === b.pointAt?.y
  );
}

function start() {
  detachBus = onGuide(dispatch);

  // Any real input wakes a dozing guide. Throttled: one event per second is plenty.
  let lastActivity = 0;
  const onActivity = () => {
    const now = Date.now();
    if (now - lastActivity < 1000) return;
    lastActivity = now;
    dispatch({ type: "page/activity" });
    scheduleIdle();
  };
  const events = ["pointermove", "keydown", "scroll", "touchstart"] as const;
  events.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
  detachActivity = () => events.forEach((name) => window.removeEventListener(name, onActivity));
  scheduleIdle();
}

function stop() {
  detachBus?.();
  detachActivity?.();
  detachBus = detachActivity = null;
  if (transientTimer) clearTimeout(transientTimer);
  idleTimers.forEach(clearTimeout);
  idleTimers = [];
  transientTimer = null;
}

export function subscribeGuide(listener: () => void) {
  if (listeners.size === 0) start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

export function getGuideView() {
  return view;
}

const serverView = selectGuideView(initialGuideModel);
export function getServerGuideView() {
  return serverView;
}

/** Direct dispatch for components that own the store's lifecycle. */
export const dispatchGuide = dispatch;
