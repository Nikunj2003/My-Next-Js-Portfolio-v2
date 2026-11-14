"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, MessageCircle, X } from "lucide-react";
import { highlightGuideTarget, pointOfElement } from "@/lib/guide/actions";
import { emitGuide } from "@/lib/guide/bus";
import { dispatchCompanion, openAsk, useCompanionState } from "@/lib/guide/companion-store";
import { writeGuidePrefs } from "@/lib/guide/prefs";
import { guideTargetSelector } from "@/lib/guide/targets";
import { START_TOUR_EVENT } from "@/lib/guide/tour-control";
import { planTourScroll, resolveTargetBox } from "@/lib/guide/tour-plan";
import { TOUR_STEPS } from "@/lib/guide/tour";
import { scrollToOffset } from "@/lib/scroll";

const NAVBAR = 85;
/** Room the narrator takes at the bottom: the companion in the corner with its bubble beside it. */
const DESKTOP_RESERVE = 232;
const MOBILE_RESERVE = 260;

/**
 * Runs the guided tour and renders its narration inside the companion's
 * bubble. Each step scrolls its target into the free band above the narrator
 * (never under it), rings it, and turns the avatar to look at it.
 */
export function useGuideTour(isMobile: boolean) {
  const [index, setIndex] = useState<number | null>(null);
  const [drifted, setDrifted] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const scrollingRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const companion = useCompanionState();

  const targetOf = useCallback((step: (typeof TOUR_STEPS)[number]) => {
    const highlighted = step.highlight ? document.querySelector(guideTargetSelector(step.highlight)) : null;
    return (highlighted ?? document.querySelector(step.href)) as HTMLElement | null;
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const step = TOUR_STEPS[next];
      if (!step) return;
      setIndex(next);
      setDrifted(false);
      dispatchCompanion({ type: "tour/open" });
      setAnnouncement(`Step ${next + 1} of ${TOUR_STEPS.length}: ${step.title}. ${step.line}`);
      const element = targetOf(step);
      const settle = () => {
        scrollingRef.current = false;
        if (step.highlight) highlightGuideTarget(step.highlight);
        emitGuide({ type: "tour/step", cue: step.cue, pointAt: element ? pointOfElement(element) : null });
      };
      if (!element) {
        settle();
        return;
      }
      const box = resolveTargetBox(element, (node) => getComputedStyle(node as unknown as Element).position === "sticky");
      const top = planTourScroll({
        box,
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
        navbar: NAVBAR,
        reserve: isMobile ? MOBILE_RESERVE : DESKTOP_RESERVE,
        maxScroll: document.documentElement.scrollHeight - window.innerHeight,
      });
      if (top === null) {
        settle();
        return;
      }
      scrollingRef.current = true;
      scrollToOffset(top, { onComplete: settle });
    },
    [isMobile, targetOf]
  );

  const end = useCallback((completed: boolean) => {
    setIndex(null);
    setDrifted(false);
    setAnnouncement(completed ? "Tour complete." : "Tour closed.");
    dispatchCompanion({ type: "tour/close" });
    emitGuide({ type: "tour/end", completed });
    if (completed) writeGuidePrefs({ tourDone: true });
  }, []);

  // Start requests can come from anywhere; the tour lives on the homepage.
  useEffect(() => {
    const onStart = () => {
      if (pathname !== "/") {
        router.push("/");
        window.setTimeout(() => goTo(0), 700);
        return;
      }
      goTo(0);
    };
    window.addEventListener(START_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_TOUR_EVENT, onStart);
  }, [goTo, pathname, router]);

  // Something else took the bubble (the visitor opened ask), or they left: the tour is over.
  const active = index !== null && companion.bubble === "tour" && pathname === "/";
  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (wasActiveRef.current && !active && index !== null) {
      emitGuide({ type: "tour/end", completed: false });
    }
    wasActiveRef.current = active;
  }, [active, index]);

  // Keyboard: arrows step, Escape skips.
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
      if (typing) return;
      if (event.key === "Escape") {
        event.preventDefault();
        end(false);
      } else if (event.key === "ArrowRight") {
        if (index! < TOUR_STEPS.length - 1) goTo(index! + 1);
        else end(true);
      } else if (event.key === "ArrowLeft" && index! > 0) {
        goTo(index! - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, end, goTo, index]);

  // Offer to resume if the visitor scrolls away from the step on their own.
  useEffect(() => {
    if (!active) return;
    const element = targetOf(TOUR_STEPS[index!]);
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!scrollingRef.current) setDrifted(entry.intersectionRatio < 0.15);
      },
      { threshold: [0, 0.15, 0.5] }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [active, index, targetOf]);

  const narrator = active ? (
    <TourNarration
      index={index!}
      drifted={drifted}
      onBack={() => goTo(index! - 1)}
      onNext={() => (index! < TOUR_STEPS.length - 1 ? goTo(index! + 1) : end(true))}
      onResume={() => goTo(index!)}
      onSkip={() => end(false)}
      onAsk={() => {
        const prompt = TOUR_STEPS[index!].askPrompt;
        end(false);
        openAsk(prompt);
      }}
    />
  ) : null;

  return { narrator, announcement, touring: active };
}

type NarrationProps = {
  index: number;
  drifted: boolean;
  onBack: () => void;
  onNext: () => void;
  onResume: () => void;
  onSkip: () => void;
  onAsk: () => void;
};

function TourNarration({ index, drifted, onBack, onNext, onResume, onSkip, onAsk }: NarrationProps) {
  const step = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;
  return (
    <div className="px-5 py-4" role="region" aria-label="Guided tour">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wider text-primary-text">
          Tour · {index + 1} / {TOUR_STEPS.length}
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
      <h2 className="text-base font-semibold text-foreground">{step.title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.line}</p>
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
            type="button"
            onClick={onNext}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {isLast ? "Finish" : "Next"}
            {!isLast && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}
