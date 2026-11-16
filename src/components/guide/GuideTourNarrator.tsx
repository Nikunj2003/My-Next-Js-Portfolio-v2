"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, MessageCircle, X } from "lucide-react";
import { clearGuideHighlight, highlightGuideTarget, pointOfElement } from "@/lib/guide/actions";
import { emitGuide } from "@/lib/guide/bus";
import { dispatchCompanion, openAsk, useCompanionState } from "@/lib/guide/companion-store";
import { readGuidePrefs, writeGuidePrefs } from "@/lib/guide/prefs";
import { guideTargetSelector } from "@/lib/guide/targets";
import { START_TOUR_EVENT } from "@/lib/guide/tour-control";
import { planTourScroll, resolveTargetBox } from "@/lib/guide/tour-plan";
import { stepsFor, type VisitorId } from "@/lib/guide/paths";
import type { TourStep } from "@/lib/guide/tour";
import type { StartTourDetail } from "@/lib/guide/tour-control";
import { scrollToOffset, NAVBAR_CLEARANCE as NAVBAR } from "@/lib/scroll";

/** Room the narrator takes at the bottom: the companion in the corner with its bubble beside it. */
const DESKTOP_RESERVE = 232;
const MOBILE_RESERVE = 260;
/** Focus here means the visitor is operating a control, so the tour's keys must stay out of the way. */
const INTERACTIVE_FOCUS =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="slider"], [role="tablist"], [role="tab"]';

/**
 * Runs the guided tour and renders its narration inside the companion's
 * bubble. Each step scrolls its target into the free band above the narrator
 * (never under it), rings it, and turns the avatar to look at it.
 */
export function useGuideTour(isMobile: boolean) {
  const [index, setIndex] = useState<number | null>(null);
  // The steps of the visitor path being toured (the 60-second tour by default).
  const [steps, setSteps] = useState<TourStep[]>(() => stepsFor("default"));
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);
  const [drifted, setDrifted] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const scrollingRef = useRef(false);
  /** Bumped by every step change and by teardown; a settle from an older run does nothing. */
  const runRef = useRef(0);
  const cancelScrollRef = useRef<(() => void) | null>(null);
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStartRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const companion = useCompanionState();

  const targetOf = useCallback((step: TourStep) => {
    const highlighted = step.highlight ? document.querySelector(guideTargetSelector(step.highlight)) : null;
    return (highlighted ?? document.querySelector(step.href)) as HTMLElement | null;
  }, []);

  /** Where the page should scroll for this step right now, or null when the target is already clear. */
  const planFor = useCallback(
    (step: TourStep) => {
      const element = targetOf(step);
      if (!element) return null;
      const box = resolveTargetBox(element, (node) => getComputedStyle(node as unknown as Element).position === "sticky");
      return planTourScroll({
        box,
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
        navbar: NAVBAR,
        reserve: isMobile ? MOBILE_RESERVE : DESKTOP_RESERVE,
        maxScroll: document.documentElement.scrollHeight - window.innerHeight,
      });
    },
    [isMobile, targetOf]
  );

  /** Scrolls to a step and, once settled, rings it and points the avatar at it. */
  const runStep = useCallback(
    (next: number) => {
      const step = stepsRef.current[next];
      if (!step) return;
      const run = ++runRef.current;
      cancelScrollRef.current?.();
      cancelScrollRef.current = null;

      const finish = () => {
        if (run !== runRef.current) return;
        scrollingRef.current = false;
        cancelScrollRef.current = null;
        const element = targetOf(step);
        if (step.highlight) highlightGuideTarget(step.highlight);
        emitGuide({ type: "tour/step", cue: step.cue, pointAt: element ? pointOfElement(element) : null });
      };
      const settle = () => {
        if (run !== runRef.current) return;
        // Entrance animations can still be moving the target when the scroll
        // lands. Measure once more and correct once if it ended up elsewhere.
        const again = planFor(step);
        if (again !== null && Math.abs(again - window.scrollY) > 6) {
          cancelScrollRef.current = scrollToOffset(again, { onComplete: finish });
          return;
        }
        finish();
      };

      const top = planFor(step);
      if (top === null) {
        scrollingRef.current = false;
        finish();
        return;
      }
      scrollingRef.current = true;
      cancelScrollRef.current = scrollToOffset(top, { onComplete: settle });
    },
    [planFor, targetOf]
  );

  const goTo = useCallback(
    (next: number) => {
      const step = stepsRef.current[next];
      if (!step) return;
      setIndex(next);
      setDrifted(false);
      dispatchCompanion({ type: "tour/open" });
      emitGuide({ type: "tour/start" });
      setAnnouncement(`Step ${next + 1} of ${stepsRef.current.length}: ${step.title}. ${step.line}`);
      runStep(next);
    },
    [runStep]
  );

  /** Stops whatever the tour has in flight: pending scroll, settle, route timer and the ring. */
  const stopRun = useCallback(() => {
    runRef.current += 1;
    cancelScrollRef.current?.();
    cancelScrollRef.current = null;
    if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
    routeTimerRef.current = null;
    scrollingRef.current = false;
    clearGuideHighlight();
  }, []);

  const end = useCallback(
    (completed: boolean) => {
      stopRun();
      setIndex(null);
      setDrifted(false);
      setAnnouncement(completed ? "Tour complete." : "Tour closed.");
      dispatchCompanion({ type: "tour/close" });
      emitGuide({ type: "tour/end", completed });
      if (completed) writeGuidePrefs({ tourDone: true });
    },
    [stopRun]
  );

  const goToRef = useRef(goTo);
  useEffect(() => {
    goToRef.current = goTo;
  }, [goTo]);

  // Start requests can come from anywhere; the tour lives on the homepage.
  // The route timer lives in a ref: routing home changes `pathname`, which
  // re-runs this effect, and its cleanup must not cancel the pending start.
  useEffect(() => {
    const onStart = (event: Event) => {
      // The visitor's path, remembered for the chat and the next chooser.
      const pathId: VisitorId = (event as CustomEvent<StartTourDetail>).detail?.pathId ?? readGuidePrefs().visitor ?? "default";
      writeGuidePrefs({ visitor: pathId });
      const chosen = stepsFor(pathId);
      stepsRef.current = chosen;
      setSteps(chosen);
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
      routeTimerRef.current = null;
      if (pathname !== "/") {
        // Start once the homepage has actually arrived (below), not after a
        // guessed delay: a slow route left the bubble stuck on an empty tour.
        pendingStartRef.current = true;
        router.push("/");
        return;
      }
      goToRef.current(0);
    };
    window.addEventListener(START_TOUR_EVENT, onStart);
    // The idle-mounted wrapper waits for this to know a start request will be heard.
    document.documentElement.dataset.guideTour = "ready";
    return () => {
      window.removeEventListener(START_TOUR_EVENT, onStart);
      delete document.documentElement.dataset.guideTour;
    };
  }, [pathname, router]);

  // A start requested from another route: run it once "/" is here and its
  // first target exists (checked per frame, for up to five seconds).
  useEffect(() => {
    if (pathname !== "/" || !pendingStartRef.current) return;
    let frame = 0;
    const giveUp = performance.now() + 5000;
    const wait = () => {
      if (!pendingStartRef.current) return;
      if (targetOf(stepsRef.current[0]) || performance.now() > giveUp) {
        pendingStartRef.current = false;
        goToRef.current(0);
        return;
      }
      frame = requestAnimationFrame(wait);
    };
    frame = requestAnimationFrame(wait);
    return () => cancelAnimationFrame(frame);
  }, [pathname, targetOf]);

  useEffect(
    () => () => {
      pendingStartRef.current = false;
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
      routeTimerRef.current = null;
    },
    []
  );

  // Something else took the bubble (the visitor opened ask), or they left "/": the tour is over.
  const active = index !== null && companion.bubble === "tour" && pathname === "/";
  // Reset the step when the tour stops being active for any reason (adjusted
  // during render, which React supports for state derived from other state).
  const [wasActive, setWasActive] = useState(false);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) {
      setIndex(null);
      setDrifted(false);
    }
  }
  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (wasActiveRef.current && !active) {
      stopRun();
      dispatchCompanion({ type: "tour/close" });
      emitGuide({ type: "tour/end", completed: false });
    }
    wasActiveRef.current = active;
  }, [active, stopRun]);

  // Keyboard: arrows step, Escape skips. Leaves alone anything the visitor is operating.
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        if (target.isContentEditable || target.closest(INTERACTIVE_FOCUS)) return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        end(false);
      } else if (event.key === "ArrowRight") {
        if (index! < steps.length - 1) goTo(index! + 1);
        else end(true);
      } else if (event.key === "ArrowLeft" && index! > 0) {
        goTo(index! - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, end, goTo, index, steps.length]);

  // The layout changes under the tour (rotation, keyboard, resize): plan the current step again.
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Only a width change re-plans. Phone toolbars resize the height while the
    // visitor scrolls, and re-planning then pulled the page back to the step.
    let width = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => runStep(index!), 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [active, index, runStep]);

  // Offer to resume if the visitor scrolls away from the step on their own.
  useEffect(() => {
    if (!active) return;
    const element = targetOf(steps[index!]);
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!scrollingRef.current) setDrifted(entry.intersectionRatio < 0.15);
      },
      { threshold: [0, 0.15, 0.5] }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [active, index, steps, targetOf]);

  const narrator = active ? (
    <TourNarration
      index={index!}
      steps={steps}
      drifted={drifted}
      onBack={() => goTo(index! - 1)}
      onNext={() => (index! < steps.length - 1 ? goTo(index! + 1) : end(true))}
      onResume={() => goTo(index!)}
      onSkip={() => end(false)}
      onAsk={() => {
        const prompt = steps[index!].askPrompt;
        end(false);
        openAsk(prompt);
      }}
    />
  ) : null;

  return { narrator, announcement, touring: active };
}

type NarrationProps = {
  index: number;
  steps: TourStep[];
  drifted: boolean;
  onBack: () => void;
  onNext: () => void;
  onResume: () => void;
  onSkip: () => void;
  onAsk: () => void;
};

function TourNarration({ index, steps, drifted, onBack, onNext, onResume, onSkip, onAsk }: NarrationProps) {
  const isLast = index === steps.length - 1;
  const nextRef = useRef<HTMLButtonElement>(null);
  // The tour has just started: put the keyboard on "Next" without moving the page.
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="px-5 py-4" role="region" aria-label="Guided tour">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wider text-primary-text">
          Tour · {index + 1} / {steps.length}
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="-mr-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Skip tour"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {/* Every step's text is laid out in the same grid cell, hidden but for
          the current one, so the card is as tall as the longest step on every
          step: it never grows or shrinks (and moves up and down) between steps. */}
      <div className="grid">
        {steps.map((each, i) => (
          <div key={each.title} aria-hidden={i !== index} className={"col-start-1 row-start-1 " + (i === index ? "" : "invisible")}>
            <h2 className="text-base font-semibold text-foreground">{each.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{each.line}</p>
          </div>
        ))}
      </div>
      {drifted && (
        <button
          type="button"
          onClick={onResume}
          className="mt-2 text-sm font-semibold text-primary-text underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Resume tour here
        </button>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAsk}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border/50 px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
          Ask about this
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={index === 0}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50 text-foreground transition-colors hover:border-primary/40 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Previous step"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            ref={nextRef}
            type="button"
            onClick={onNext}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {isLast ? "Finish" : "Next"}
            {!isLast && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground/70 max-sm:hidden">← → to move, Esc to exit</p>
    </div>
  );
}
