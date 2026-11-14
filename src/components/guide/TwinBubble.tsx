"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { AskContent } from "@/components/guide/AskContent";
import { dispatchCompanion, useCompanionState } from "@/lib/guide/companion-store";
import { bubbleMaxHeight, chooseBubbleSide, placeBubbleBeside, type BubbleSide, type Rect, type Viewport } from "@/lib/guide/placement";
import { useLenisLock } from "@/hooks/useLenisLock";
import { TIP_RULES } from "@/lib/guide/tips";
import { NAVBAR_CLEARANCE as NAVBAR } from "@/lib/scroll";

const BUBBLE_WIDTH = 360;
/** A guess at the bubble's height before it has been measured. */
const INITIAL_HEIGHT = 220;
const GAP = 12;
/** How long the avatar must be still before the bubble's side is chosen again. */
const REST_MS = 350;

type TwinBubbleProps = {
  /** The avatar's position, written every frame by the companion. */
  anchorX: MotionValue<number>;
  anchorY: MotionValue<number>;
  anchorSize: number;
  /** Sides to try, in order, for the current spot. */
  prefer: BubbleSide[];
  /** Changes whenever the companion moves to a new spot; the side is re-chosen then. */
  spotKey: string;
  /** In the bottom-right corner: opens up and to the left. */
  corner: boolean;
  visible: boolean;
  isMobile: boolean;
  /** Section in view, for context chips; null off the homepage. */
  activeSection: string | null;
  onExpand: () => void;
  returnFocus: () => void;
  /** The tour narrator renders through this slot. */
  tourContent?: ReactNode;
};

/**
 * The companion's speech bubble: the ask box, a tip, or the tour narration.
 *
 * On desktop its position is a pure function of the avatar's position
 * (`placeBubbleBeside`), computed with `useTransform` from the same motion
 * values the avatar is drawn with. So it is written in the same frame as the
 * avatar, every frame, whatever the scroll speed: it can't lag or jitter.
 * Its side is fixed per spot (it never swaps mid-scroll), it is clamped to the
 * screen, and its height is capped by the usable screen height, with the
 * answer scrolling inside. The same for every variant.
 *
 * On phones it is a bottom sheet (modal for the ask box only).
 */
export function TwinBubble(props: TwinBubbleProps) {
  const { isMobile } = props;
  return isMobile ? <MobileSheet {...props} /> : <DesktopBubble {...props} />;
}

function useShowing(visible: boolean, isMobile: boolean) {
  const companion = useCompanionState();
  // While the hero avatar is on screen it hosts the ask box itself.
  const heroHosts = companion.bubble === "ask" && companion.heroVisible && !isMobile;
  const showing = heroHosts ? "none" : visible || isMobile ? companion.bubble : "none";
  return { showing, tip: companion.tip };
}

function useClose(showing: string, returnFocus: () => void) {
  return useCallback(() => {
    if (showing === "ask") dispatchCompanion({ type: "ask/close" });
    if (showing === "tip") dispatchCompanion({ type: "tip/expire" });
    if (showing === "tour") dispatchCompanion({ type: "tour/close" });
    returnFocus();
  }, [returnFocus, showing]);
}

function readViewport(): Viewport {
  if (typeof window === "undefined") return { width: 1440, height: 900, insetTop: NAVBAR, insetBottom: 0 };
  return { width: document.documentElement.clientWidth, height: window.innerHeight, insetTop: NAVBAR, insetBottom: 0 };
}

function DesktopBubble({ anchorX, anchorY, anchorSize, prefer, spotKey, corner, visible, isMobile, activeSection, onExpand, returnFocus, tourContent }: TwinBubbleProps) {
  const { showing, tip } = useShowing(visible, isMobile);
  const reduceMotion = Boolean(useReducedMotion());
  const close = useClose(showing, returnFocus);
  const open = showing !== "none";
  // The bubble's current DOM node. A callback ref, kept in state: when the
  // content kind changes (tip -> ask) AnimatePresence swaps nodes, and the
  // size observer below must follow the new one, not the one leaving.
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  // The bubble's natural height (content), measured; the layout below caps it.
  const heightRef = useRef(INITIAL_HEIGHT);
  /** Whether the current bubble node has been measured yet. */
  const measuredRef = useRef(false);
  const [viewport, setViewport] = useState<Viewport>(readViewport);
  useEffect(() => {
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setViewport(readViewport()), 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // The side. Chosen from the free space when the bubble opens, when the
  // companion moves to a new spot, and when the current side stops fitting
  // (checked each frame, cheaply); otherwise held, so it never flips while
  // scrolling. Reading text on screen is avoided where a side allows it.
  const preferKey = (corner ? ["left", "top"] : prefer).join(",");
  const [openSide, setOpenSide] = useState<BubbleSide>("right");
  const sideRef = useRef<BubbleSide | null>(null);
  const choose = useCallback(
    (fresh: boolean) => {
      const sides = preferKey.split(",") as BubbleSide[];
      const next = chooseBubbleSide(
        { x: anchorX.get(), y: anchorY.get() },
        anchorSize,
        { width: BUBBLE_WIDTH, height: heightRef.current },
        viewport,
        sides,
        fresh ? null : sideRef.current,
        fresh ? readingRects() : []
      );
      if (next !== sideRef.current) {
        sideRef.current = next;
        setOpenSide(next);
      }
    },
    [anchorSize, anchorX, anchorY, preferKey, viewport]
  );
  useLayoutEffect(() => {
    if (!open) {
      sideRef.current = null;
      return;
    }
    choose(true);
    // The spot changed: the avatar is gliding there now. Check again once it
    // has arrived, keeping the side the visitor is reading while it still fits.
    const settle = window.setTimeout(() => choose(false), 600);
    return () => window.clearTimeout(settle);
  }, [choose, open, spotKey, showing]);
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        choose(false);
      });
    };
    // Once the avatar has been still for a moment, choose again from the free
    // space where it now rests (the page moved under it while it rode along):
    // the side held while scrolling may now cover the text being read.
    let rest = 0;
    const onMove = () => {
      schedule();
      window.clearTimeout(rest);
      rest = window.setTimeout(() => choose(true), REST_MS);
    };
    const offX = anchorX.on("change", onMove);
    const offY = anchorY.on("change", onMove);
    return () => {
      offX();
      offY();
      cancelAnimationFrame(frame);
      window.clearTimeout(rest);
    };
  }, [anchorX, anchorY, choose, open]);

  // Placed with the side checked for this very position: when the held side
  // stops fitting, the bubble moves to the next side in the same frame
  // (waiting for React to re-render left it over the avatar for a frame or two).
  const place = (x: number, y: number) => {
    const bubbleSize = { width: BUBBLE_WIDTH, height: heightRef.current };
    let side = sideRef.current ?? openSide;
    if (open) {
      const fitted = chooseBubbleSide({ x, y }, anchorSize, bubbleSize, viewport, preferKey.split(",") as BubbleSide[], side);
      if (fitted !== side) {
        side = fitted;
        sideRef.current = fitted;
        // The data attribute and transform origin catch up on the next render.
        queueMicrotask(() => setOpenSide(fitted));
      }
    }
    return placeBubbleBeside({ x, y }, anchorSize, side, bubbleSize, viewport, GAP);
  };
  const left = useTransform([anchorX, anchorY], ([x, y]: number[]) => place(x, y).left);
  const top = useTransform([anchorX, anchorY], ([x, y]: number[]) => place(x, y).top);
  const maxHeight = bubbleMaxHeight(viewport);

  // Re-place when the content grows (an answer streaming in): bump the
  // motion values so the transforms re-run with the new height.
  const chooseRef = useRef(choose);
  useLayoutEffect(() => {
    chooseRef.current = choose;
  }, [choose]);
  // Each bubble is measured afresh. The height used to carry over from the
  // previous one: after the ask box (about 290px) a tip (about 110px) was
  // placed as if it were 290px tall, so "below the avatar" didn't fit and it
  // went beside it, over the text, and stayed there once measured.
  useLayoutEffect(() => {
    heightRef.current = INITIAL_HEIGHT;
    measuredRef.current = false;
  }, [node]);
  useEffect(() => {
    if (!node || !open) return;
    const observer = new ResizeObserver(() => {
      const height = node.scrollHeight;
      if (height > 0 && (!measuredRef.current || Math.abs(height - heightRef.current) >= 1)) {
        const first = !measuredRef.current;
        measuredRef.current = true;
        heightRef.current = height;
        left.set(place(anchorX.get(), anchorY.get()).left);
        top.set(place(anchorX.get(), anchorY.get()).top);
        // The first real measurement may show the guessed side doesn't fit.
        if (first) chooseRef.current(true);
        else chooseRef.current(false);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, open, showing, openSide, viewport]);

  // Wheel over the bubble: the answer area scrolls itself (it is marked
  // data-lenis-prevent and contains its own overscroll). Everywhere else the
  // wheel goes to the page as usual. Blocking it here froze the page whenever
  // the bubble slid under a still pointer while it rode along with the avatar.

  const content = bubbleContent(showing, tip, { activeSection, onExpand, close, reduceMotion, tourContent });

  return (
    // One bubble node at a time: the old one leaves before the new one enters,
    // so `#twin-bubble` is never on two elements.
    <AnimatePresence mode="wait">
      {open && content && (
        <motion.div
          key={`twin-bubble-${showing}`}
          ref={setNode}
          id="twin-bubble"
          data-placement={openSide}
          role={showing === "ask" ? "dialog" : "group"}
          aria-label="Nikunj's AI Twin"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.18 }}
          style={{ left, top, width: BUBBLE_WIDTH, maxHeight, transformOrigin: ORIGIN[openSide] }}
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border/60 glass-strong glass-overlay shadow-accent-card"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MobileSheet({ visible, isMobile, activeSection, onExpand, returnFocus, tourContent }: TwinBubbleProps) {
  const { showing, tip } = useShowing(visible, isMobile);
  const reduceMotion = Boolean(useReducedMotion());
  const close = useClose(showing, returnFocus);
  const open = showing !== "none";
  // The ask sheet is modal. The tour sheet isn't: the tour scrolls the page under it.
  useLenisLock(open && showing === "ask");
  const content = bubbleContent(showing, tip, { activeSection, onExpand, close, reduceMotion, tourContent, isMobile: true });

  return (
    <AnimatePresence>
      {open && content && (
        <>
          {showing === "ask" && (
            <motion.div
              key="twin-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[55] bg-black/50 glass-scrim"
              onClick={close}
              aria-hidden="true"
            />
          )}
          <motion.div
            key="twin-sheet"
            id="twin-bubble"
            role={showing === "ask" ? "dialog" : "group"}
            aria-modal={showing === "ask" ? true : undefined}
            aria-label="Nikunj's AI Twin"
            initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[min(75dvh,calc(100dvh-5rem))] flex-col rounded-t-3xl border-t border-border/60 glass-strong glass-overlay pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-accent-card"
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden="true" />
            {content}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function bubbleContent(
  showing: string,
  tip: { text: string } | null,
  ctx: { activeSection: string | null; onExpand: () => void; close: () => void; reduceMotion: boolean; tourContent?: ReactNode; isMobile?: boolean }
) {
  if (showing === "ask") {
    return <AskContent activeSection={ctx.activeSection} onExpand={ctx.onExpand} onClose={ctx.close} isMobile={Boolean(ctx.isMobile)} reduceMotion={ctx.reduceMotion} />;
  }
  if (showing === "tip" && tip) return <TipContent text={tip.text} />;
  if (showing === "tour") return ctx.tourContent ?? null;
  return null;
}

/** Grow out of the corner nearest the avatar. */
const ORIGIN: Record<BubbleSide, string> = { right: "0% 100%", left: "100% 100%", bottom: "0% 0%", top: "0% 100%" };

/**
 * Reading text on screen the bubble should not cover when it has a choice:
 * headings, paragraphs and list items in the page, not cards' own controls.
 */
function readingRects(): Rect[] {
  const rects: Rect[] = [];
  document.querySelectorAll("main h1, main h2, main h3, main p, main li").forEach((node) => {
    if (node.closest("#twin-bubble, #twin-bubble-hero, nav")) return;
    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.bottom < 0 || box.top > window.innerHeight) return;
    rects.push({ left: box.left, top: box.top, width: box.width, height: box.height });
  });
  return rects;
}


function TipContent({ text }: { text: string }) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (hovered) return;
    const timer = window.setTimeout(() => dispatchCompanion({ type: "tip/expire" }), TIP_RULES.showMs);
    return () => window.clearTimeout(timer);
  }, [hovered]);

  return (
    <div
      className="relative px-4 py-3 pr-10 text-sm leading-relaxed text-foreground"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <p>{text}</p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            dispatchCompanion({ type: "tip/expire" });
            dispatchCompanion({ type: "ask/open" });
          }}
          className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary-text hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Ask now <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => dispatchCompanion({ type: "tip/dismiss", forever: true })}
          className="min-h-8 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Don&apos;t show tips
        </button>
      </div>
      <button
        type="button"
        onClick={() => dispatchCompanion({ type: "tip/dismiss", forever: false })}
        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Dismiss tip"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
