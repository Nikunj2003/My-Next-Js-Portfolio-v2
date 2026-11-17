"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, cancelFrame, frame, motion, useMotionValue, useReducedMotion, type MotionValue } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { LazyAskContent as AskContent } from "@/components/guide/LazyAskContent";
import { openRoleFit, dispatchCompanion, useCompanionState } from "@/lib/guide/companion-store";
import { bubbleMaxHeight, chooseBubbleSide,
  freeBubbleSide, easeInOutCubic, placeBubbleBeside, type BubbleSide, type Rect, type Viewport } from "@/lib/guide/placement";
import { useLenisLock } from "@/hooks/useLenisLock";
import { TIP_RULES } from "@/lib/guide/tips";
import { NAVBAR_CLEARANCE as NAVBAR } from "@/lib/scroll";

const BUBBLE_WIDTH = 360;
/** A guess at the bubble's height before it has been measured. */
const INITIAL_HEIGHT = 220;
/**
 * The height the ask box's side is chosen for: its reserved size, not what it
 * measures at the moment it opens. It grows as chips load and an answer
 * streams in; choosing from the first, smaller measurement picked a side
 * that stopped fitting a few frames later, so it flashed there and jumped.
 */
const ASK_RESERVE = 460;
const GAP = 12;
/** How long the avatar must be still before the bubble's side is chosen again. */
const REST_MS = 350;
/** A change of side fades out and back in over this long. */
const SIDE_SWITCH_MS = 260;

type NexBubbleProps = {
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
 * (`placeBubbleBeside`), computed by one step on Framer Motion's frame loop
 * right after the companion is placed. So it is written in the same frame as
 * the avatar, every frame, whatever the scroll speed: it can't lag or jitter.
 * Its side is fixed per spot (it never swaps mid-scroll), it is clamped to the
 * screen, and its height is capped by the usable screen height, with the
 * answer scrolling inside. The same for every variant.
 *
 * On phones it is a bottom sheet (modal for the ask box only).
 */
export function NexBubble(props: NexBubbleProps) {
  const { isMobile } = props;
  return isMobile ? <MobileSheet {...props} /> : <DesktopBubble {...props} />;
}

function useShowing(visible: boolean, isMobile: boolean) {
  const companion = useCompanionState();
  // An in-page host (the hero, the footer) shows the ask box itself; the
  // bubble only carries it when it was opened beside the companion. Phones
  // always use the sheet.
  const pageHosts = companion.bubble === "ask" && companion.askHost !== "float" && !isMobile;
  // Resting in a section's dock, a tip is that dock's line (SectionNexDock), not a bubble.
  const tipInDock = companion.bubble === "tip" && !isMobile && companion.dockSection !== null && companion.dockSection === companion.tip?.section;
  const showing = pageHosts || tipInDock ? "none" : visible || isMobile ? companion.bubble : "none";
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

function DesktopBubble({ anchorX, anchorY, anchorSize, prefer, spotKey, corner, visible, isMobile, activeSection, onExpand, returnFocus, tourContent }: NexBubbleProps) {
  const { showing, tip } = useShowing(visible, isMobile);
  const reduceMotion = Boolean(useReducedMotion());
  const close = useClose(showing, returnFocus);
  const open = showing !== "none";
  // The bubble's current DOM node. A callback ref, kept in state: when the
  // content kind changes (tip -> ask) AnimatePresence swaps nodes, and the
  // size observer below must follow the new one, not the one leaving.
  const [node, setNodeState] = useState<HTMLDivElement | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const setNode = useCallback((next: HTMLDivElement | null) => {
    nodeRef.current = next;
    setNodeState(next);
  }, []);

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
  // The tour narrates from the corner, always above it: one side for every
  // step, so the card never moves between left and top as steps change length.
  const preferKey = (showing === "tour" ? ["top"] : corner ? ["left", "top"] : prefer).join(",");
  const [openSide, setOpenSide] = useState<BubbleSide>("right");
  // Hidden until it has been measured and its side chosen from that. It was
  // drawn first on a guessed side and height (right, 220px), then moved once
  // measured: in the corner that showed as a flash on the right, then a jump
  // to the left.
  const [readyNode, setReadyNode] = useState<HTMLDivElement | null>(null);
  // The tour card waits for Nex to reach the corner (it flies there when the
  // tour starts), then appears once, beside it: it used to ride along the
  // flight and switch sides on the way, the flicker before it settled.
  // Once shown it stays: later steps scroll the page, never Nex.
  const [restedNode, setRestedNode] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (showing !== "tour" || !node) return;
    let timer = 0;
    const done = () => {
      offX();
      offY();
      setRestedNode(node);
    };
    const unsettle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(done, 140);
    };
    const offX = anchorX.on("change", unsettle);
    const offY = anchorY.on("change", unsettle);
    timer = window.setTimeout(done, 140);
    return () => {
      offX();
      offY();
      window.clearTimeout(timer);
    };
  }, [anchorX, anchorY, node, showing]);
  const ready = node !== null && readyNode === node && (showing !== "tour" || restedNode === node);
  const sideRef = useRef<BubbleSide | null>(null);
  /** The size a side is chosen for: the ask box at its reserved height. */
  const sizingHeight = useCallback(
    () => (showing === "ask" ? Math.max(heightRef.current, Math.min(ASK_RESERVE, bubbleMaxHeight(viewport))) : heightRef.current),
    [showing, viewport]
  );
  const choose = useCallback(
    (fresh: boolean) => {
      const sides = preferKey.split(",") as BubbleSide[];
      // A tip takes a side that covers no text when one exists (it was only
      // offered because one did); the ask box takes the least-covering side.
      const free = fresh && showing === "tip"
        ? freeBubbleSide({ x: anchorX.get(), y: anchorY.get() }, anchorSize, { width: BUBBLE_WIDTH, height: heightRef.current }, viewport, sides, readingRects())
        : null;
      // A tip with no free side left (the page moved under it): it goes,
      // rather than sit over what is being read.
      if (fresh && showing === "tip" && !free && sideRef.current !== null) {
        dispatchCompanion({ type: "tip/expire" });
        return;
      }
      const next = free ?? chooseBubbleSide(
        { x: anchorX.get(), y: anchorY.get() },
        anchorSize,
        { width: BUBBLE_WIDTH, height: sizingHeight() },
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
    [anchorSize, anchorX, anchorY, preferKey, showing, sizingHeight, viewport]
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
  // Once the avatar has been still for a moment, choose again from the free
  // space where it now rests (the page moved under it while it rode along):
  // the side held while scrolling may now cover the text being read.
  useEffect(() => {
    if (!open) return;
    let rest = 0;
    const onMove = () => {
      window.clearTimeout(rest);
      rest = window.setTimeout(() => choose(true), REST_MS);
    };
    const offX = anchorX.on("change", onMove);
    const offY = anchorY.on("change", onMove);
    return () => {
      offX();
      offY();
      window.clearTimeout(rest);
    };
  }, [anchorX, anchorY, choose, open]);

  // Placement runs as one step on Framer Motion's frame loop, right after the
  // companion's (its `preRender`, after the companion's `update`), so the bubble is drawn in the same frame
  // as the avatar. Each frame it checks the held side still fits, and a change
  // of side is a short fade: out on the old side, in on the new, both riding
  // the avatar's live position.
  //
  // Root cause of the lag it replaces: placement ran inside two motion-value transform
  // callbacks, and while a side change was fading each call scheduled a fresh
  // requestAnimationFrame that called it twice more, so the callbacks doubled
  // every frame (18,000 in one 148ms task in a trace). Nothing here schedules
  // itself: the loop is the clock.
  const left = useMotionValue(0);
  const top = useMotionValue(0);
  const placeRef = useRef<(now: number) => void>(() => {});
  const switchRef = useRef<{ from: BubbleSide; start: number } | null>(null);
  const placedSideRef = useRef<BubbleSide | null>(null);
  const filterRef = useRef("");
  useLayoutEffect(() => {
    placeRef.current = (now: number) => {
      const x = anchorX.get();
      const y = anchorY.get();
      const bubbleSize = { width: BUBBLE_WIDTH, height: heightRef.current };
      let side = sideRef.current ?? openSide;
      const fitted = chooseBubbleSide({ x, y }, anchorSize, { width: BUBBLE_WIDTH, height: sizingHeight() }, viewport, preferKey.split(",") as BubbleSide[], side);
      if (fitted !== side) {
        side = fitted;
        sideRef.current = fitted;
        // The data attribute and transform origin catch up on the next render.
        setOpenSide(fitted);
      }
      if (placedSideRef.current !== null && placedSideRef.current !== side && !reduceMotion) {
        switchRef.current = { from: switchRef.current?.from ?? placedSideRef.current, start: now };
      }
      placedSideRef.current = side;

      let shown = side;
      let opacity = 1;
      const run = switchRef.current;
      if (run) {
        // Skip the fade-out if the old side would now cover the avatar.
        const oldPlace = placeBubbleBeside({ x, y }, anchorSize, run.from, bubbleSize, viewport, GAP);
        const oldCovers =
          oldPlace.left < x + anchorSize && oldPlace.left + bubbleSize.width > x &&
          oldPlace.top < y + anchorSize && oldPlace.top + Math.min(bubbleSize.height, oldPlace.maxHeight) > y;
        if ((now - run.start) / SIDE_SWITCH_MS < 0.5 && oldCovers) run.start = now - SIDE_SWITCH_MS / 2;
        const k = (now - run.start) / SIDE_SWITCH_MS;
        if (k >= 1) switchRef.current = null;
        else {
          shown = k < 0.5 ? run.from : side;
          opacity = easeInOutCubic(Math.abs(1 - 2 * k));
        }
      }
      const placed = placeBubbleBeside({ x, y }, anchorSize, shown, bubbleSize, viewport, GAP);
      left.set(placed.left);
      top.set(placed.top);
      // The panel's entrance animates `opacity`; the swap uses `filter`, so they never fight.
      const filter = opacity === 1 ? "" : `opacity(${opacity.toFixed(3)})`;
      const el = nodeRef.current;
      if (el && filter !== filterRef.current) {
        filterRef.current = filter;
        el.style.filter = filter;
      }
    };
  });
  useEffect(() => {
    if (!open) {
      switchRef.current = null;
      placedSideRef.current = null;
      filterRef.current = "";
      return;
    }
    const step = ({ timestamp }: { timestamp: number }) => placeRef.current(timestamp);
    // Placed once now (before the first paint of a new bubble), then every frame.
    placeRef.current(performance.now());
    // preRender: after every update step (the companion places the avatar
    // there), before render, so the bubble always uses this frame's position.
    frame.preRender(step, true);
    return () => cancelFrame(step);
  }, [open]);
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
        // The first real measurement may show the guessed side doesn't fit:
        // choose, then place, then show, all before the next paint.
        if (first) chooseRef.current(true);
        else chooseRef.current(false);
        placeRef.current(performance.now());
        if (first) setReadyNode(node);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, open, showing, openSide, viewport]);

  // Wheel over the bubble: the answer area scrolls itself (it is marked
  // data-lenis-prevent and contains its own overscroll). Everywhere else the
  // wheel goes to the page as usual. Blocking it here froze the page whenever
  // the bubble slid under a still pointer while it rode along with the avatar.

  const content = bubbleContent(showing, tip, { activeSection, onExpand, close, reduceMotion, tourContent });

  return (
    // One bubble node at a time: the old one leaves before the new one enters,
    // so `#nex-bubble` is never on two elements.
    <AnimatePresence mode="wait">
      {open && content && (
        <motion.div
          key={`nex-bubble-${showing}`}
          ref={setNode}
          id="nex-bubble"
          data-placement={openSide}
          role={showing === "ask" ? "dialog" : "group"}
          aria-label="Nex, AI guide"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.18 }}
          style={{ left, top, width: BUBBLE_WIDTH, maxHeight, transformOrigin: ORIGIN[openSide], visibility: ready ? "visible" : "hidden" }}
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border/60 glass-strong glass-overlay shadow-accent-card"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MobileSheet({ visible, isMobile, activeSection, onExpand, returnFocus, tourContent }: NexBubbleProps) {
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
              key="nex-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[55] bg-black/50 glass-scrim"
              onClick={close}
              aria-hidden="true"
            />
          )}
          <motion.div
            key="nex-sheet"
            id="nex-bubble"
            role={showing === "ask" ? "dialog" : "group"}
            aria-modal={showing === "ask" ? true : undefined}
            aria-label="Nex, AI guide"
            initial={reduceMotion ? { opacity: 0 } : showing === "tip" ? { opacity: 0, y: 8, scale: 0.97 } : { y: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : showing === "tip" ? { opacity: 1, y: 0, scale: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : showing === "tip" ? { opacity: 0, y: 6 } : { y: "100%" }}
            transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 32 }}
            className={
              showing === "tip"
                ? // A tip is unasked for: a small card beside Nex in the corner,
                  // not a sheet across the page (that hid 100-200px of what the
                  // visitor was reading, for six seconds).
                  "fixed bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+3.75rem)] right-3 z-[60] flex w-[min(19rem,calc(100vw-1.5rem))] flex-col rounded-2xl border border-border/60 glass-strong glass-overlay shadow-accent-card"
                : "fixed inset-x-0 bottom-0 z-[60] flex max-h-[min(75dvh,calc(100dvh-5rem))] flex-col rounded-t-3xl border-t border-border/60 glass-strong glass-overlay pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-accent-card"
            }
          >
            {showing !== "tip" && <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden="true" />}
            {content}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function bubbleContent(
  showing: string,
  tip: { text: string; section: string } | null,
  ctx: { activeSection: string | null; onExpand: () => void; close: () => void; reduceMotion: boolean; tourContent?: ReactNode; isMobile?: boolean }
) {
  if (showing === "ask") {
    return <AskContent activeSection={ctx.activeSection} onExpand={ctx.onExpand} onClose={ctx.close} isMobile={Boolean(ctx.isMobile)} reduceMotion={ctx.reduceMotion} />;
  }
  if (showing === "tip" && tip) return <TipContent text={tip.text} tipSection={tip.section} isMobile={Boolean(ctx.isMobile)} />;
  if (showing === "tour") return ctx.tourContent ?? null;
  return null;
}

/** Grow out of the corner nearest the avatar. */
const ORIGIN: Record<BubbleSide, string> = { right: "0% 100%", left: "100% 100%", bottom: "0% 0%", top: "0% 100%" };

/**
 * Reading text on screen the bubble should not cover when it has a choice:
 * headings, paragraphs and list items in the page, not cards' own controls.
 *
 * Measured in document coordinates and kept until the layout changes (the
 * page's height or width), so a call while scrolling only shifts the cached
 * boxes by the scroll instead of measuring hundreds of elements again. That
 * full measure, on every tip and every pause, forced a layout per call and
 * was part of the first scroll's stutter.
 */
let readingCache: { key: string; boxes: Rect[] } | null = null;
export function readingRects(): Rect[] {
  const root = document.documentElement;
  const key = `${root.scrollHeight}x${root.clientWidth}`;
  if (!readingCache || readingCache.key !== key) {
    const boxes: Rect[] = [];
    const y = window.scrollY;
    document.querySelectorAll("main h1, main h2, main h3, main p, main li").forEach((node) => {
      if (node.closest("#nex-bubble, [data-nex-host-live], nav")) return;
      const box = node.getBoundingClientRect();
      if (box.width === 0) return;
      boxes.push({ left: box.left, top: box.top + y, width: box.width, height: box.height });
    });
    readingCache = { key, boxes };
  }
  const y = window.scrollY;
  const height = window.innerHeight;
  const rects: Rect[] = [];
  for (const box of readingCache.boxes) {
    const top = box.top - y;
    if (top + box.height < 0 || top > height) continue;
    rects.push({ left: box.left, top, width: box.width, height: box.height });
  }
  return rects;
}

function TipContent({ text, tipSection, isMobile = false }: { text: string; tipSection: string; isMobile?: boolean }) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (hovered) return;
    const timer = window.setTimeout(() => dispatchCompanion({ type: "tip/expire" }), TIP_RULES.showMs);
    return () => window.clearTimeout(timer);
  }, [hovered]);
  // On a phone the tip card sits over the page: once the visitor scrolls
  // (they are reading on, not answering it) it goes, so it never covers
  // what scrolls under it. Opened in a still moment, it only stays in one.
  useEffect(() => {
    if (!isMobile) return;
    const start = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - start) > 24) dispatchCompanion({ type: "tip/expire" });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

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
            const section = tipSection;
            dispatchCompanion({ type: "tip/expire" });
            // Contact's tip is about checking a role: open straight into that.
            if (section === "contact") openRoleFit();
            else dispatchCompanion({ type: "ask/open" });
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
