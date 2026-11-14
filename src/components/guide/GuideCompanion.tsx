"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import GuideAvatar from "@/components/guide/GuideAvatar";
import { TwinBubble } from "@/components/guide/TwinBubble";
import { useGuideTour } from "@/components/guide/GuideTourNarrator";
import { SECTION_IDS } from "@/lib/guide/anchors";
import { emitGuide } from "@/lib/guide/bus";
import { dispatchCompanion, openAsk, openPanel, setHeroVisible, useCompanionState } from "@/lib/guide/companion-store";
import {
  activeSectionAt,
  blendPoint,
  clampToViewport,
  cornerPoint,
  easeInOutCubic,
  gutterPoint,
  type BubbleSide,
  type Point,
  type Viewport,
} from "@/lib/guide/placement";
import { SECTION_TIPS, TIP_RULES } from "@/lib/guide/tips";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatAvailability } from "@/hooks/useChatAvailability";

const SIZE = 68;
const MOBILE_SIZE = 56;
const NAVBAR = 85;
/** How long the glide between two sections' spots takes. */
const GLIDE_MS = 650;
/** The shortest time the hero hand-off can take, however fast the scroll. */
const MORPH_MS = 450;
/** Per-frame movement above this while riding is a discontinuity, smoothed into a glide. */
const MAX_RIDE_STEP = 90;

/**
 * A spot is a rule for where the avatar sits, evaluated every frame: either
 * riding on an element in the page (so it scrolls with that element exactly,
 * with no lag) or fixed to the screen (the margin, the corner).
 */
type SpotRule = {
  key: string;
  /** Where the avatar's top-left is right now, or null when the spot doesn't exist at this size. */
  point: (size: number, viewport: Viewport) => Point | null;
  /** Sides its bubble may open on, in order of preference. */
  prefer: BubbleSide[];
};

/**
 * The scroll companion: a small live avatar that takes over from the hero
 * avatar once the hero scrolls away and travels down the page with the
 * visitor, sitting in the free space of each section: under the sticky intro
 * panels of About, Experience and Skills (so it rides with the panel), at the
 * top corner of the Work, AI Twin and Contact blocks, or in the left margin.
 * When the section changes it glides to the new spot, eased, in about half a
 * second. Its bubble (ask box, tip or tour) is placed in the same frame as the
 * avatar, so it moves with it exactly.
 *
 * Positioned in a fixed, pointer-transparent layer; only the avatar button and
 * the bubble take pointer events, so it never blocks the page.
 */
export default function GuideCompanion() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isMobile = useIsMobile();
  const reduceMotion = Boolean(useReducedMotion());
  const companion = useCompanionState();
  const { status } = useChatAvailability();
  const size = isMobile ? MOBILE_SIZE : SIZE;
  const { narrator, announcement: tourAnnouncement, touring } = useGuideTour(isMobile);

  const [activeSection, setActiveSection] = useState<string | null>(null);
  // The hero avatar reports itself (desktop homepage only, with hysteresis).
  const heroVisible = isHome && companion.heroVisible;
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Written by the frame loop below, read by the avatar layer and the bubble.
  const posX = useMotionValue(0);
  const posY = useMotionValue(0);
  const opacity = useMotionValue(0);
  const scale = useMotionValue(1);
  const [spotKind, setSpotKind] = useState<"ride" | "corner">("ride");

  // Availability drives the "offline" sleep.
  useEffect(() => {
    if (status === "unknown" || status === "checking") return;
    emitGuide({ type: "availability", available: status !== "unavailable" });
  }, [status]);

  // One character at a time. While the hero avatar is on screen it is the
  // guide, and hosts the ask box itself; the companion only appears once the
  // hero scrolls away, carrying the same conversation on. The tour is the
  // exception: the companion narrates it from the corner. On phones the ask
  // and the panel are full sheets, so the companion steps aside for them.
  const askOpen = companion.bubble === "ask";
  const visible = (touring || !heroVisible) && !(isMobile && (askOpen || companion.panelOpen));

  useEffect(() => {
    dispatchCompanion({ type: "companion/visible", visible });
  }, [visible]);

  // Appearing and leaving away from the hero (other pages, the tour, the
  // panel) is a short fade in place; the hero hand-off is drawn by the loop.
  const fade = useMotionValue(0);
  useEffect(() => {
    const animation = animate(fade, visible ? 1 : 0, { duration: reduceMotion ? 0 : visible ? 0.2 : 0.15 });
    return () => animation.stop();
  }, [fade, reduceMotion, visible]);

  // The rule for where to sit: per section on the homepage, the corner for the
  // tour, the panel, other pages and narrow screens.
  const cornerOnly = touring || companion.panelOpen || !isHome;
  const rule = useMemo<SpotRule>(() => {
    if (cornerOnly || !activeSection) {
      if (!cornerOnly && isHome && !activeSection) return marginRule("margin");
      return CORNER;
    }
    return SECTION_RULES[activeSection] ?? marginRule(activeSection);
  }, [activeSection, cornerOnly, isHome]);

  // The frame loop. Every frame: pick the section that owns the screen, read
  // the current rule's point from the live layout, blend from the previous
  // rule's point while a glide is running, clamp to the screen and write it.
  // It reads a few rects and writes two motion values, so it is cheap, and
  // because the read and the write happen in the same frame nothing trails.
  const ruleRef = useRef(rule);
  const glideRef = useRef<{ from: Point; start: number } | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const kindRef = useRef<"ride" | "corner">("ride");
  useLayoutEffect(() => {
    if (ruleRef.current.key === rule.key) return;
    // Start the glide from wherever the avatar is now.
    if (lastPointRef.current && !reduceMotion) glideRef.current = { from: lastPointRef.current, start: performance.now() };
    ruleRef.current = rule;
  }, [reduceMotion, rule]);

  const reduceMotionRef = useRef(reduceMotion);
  const isMobileRef = useRef(isMobile);
  useLayoutEffect(() => {
    reduceMotionRef.current = reduceMotion;
    isMobileRef.current = isMobile;
  }, [isMobile, reduceMotion]);

  const morphRef = useRef(0);
  const lastTickRef = useRef(0);
  const sectionRef = useRef<string | null>(null);
  const visibleRef = useRef(visible);
  const touringRef = useRef(touring);
  useLayoutEffect(() => {
    visibleRef.current = visible;
    touringRef.current = touring;
  }, [touring, visible]);

  useEffect(() => {
    let frame = 0;
    const footer = () => document.querySelector("footer");
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const viewport: Viewport = { width: document.documentElement.clientWidth, height: window.innerHeight, insetTop: NAVBAR, insetBottom: 0 };

      if (isHome) {
        const sections = ["hero", ...SECTION_IDS]
          .map((id) => {
            const node = document.getElementById(id);
            if (!node) return null;
            const box = node.getBoundingClientRect();
            return { id, top: box.top, bottom: box.bottom };
          })
          .filter((section): section is { id: string; top: number; bottom: number } => section !== null);
        const next = activeSectionAt(sections, viewport.height, sectionRef.current);
        if (next !== sectionRef.current) {
          sectionRef.current = next;
          setActiveSection(next);
          if (next) emitGuide({ type: "page/section", id: next });
        }
      }

      // The hero hand-off, tied to the scroll position rather than a timer:
      // as the hero avatar slides under the navbar it shrinks and fades, and
      // the companion grows out of it on its way to its spot. Scrolling back
      // up plays it in reverse. `morph` is 0 with the hero fully in view and 1
      // once it has handed over.
      const hero = isHome && !isMobileRef.current ? document.querySelector<HTMLElement>("[data-guide-hero-avatar]") : null;
      const heroBox = hero?.getBoundingClientRect();
      const heroHere = Boolean(hero && heroBox && heroBox.width > 0) && !touringRef.current && !reduceMotionRef.current;
      // The scroll sets where the hand-off should be; the drawn value follows
      // it at a capped rate, so a fast scroll plays the whole hand-off over a
      // few hundred milliseconds instead of skipping it in one frame.
      const wanted = heroHere && heroBox ? clamp01((NAVBAR - heroBox.top) / (heroBox.height * 0.75)) : 1;
      const dt = lastTickRef.current ? Math.min(64, now - lastTickRef.current) : 16;
      lastTickRef.current = now;
      const maxStep = dt / MORPH_MS;
      const drawn = morphRef.current;
      const morph = heroHere ? drawn + clamp(wanted - drawn, -maxStep, maxStep) : 1;
      morphRef.current = morph;
      if (hero) {
        const eased = heroHere ? easeInOutCubic(morph) : 0;
        hero.style.opacity = eased > 0 ? String(1 - eased) : "";
        hero.style.transform = eased > 0 ? `scale(${1 - 0.45 * eased})` : "";
      }

      // Nothing to draw while hidden and not mid hand-off; keep tracking the section only.
      const handingOff = heroHere && morph > 0 && morph < 1;
      // The hand-off point decides which avatar is the guide (and hosts the
      // ask box), so the conversation moves exactly when the avatars swap.
      if (hero) setHeroVisible(heroHere ? morph < 0.5 : heroBox ? heroBox.bottom > NAVBAR + heroBox.height * 0.5 && heroBox.width > 0 : false);
      if (!visibleRef.current && !handingOff) {
        lastPointRef.current = null;
        glideRef.current = null;
        opacity.set(fade.get());
        return;
      }

      const current = ruleRef.current;
      const fallback = CORNER.point(size, viewport)!;
      let target = current.point(size, viewport) ?? marginRule("").point(size, viewport) ?? fallback;
      const footerTop = footer()?.getBoundingClientRect().top ?? null;
      target = clampToViewport(target, size, viewport, footerTop);

      let point = target;
      const glide = glideRef.current;
      if (glide) {
        const t = (now - glide.start) / GLIDE_MS;
        if (t >= 1) glideRef.current = null;
        else point = blendPoint(glide.from, target, easeInOutCubic(t));
      }
      const last = lastPointRef.current;
      if (heroHere && heroBox && morph < 1) {
        // Mid hand-off: from the hero avatar's centre (kept on screen) to the spot.
        const from = clampToViewport({ x: heroBox.left + heroBox.width / 2 - size / 2, y: heroBox.top + heroBox.height / 2 - size / 2 }, size, viewport);
        const eased = easeInOutCubic(morph);
        point = blendPoint(from, target, eased);
        glideRef.current = null;
        const startScale = Math.min(3.2, (heroBox.width * 0.8) / size);
        scale.set(startScale + (1 - startScale) * eased);
        opacity.set(clamp01((morph - 0.05) / 0.3));
      } else if (!last) {
        point = target; // appearing: straight to the spot
      } else if (!glideRef.current) {
        // Riding: follow the spot exactly, except when it moves by more than a
        // scroll can explain in one frame (a panel un-sticking, the clamp
        // engaging). Then catch up with a short eased glide instead of a snap.
        const step = Math.hypot(point.x - last.x, point.y - last.y);
        if (step > MAX_RIDE_STEP && !reduceMotionRef.current) {
          glideRef.current = { from: last, start: now };
          point = blendPoint(last, target, easeInOutCubic(16 / GLIDE_MS));
        }
      }

      if (!(heroHere && morph < 1)) {
        scale.set(1);
        opacity.set(visibleRef.current ? (heroHere ? 1 : fade.get()) : 0);
      } else if (morph <= 0) {
        opacity.set(0);
      }

      lastPointRef.current = point;
      posX.set(Math.round(point.x * 2) / 2);
      posY.set(Math.round(point.y * 2) / 2);

      const kind = current === CORNER || target.x === fallback.x ? "corner" : "ride";
      if (kind !== kindRef.current) {
        kindRef.current = kind;
        setSpotKind(kind);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      const hero = document.querySelector<HTMLElement>("[data-guide-hero-avatar]");
      if (hero) {
        hero.style.opacity = "";
        hero.style.transform = "";
      }
    };
  }, [fade, isHome, opacity, posX, posY, scale, size]);

  // Tips: after a short dwell on a section, offer its one-liner. The policy
  // decides whether one may show (budget, cooldown, nothing else open).
  useEffect(() => {
    if (!isHome || !activeSection || !SECTION_TIPS[activeSection]) return;
    const offer = () => dispatchCompanion({ type: "tip/offer", section: activeSection, text: SECTION_TIPS[activeSection], now: Date.now() });
    let interval = 0;
    const timer = window.setTimeout(() => {
      offer();
      interval = window.setInterval(offer, 5000);
    }, TIP_RULES.dwellMs);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [activeSection, isHome]);

  // Face the content. Memoised so the avatar's frame loop isn't woken by a new array each render.
  const lookAt = useMemo<readonly [number, number]>(() => (spotKind === "corner" ? [-0.45, 0.25] : [0.6, 0]), [spotKind]);

  // Focus goes back to whatever opened the bubble when the companion is
  // hidden (over the hero), otherwise to the companion. Never scrolls.
  const openerRef = useRef<HTMLElement | null>(null);
  const lastBubble = useRef(companion.bubble);
  useEffect(() => {
    if (companion.bubble !== "none" && lastBubble.current === "none") {
      const active = document.activeElement;
      openerRef.current = active instanceof HTMLElement && active !== document.body && !active.closest("#twin-bubble") ? active : null;
    }
    lastBubble.current = companion.bubble;
  }, [companion.bubble]);
  const returnFocus = useCallback(() => {
    const button = buttonRef.current;
    if (visible && button) {
      button.focus({ preventScroll: true });
      return;
    }
    const opener = openerRef.current;
    if (opener?.isConnected && opener.getClientRects().length > 0) opener.focus({ preventScroll: true });
  }, [visible]);

  const toggle = () => {
    if (companion.bubble === "ask") dispatchCompanion({ type: "ask/close" });
    else openAsk();
  };

  // Escape closes the bubble, then the panel.
  useEffect(() => {
    if (companion.bubble === "none" && !companion.panelOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (companion.bubble === "none") return; // the panel handles its own Escape
      event.preventDefault();
      dispatchCompanion({ type: "escape" });
      returnFocus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [companion.bubble, companion.panelOpen, returnFocus]);

  return (
    <>
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-50"
        style={{ x: posX, y: posY, scale, opacity, width: size, height: size, transformOrigin: "50% 50%" }}
        aria-hidden={!visible}
      >
        <button
          ref={buttonRef}
          type="button"
          data-guide-companion-button
          tabIndex={visible ? 0 : -1}
          onClick={toggle}
          onMouseDown={(event) => event.preventDefault()}
          onPointerEnter={() => emitGuide({ type: "page/hover", active: true })}
          onPointerLeave={() => emitGuide({ type: "page/hover", active: false })}
          onFocus={() => emitGuide({ type: "page/hover", active: true })}
          onBlur={() => emitGuide({ type: "page/hover", active: false })}
          aria-label={companion.bubble === "ask" ? "Close the AI Twin" : "Ask Nikunj's AI Twin a question"}
          aria-expanded={companion.bubble === "ask"}
          aria-controls="twin-bubble"
          className={
            "relative flex h-full w-full items-center justify-center rounded-full bg-[#090e1a]/90 ring-1 ring-primary/40 shadow-accent-card transition-shadow duration-300 hover:shadow-[0_16px_36px_hsl(var(--accent)/0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
            (visible ? "pointer-events-auto cursor-pointer" : "pointer-events-none")
          }
        >
          <GuideAvatar size={size - 16} lookAt={lookAt} settleAfterMs={10_000} paused={!visible} />
        </button>
      </motion.div>

      <TwinBubble
        anchorX={posX}
        anchorY={posY}
        anchorSize={size}
        prefer={rule.prefer}
        spotKey={rule.key}
        corner={spotKind === "corner"}
        visible={visible}
        isMobile={isMobile}
        activeSection={isHome ? activeSection ?? "hero" : null}
        onExpand={() => openPanel()}
        returnFocus={returnFocus}
        tourContent={narrator}
      />
      <p className="sr-only" role="status" aria-live="polite">{tourAnnouncement}</p>
    </>
  );
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/* ------------------------------------------------------------------------ */
/* Spots                                                                     */
/* ------------------------------------------------------------------------ */

function contentLeft() {
  const column = document.querySelector("#main-content .container-narrow") ?? document.querySelector(".container-narrow");
  if (!column) return 0;
  const box = column.getBoundingClientRect();
  return box.left + (parseFloat(getComputedStyle(column).paddingLeft) || 0);
}

/** The left margin, at mid-height. Fixed to the screen. */
function marginRule(key: string): SpotRule {
  return { key: `margin:${key}`, prefer: ["right", "bottom", "top"], point: (size, viewport) => gutterPoint(contentLeft(), size, viewport) };
}

const CORNER: SpotRule = { key: "corner", prefer: ["left", "top"], point: (size, viewport) => cornerPoint(size, viewport) };

/** Is this element laid out as a sticky side column right now (desktop)? */
function stickyPanel(section: string) {
  const panel = document.getElementById(section)?.querySelector<HTMLElement>(".panel-sticky");
  const column = panel?.parentElement?.parentElement ?? panel?.parentElement;
  if (!panel || !column) return null;
  return getComputedStyle(column).position === "sticky" || getComputedStyle(panel.parentElement!).position === "sticky" ? panel : null;
}

/**
 * Under a sticky intro panel (About, Experience, Skills): it rides with the
 * panel, so while the panel is pinned the avatar is still, and when the panel
 * scrolls away the avatar scrolls with it, both exactly. Clamped to stay on
 * screen. Without the sticky layout (narrow screens) it falls back to the margin.
 */
function underPanelRule(section: string): SpotRule {
  return {
    key: `under:${section}`,
    // Below the avatar, in the free space under the panel, when it fits.
    prefer: ["bottom", "right", "top"],
    point: (size, viewport) => {
      const panel = stickyPanel(section);
      if (!panel) return gutterPoint(contentLeft(), size, viewport);
      const box = panel.getBoundingClientRect();
      // Sits in the space under the panel, near its left edge. While the panel
      // is pinned (its bottom high on screen) there is room below the avatar
      // for the bubble, as in the screenshot the visitor expects.
      return { x: box.left + 20, y: box.bottom + 24 };
    },
  };
}

/**
 * At the top-left corner of a section's block (Work header, AI Twin card,
 * Contact grid): rides with it as it scrolls, held on screen by the clamp
 * once the block's top has scrolled past.
 */
function blockCornerRule(section: string, selector: string, offset: Point = { x: 0, y: 0 }): SpotRule {
  return {
    key: `block:${section}`,
    prefer: ["right", "bottom", "top"],
    point: (size, viewport) => {
      const block = document.getElementById(section)?.querySelector(selector);
      const left = contentLeft();
      if (!block) return gutterPoint(left, size, viewport);
      const box = block.getBoundingClientRect();
      // In the margin beside the block where there is room, else just inside it.
      const gutter = gutterPoint(left, size, viewport);
      const x = gutter ? gutter.x : box.left + 16 + offset.x;
      return { x, y: box.top + offset.y };
    },
  };
}

const SECTION_RULES: Record<string, SpotRule> = {
  hero: marginRule("hero"),
  about: underPanelRule("about"),
  experience: underPanelRule("experience"),
  skills: underPanelRule("skills"),
  work: blockCornerRule("work", '[data-guide-target="work-featured"]', { x: 0, y: -12 }),
  "ai-twin": blockCornerRule("ai-twin", ".container-narrow > div", { x: 0, y: 24 }),
  contact: blockCornerRule("contact", ".grid.items-stretch", { x: 0, y: 24 }),
};
