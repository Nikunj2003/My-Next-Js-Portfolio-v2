"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { animate, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import GuideAvatar from "@/components/guide/GuideAvatar";
import { TwinBubble } from "@/components/guide/TwinBubble";
import { useGuideTour } from "@/components/guide/GuideTourNarrator";
import { SECTION_ANCHORS, SECTION_IDS } from "@/lib/guide/anchors";
import { emitGuide } from "@/lib/guide/bus";
import { dispatchCompanion, openAsk, openPanel, useCompanionState } from "@/lib/guide/companion-store";
import { pickSpot, type Dock, type Perches, type Rect } from "@/lib/guide/placement";
import { SECTION_TIPS, TIP_RULES } from "@/lib/guide/tips";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatAvailability } from "@/hooks/useChatAvailability";

const SIZE = 68;
const MOBILE_SIZE = 56;
const NAVBAR = 85;
const SPRING = { stiffness: 140, damping: 22, mass: 0.8 };
/** Over the hero (only with the ask bubble open) the companion sits under the CTAs, clear of the hero avatar. */
const HERO_ANCHOR = { side: "left" as const, yRatio: 0.5 };

/**
 * The scroll companion: a small live avatar that takes over from the hero
 * avatar once the hero scrolls away, then glides along the side margin to sit
 * beside whichever section is in the middle of the screen, facing it. Click it
 * to ask a question in a bubble right next to it.
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
  const [heroInView, setHeroInView] = useState(false);
  // The hero avatar only exists on the homepage at desktop widths.
  const [heroPresent, setHeroPresent] = useState(false);
  const heroVisible = heroPresent && heroInView;
  const [dock, setDock] = useState<Dock | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Position springs. Reduced motion jumps instead of gliding.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, SPRING);
  const springY = useSpring(rawY, SPRING);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(0);

  // Availability drives the "offline" sleep.
  useEffect(() => {
    if (status === "unknown" || status === "checking") return;
    emitGuide({ type: "availability", available: status !== "unavailable" });
  }, [status]);

  // Which section is at the middle of the screen.
  useEffect(() => {
    if (!isHome) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entered = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target.id);
        if (entered.length > 0) {
          const id = entered[entered.length - 1];
          setActiveSection(id);
          emitGuide({ type: "page/section", id });
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    [...SECTION_IDS, "hero"].forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [isHome]);

  // Hand-off: hidden while the hero avatar is on screen, with hysteresis.
  useEffect(() => {
    const hero = isHome ? document.querySelector("[data-guide-hero-avatar]") : null;
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // A hidden hero (mobile, display:none) has no box at all.
        setHeroPresent(entry.boundingClientRect.width > 0);
        setHeroInView((visible) => (visible ? entry.intersectionRatio > 0.3 : entry.intersectionRatio >= 0.6));
      },
      { threshold: [0, 0.3, 0.6, 1] }
    );
    observer.observe(hero);
    return () => {
      observer.disconnect();
      setHeroPresent(false);
    };
  }, [isHome, isMobile]);

  // Tips: after a short dwell on a section, offer its one-liner. The policy
  // decides whether one may show (budget, cooldown, nothing else open).
  useEffect(() => {
    if (!isHome || !activeSection || !SECTION_TIPS[activeSection]) return;
    const timer = window.setTimeout(
      () => dispatchCompanion({ type: "tip/offer", section: activeSection, text: SECTION_TIPS[activeSection], now: Date.now() }),
      TIP_RULES.dwellMs
    );
    return () => window.clearTimeout(timer);
  }, [activeSection, isHome]);

  // The tour is narrated by the companion, so it shows even over the hero.
  // An open conversation (ask bubble or full panel) keeps the companion up even
  // over the hero, so scrolling back to the top never yanks it away mid-answer.
  const askOpen = companion.bubble === "ask";
  const visible = (touring || askOpen || companion.panelOpen || !heroVisible) && !(isMobile && (askOpen || companion.panelOpen));

  useEffect(() => {
    dispatchCompanion({ type: "companion/visible", visible });
  }, [visible]);

  // Where to sit. Recomputed on section change, resize and viewport changes.
  const recompute = useCallback(() => {
    const column = document.querySelector("#main-content .container-narrow") ?? document.querySelector(".container-narrow");
    const rect = column?.getBoundingClientRect();
    const style = column ? getComputedStyle(column) : null;
    const vw = document.documentElement.clientWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const padLeft = style ? parseFloat(style.paddingLeft) : 0;
    const padRight = style ? parseFloat(style.paddingRight) : 0;
    const footer = document.querySelector("footer")?.getBoundingClientRect();
    // Follow the section in view, with the ask bubble open or not. Only the
    // tour and the full panel send it to the corner.
    const anchored = companion.bubble !== "tour";
    const section = activeSection === "hero" ? "hero" : activeSection;
    const anchor =
      isHome && anchored && !companion.panelOpen && section
        ? SECTION_ANCHORS[section] ?? (section === "hero" ? HERO_ANCHOR : null)
        : null;
    const next = pickSpot({
      perches: anchor && section ? measurePerches(section) : {},
      viewportWidth: vw,
      viewportHeight: vh,
      content: rect ? { left: rect.left + padLeft, right: rect.right - padRight } : { left: 0, right: vw },
      size,
      anchor,
      insetTop: NAVBAR,
      insetBottom: 0,
      footerTop: footer && footer.top < vh ? footer.top : null,
    });
    setDock((current) =>
      current && current.x === next.x && current.y === next.y && current.mode === next.mode && current.side === next.side && current.prefer[0] === next.prefer[0]
        ? current
        : next
    );
  }, [activeSection, companion.bubble, companion.panelOpen, isHome, size]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(recompute);
    return () => cancelAnimationFrame(frame);
  }, [recompute]);

  useEffect(() => {
    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    // The footer lift depends on scroll position, so check it while scrolling (throttled to frames).
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(recompute);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [recompute]);

  // Drive the springs: hand off from the hero avatar's position when appearing.
  const wasVisible = useRef(false);
  useEffect(() => {
    if (!dock) return;
    const hero = document.querySelector("[data-guide-hero-avatar]");
    const heroRect = hero?.getBoundingClientRect();
    const fromHero = heroRect && heroRect.width > 0;

    if (visible && !wasVisible.current) {
      if (fromHero && !reduceMotion) {
        const startY = Math.min(Math.max(heroRect.top + heroRect.height / 2, NAVBAR), window.innerHeight) - size / 2;
        springX.jump(heroRect.left + heroRect.width / 2 - size / 2);
        springY.jump(startY);
        scale.set(Math.min(3, heroRect.width / size));
        animate(scale, 1, { type: "spring", stiffness: 160, damping: 24 });
      } else {
        springX.jump(dock.x);
        springY.jump(dock.y);
        scale.set(1);
      }
      animate(opacity, 1, { duration: reduceMotion ? 0 : 0.18 });
    }

    if (!visible && wasVisible.current) {
      if (fromHero && !reduceMotion) {
        rawX.set(heroRect.left + heroRect.width / 2 - size / 2);
        rawY.set(Math.min(Math.max(heroRect.top + heroRect.height / 2, NAVBAR), window.innerHeight) - size / 2);
        animate(scale, Math.min(3, heroRect.width / size), { duration: 0.35 });
      }
      animate(opacity, 0, { duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.2 });
    }

    wasVisible.current = visible;
    if (!visible) return;
    if (reduceMotion) {
      springX.jump(dock.x);
      springY.jump(dock.y);
    } else {
      rawX.set(dock.x);
      rawY.set(dock.y);
    }
  }, [dock, opacity, rawX, rawY, reduceMotion, scale, size, springX, springY, visible]);

  // Face the content: up at the panel it sits under, across from the gutter, up and left from the corner.
  const lookAt: readonly [number, number] | null =
    dock?.mode === "perch"
      ? [0.35, 0.3]
      : dock?.mode === "gutter"
        ? [dock.side === "left" ? 0.7 : -0.7, -0.05]
        : dock
          ? [-0.45, 0.25]
          : null;

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
      buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [companion.bubble, companion.panelOpen]);

  return (
    <>
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-50"
        style={{ x: springX, y: springY, scale, opacity, width: size, height: size, transformOrigin: "50% 50%" }}
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
          <GuideAvatar size={size - 16} lookAt={lookAt} settleAfterMs={10_000} />
        </button>
      </motion.div>

      <TwinBubble
        anchorX={springX}
        anchorY={springY}
        size={size}
        dock={dock}
        visible={visible}
        isMobile={isMobile}
        activeSection={isHome ? activeSection ?? "hero" : null}
        onExpand={() => openPanel()}
        returnFocus={() => buttonRef.current?.focus()}
        tourContent={narrator}
      />
      <p className="sr-only" role="status" aria-live="polite">{tourAnnouncement}</p>
    </>
  );
}

/**
 * The free space each section offers the companion, measured live. About,
 * Experience and Skills have a sticky intro card in the left column with empty
 * space beneath it; Work has a centred header with room on its left; the AI
 * Twin and Contact cards have a top edge to perch on.
 */
function measurePerches(section: string): Perches {
  const root = document.getElementById(section);
  if (!root) return {};
  const rect = (el: Element | null | undefined): Rect | null => {
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return box.width > 0 ? { left: box.left, top: box.top, width: box.width, height: box.height } : null;
  };
  if (section === "about" || section === "experience" || section === "skills") {
    return { under: rect(root.querySelector(".panel-sticky")) };
  }
  if (section === "work") {
    return { beside: rect(root.querySelector(".container-narrow > div")), onTop: rect(root.querySelector('[data-guide-target="work-featured"]')) };
  }
  if (section === "ai-twin") return { onTop: rect(root.querySelector(".container-narrow > div")) };
  if (section === "hero") {
    // The right column's free space: the companion stands where the hero
    // avatar's buttons are and the bubble opens beside it, clear of the copy.
    return { hero: rect(root.querySelector('[data-guide-hero-avatar]')) };
  }
  if (section === "contact") return { onTop: rect(root.querySelector(".grid.items-stretch")) };
  return {};
}
