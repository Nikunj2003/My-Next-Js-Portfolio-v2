"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { animate, cancelFrame, frame as frameLoop, motion, useMotionValue, useReducedMotion } from "framer-motion";
import GuideAvatar from "@/components/guide/GuideAvatar";
import { StaticGuideMark, prefersStatic } from "@/components/guide/GuideAvatarSlot";
import { NexBubble } from "@/components/guide/NexBubble";
import { useGuideTour } from "@/components/guide/GuideTourNarrator";
import { SECTION_IDS } from "@/lib/guide/anchors";
import { emitGuide } from "@/lib/guide/bus";
import { dispatchCompanion, getCompanionState, openAsk, openPanel, setHeroVisible, useCompanionState } from "@/lib/guide/companion-store";
import {
  activeSectionAt,
  blendPoint,
  clampToViewport,
  cornerPoint,
  easeInOutCubic,
  FADE_SHARE,
  gutterPoint,
  heroHandoffFrame,
  heroFaceScale,
  heroHandoffProgress,
  routeTravelFrame,
  routeTravelMs,
  underPanelPoint,
  type BubbleSide,
  type Point,
  type Viewport,
} from "@/lib/guide/placement";
import { SECTION_TIPS, TIP_RULES } from "@/lib/guide/tips";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatAvailability } from "@/hooks/useChatAvailability";
import { NAVBAR_CLEARANCE as NAVBAR } from "@/lib/scroll";

const SIZE = 68;
const MOBILE_SIZE = 56;
/** How long the glide between two sections' spots takes. */
const GLIDE_MS = 650;
/** The hand-off progress at which the conversation moves (mid cross-fade, while both are one disc). */
const HANDOFF_SWAP_AT = 0.22;
/**
 * How the hand-off maps onto scrolling: it begins once the visitor has
 * scrolled HANDOFF_LEAD px from where the hero avatar rests, and runs over
 * HANDOFF_SPAN of the screen height. It used to begin only as the avatar
 * reached the navbar and finish 450px later, so one flick of the wheel (Lenis
 * eases ~300px in about 0.4s) played the whole hand-off in a blink.
 */
const HANDOFF_LEAD = 40;
const HANDOFF_SPAN = 1.1;
function handoffProgress(heroBox: { top: number }, viewport: Viewport) {
  // Measured from the hero's place at the top of the page (its top plus the
  // scroll so far), so the start doesn't depend on the screen's height.
  const restingTop = heroBox.top + window.scrollY;
  return heroHandoffProgress(heroBox.top, restingTop - HANDOFF_LEAD, viewport.height * HANDOFF_SPAN);
}
/** How long after mounting the page counts as still settling (scroll restore, hero entrance). */
const SETTLE_MS = 300;
/** Per-frame movement above this while riding is a discontinuity, smoothed into a glide. */
const MAX_RIDE_STEP = 90;
/** While a tip is waiting its turn (cooldown, another bubble), ask again this often. */
const TIP_RETRY_MS = 5000;

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
 * top corner of the Work, Nex and Contact blocks, or in the left margin.
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
  const mirrorRef = useRef<HTMLSpanElement>(null);

  // Written by the frame loop below, read by the avatar layer and the bubble.
  const posX = useMotionValue(0);
  const posY = useMotionValue(0);
  const opacity = useMotionValue(0);
  const scale = useMotionValue(1);
  const [spotKind, setSpotKind] = useState<"ride" | "corner">("ride");
  // Save-data and low-memory devices get the still drawing, as the hero does.
  const [lowPower] = useState(() => typeof navigator !== "undefined" && prefersStatic());
  // True while the hero hand-off is between its ends (set by the loop on change only).
  const [handingOffState, setHandingOffState] = useState(false);
  // Past the cross-fade but still on its way to the spot (the hero is gone).
  const [travelling, setTravelling] = useState(false);
  const travellingRef = useRef(false);
  const handingOffRef = useRef(false);

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
  // On the homepage nothing is decided until the loop has seen the settled
  // page: `heroVisible` starts false, so without this the companion counted
  // as visible on every load, was drawn, then faded out once the hero
  // reported in (the flash on arrival and refresh).
  const [settled, setSettled] = useState(false);
  // A new page settles afresh (the trip between pages starts from that moment).
  const [settledPath, setSettledPath] = useState(pathname);
  if (settledPath !== pathname) {
    setSettledPath(pathname);
    setSettled(false);
  }
  const visible = settled && (touring || !heroVisible) && !(isMobile && (askOpen || companion.panelOpen));

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
  // Phones scroll natively (touch bypasses Lenis), and a main-thread loop
  // riding on content always trails a compositor scroll, so there it sits in
  // the corner instead.
  const cornerOnly = touring || companion.panelOpen || isMobile;
  const route = routeKind(pathname);
  const rule = useMemo<SpotRule>(() => {
    if (cornerOnly) return CORNER;
    // Other pages have spots of their own (the case study's table of
    // contents, the index's headings); only an unknown page uses the corner.
    if (route !== "home") return ROUTE_RULES[route] ?? CORNER;
    if (!activeSection) return marginRule("margin");
    return SECTION_RULES[activeSection] ?? marginRule(activeSection);
  }, [activeSection, cornerOnly, route]);

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

  const settledRef = useRef(false);
  const mountedAtRef = useRef(0);
  /** A trip between pages in progress: from where the avatar was on the page it left. */
  const travelRef = useRef<{ from: Point; fromScale: number; start: number; ms: number; toHero: boolean } | null>(null);
  const reduceMotionRef = useRef(reduceMotion);
  const isMobileRef = useRef(isMobile);
  useLayoutEffect(() => {
    reduceMotionRef.current = reduceMotion;
    isMobileRef.current = isMobile;
  }, [isMobile, reduceMotion]);

  const sectionRef = useRef<string | null>(null);
  const visibleRef = useRef(visible);
  const touringRef = useRef(touring);
  useLayoutEffect(() => {
    visibleRef.current = visible;
    touringRef.current = touring;
  }, [touring, visible]);

  useEffect(() => {
    mountedAtRef.current = performance.now();
    // Coming back to the homepage is a fresh load for the hero: wait for it again.
    settledRef.current = false;
    // Arriving from another page (a link, the agent, the back button): hop
    // from where the avatar was on screen to its spot here, instead of
    // appearing there. Nothing to travel from on the first load.
    const departed = lastDrawn;
    travelRef.current = departed && departed.path !== pathname && !reduceMotionRef.current && performance.now() - departed.at < 4000
      ? { from: departed.point, fromScale: departed.scale, start: -1, ms: 0, toHero: false }
      : null;
    lastPointRef.current = null;
    glideRef.current = null;
    clearLayoutCache();
    watchLayoutCache();
    const footer = () => cachedNode("footer", () => document.querySelector("footer"));
    // Runs on Framer Motion's frame loop, in its update step: after Lenis has
    // scrolled (SmoothScroll drives Lenis from the read step) and before the
    // render step, so the avatar, the hero and the bubble are all drawn in the
    // frame the page moved in. A separate requestAnimationFrame could run
    // before Lenis and draw last frame's scroll.
    const tick = ({ timestamp: now }: { timestamp: number }) => {
      const viewport: Viewport = { width: document.documentElement.clientWidth, height: window.innerHeight, insetTop: NAVBAR, insetBottom: 0 };

      if (isHome) {
        const sections = ["hero", ...SECTION_IDS]
          .map((id) => {
            const node = cachedNode(`section:${id}`, () => document.getElementById(id));
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
      const hero = isHome && !isMobileRef.current ? cachedNode<HTMLElement>("hero", () => document.querySelector<HTMLElement>("[data-guide-hero-avatar]")) : null;
      // The hero's layout box, without the scale and fade this loop applies to
      // it: measuring the transformed box fed each frame's shrink back into the
      // next frame's progress, so the hand-off never settled (and thrashed
      // around its midpoint, where the conversation swaps between the two).
      const heroBox = hero ? heroLayoutRect(hero) : undefined;
      const heroHere = Boolean(hero && heroBox && heroBox.width > 0) && !touringRef.current && !reduceMotionRef.current;
      // On a load or a refresh nothing is drawn until the page has settled:
      // the hero column is still fading in and the browser may still be
      // restoring a scrolled position. Animating the hand-off from that
      // half-built state is what played a stray hand-off on every refresh.
      // Once settled, the companion simply appears at its spot (or stays
      // hidden over the hero); the hand-off only ever plays from real scrolling.
      if (!settledRef.current) {
        // The hero's intro has ended (HeroIntro sets this, at once when it
        // doesn't play), so the hand-off never starts from a half-built hero.
        const columnShown = !hero || document.documentElement.hasAttribute("data-hero-ready");
        if ((!isHome || now - mountedAtRef.current > SETTLE_MS) && columnShown) {
          settledRef.current = true;
          // Decide who is the guide from the settled page, before anything is drawn.
          const heroGuides = Boolean(hero && heroHere && heroBox && handoffProgress(heroBox, viewport) < HANDOFF_SWAP_AT);
          if (hero) setHeroVisible(heroGuides);
          setSettled(true);
          const travel = travelRef.current;
          if (travel) {
            travel.start = now;
            travel.toHero = heroGuides;
            if (heroGuides && heroBox) {
              const to = { x: heroBox.left + heroBox.width / 2 - size / 2, y: heroBox.top + heroBox.height / 2 - size / 2 };
              travel.ms = routeTravelMs(travel.from, to);
            }
          } else opacity.set(0);
          return;
        } else {
          // Waiting for the new page: hold where it was, so the trip starts there.
          const travel = travelRef.current;
          if (travel) {
            posX.set(travel.from.x);
            posY.set(travel.from.y);
            scale.set(travel.fromScale);
            opacity.set(1);
            if (hero) {
              hero.style.transform = "";
              hero.style.opacity = "0";
            }
          } else opacity.set(0);
          if (hero && !travel) {
            hero.style.transform = "";
            hero.style.opacity = "";
          }
          return;
        }
      }
      // A trip between pages: one hop from where it was to where it belongs
      // here, read from the live layout every frame so it lands exactly. Into
      // the homepage with the hero on screen, it lands on the hero avatar and
      // hands over to it (the hero fades in under it as it arrives).
      const travel = travelRef.current;
      if (travel && travel.start >= 0) {
        const heroTarget = travel.toHero && hero && heroBox ? heroBox : null;
        const to = heroTarget
          ? { x: heroTarget.left + heroTarget.width / 2 - size / 2, y: heroTarget.top + heroTarget.height / 2 - size / 2 }
          : clampToViewport(ruleRef.current.point(size, viewport) ?? marginRule("").point(size, viewport) ?? CORNER.point(size, viewport)!, size, viewport, footer()?.getBoundingClientRect().top ?? null);
        if (!travel.ms) travel.ms = routeTravelMs(travel.from, to);
        const t = Math.min(1, (now - travel.start) / travel.ms);
        // Landing on the hero: grow to its face size, then hand over.
        const heroScale = heroTarget ? heroFaceScale(heroTarget.width, size) : 1;
        const hop = routeTravelFrame({ t, from: travel.from, to, fromScale: travel.fromScale, toScale: heroScale });
        posX.set(Math.round(hop.position.x * 2) / 2);
        posY.set(Math.round(hop.position.y * 2) / 2);
        scale.set(hop.scale);
        if (heroTarget && hero) {
          // The last fifth: the hero takes over, the small one fades into it.
          const swap = Math.max(0, (t - 0.8) / 0.2);
          hero.style.transform = "";
          hero.style.opacity = String(swap);
          opacity.set(1 - swap);
        } else opacity.set(1);
        if (t >= 1) {
          travelRef.current = null;
          lastPointRef.current = heroTarget ? null : to;
          if (hero) hero.style.opacity = "";
          if (heroTarget) opacity.set(0);
        }
        return;
      }

      // Hand-off progress: a plain function of the scroll position (0 as the
      // hero avatar's top reaches the navbar, 1 a scroll of 70% of its height
      // later). No smoothing and no timer: the same scroll position always
      // draws the same frame, a stop mid-way holds mid-way, and scrolling back
      // plays the same frames in reverse. Lenis already smooths the scroll.
      const morph = heroHere && heroBox ? handoffProgress(heroBox, viewport) : 1;
      const heroCentre = heroBox ? { x: heroBox.left + heroBox.width / 2, y: heroBox.top + heroBox.height / 2 } : { x: 0, y: 0 };
      // Styles the hero from the same hand-off frame the companion is drawn
      // from, so the two can't disagree by a frame.
      const styleHero = (frame: ReturnType<typeof heroHandoffFrame> | null) => {
        if (!hero) return;
        hero.style.transform = frame ? `translate(${frame.heroOffset.x}px, ${frame.heroOffset.y}px) scale(${frame.heroScale})` : "";
        hero.style.opacity = frame ? String(frame.heroOpacity) : "";
        // A faded hero must not catch clicks meant for the page or the companion.
        hero.style.pointerEvents = frame && frame.heroOpacity < 0.5 ? "none" : "";
      };

      // Nothing to draw while hidden and not mid hand-off; keep tracking the section only.
      const handingOff = heroHere && morph > 0 && morph < 1;
      // The copied hero face is only needed while the two discs overlap
      // (the cross-fade); after it the hero is invisible and the companion's
      // own avatar takes over for the rest of its trip, facing where it goes.
      const mirroring = handingOff && morph < FADE_SHARE;
      const onTheWay = handingOff && !mirroring;
      if (onTheWay !== travellingRef.current) {
        travellingRef.current = onTheWay;
        setTravelling(onTheWay);
      }
      if (mirroring !== handingOffRef.current) {
        handingOffRef.current = mirroring;
        setHandingOffState(mirroring);
      }
      // The hand-off point decides which avatar is the guide (and hosts the
      // ask box), so the conversation moves exactly when the avatars swap.
      if (hero) setHeroVisible(heroHere ? morph < HANDOFF_SWAP_AT : heroBox ? heroBox.bottom > NAVBAR + heroBox.height * 0.5 && heroBox.width > 0 : false);
      if (!visibleRef.current && !handingOff) {
        // The big hero avatar is the guide: a trip to another page starts from it.
        // (Recorded here because by the time this effect cleans up after a route
        // change, the hero has already left the DOM.)
        if (heroHere && heroBox && getCompanionState().heroVisible && heroBox.bottom > 0 && heroBox.top < viewport.height) {
          lastDrawn = { point: { x: heroBox.left + heroBox.width / 2 - size / 2, y: heroBox.top + heroBox.height / 2 - size / 2 }, scale: heroFaceScale(heroBox.width, size), at: performance.now(), path: pathname };
        }
        lastPointRef.current = null;
        glideRef.current = null;
        // Over the hero the hand-off owns the opacity: hidden. (Fading out on
        // the generic timer here is what let the small avatar linger after the
        // hero had already come back.)
        opacity.set(heroHere ? 0 : fade.get());
        styleHero(null);
        return;
      }

      const current = ruleRef.current;
      const fallback = CORNER.point(size, viewport)!;
      const ruled = current.point(size, viewport) ?? marginRule("").point(size, viewport);
      const usedFallback = ruled === null;
      let target = ruled ?? fallback;
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
        const frame = heroHandoffFrame({ t: morph, heroCentre, heroDiameter: heroBox.width, size, spot: target });
        styleHero(frame);
        if (hero && morph < FADE_SHARE) mirrorHero(hero, mirrorRef.current, size);
        point = frame.position;
        glideRef.current = null;
        scale.set(frame.companionScale);
        opacity.set(frame.companionOpacity);
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
        // Hand-off done (or no hero here): the hero, now invisible, is left to
        // the page untransformed, so it scrolls away instead of being carried
        // along over the content. It stays hidden while scrolled past.
        if (hero && heroHere) {
          hero.style.transform = "";
          hero.style.opacity = morph >= 1 ? "0" : "";
          hero.style.pointerEvents = morph >= 1 ? "none" : "";
        } else if (hero) {
          // The hand-off isn't running (the tour started mid-way, reduced
          // motion): the hero must not keep a half-faded, unclickable style.
          styleHero(null);
        }
        scale.set(1);
        // Away from the hero (or with the hand-off complete): fully shown, or
        // the short in-place fade on other pages, the tour and the panel.
        opacity.set(visibleRef.current ? (heroHere ? 1 : fade.get()) : 0);
      }

      lastPointRef.current = point;
      posX.set(Math.round(point.x * 2) / 2);
      posY.set(Math.round(point.y * 2) / 2);
      if (opacity.get() > 0.5) lastDrawn = { point, scale: scale.get(), at: performance.now(), path: pathname };

      const kind = current === CORNER || usedFallback ? "corner" : "ride";
      if (kind !== kindRef.current) {
        kindRef.current = kind;
        setSpotKind(kind);
      }
    };
    frameLoop.update(tick, true);
    return () => {
      cancelFrame(tick);
      const hero = document.querySelector<HTMLElement>("[data-guide-hero-avatar]");
      if (hero) {
        hero.style.opacity = "";
        hero.style.transform = "";
        hero.style.pointerEvents = "";
      }
    };
    // Re-run per page: each page settles afresh and the trip starts from the last one.
  }, [fade, isHome, opacity, pathname, posX, posY, scale, size]);

  // Tips: after a short dwell on a section, offer its one-liner. The policy
  // decides whether one may show (budget, cooldown, nothing else open).
  useEffect(() => {
    if (!isHome || !activeSection || !SECTION_TIPS[activeSection]) return;
    // Not in a background tab: the session's few tips would be spent unseen.
    const offer = () => {
      if (document.visibilityState !== "visible") return;
      dispatchCompanion({ type: "tip/offer", section: activeSection, text: SECTION_TIPS[activeSection], now: Date.now() });
    };
    let interval = 0;
    const timer = window.setTimeout(() => {
      offer();
      interval = window.setInterval(offer, TIP_RETRY_MS);
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
      openerRef.current = active instanceof HTMLElement && active !== document.body && !active.closest("#nex-bubble") ? active : null;
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
      // The tour narrator ends the tour itself (announcement, one tour/end).
      if (companion.bubble === "tour") return;
      // An in-page host (hero, footer) closes itself on Escape.
      if (companion.bubble === "ask" && companion.askHost !== "float") return;
      event.preventDefault();
      dispatchCompanion({ type: "escape" });
      returnFocus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [companion.askHost, companion.bubble, companion.panelOpen, returnFocus]);

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
          aria-label={companion.bubble === "ask" ? "Close Nex" : "Ask Nex a question"}
          aria-expanded={companion.bubble === "ask"}
          aria-controls="nex-bubble"
          className={
            "relative flex h-full w-full items-center justify-center rounded-full guide-disc ring-1 ring-primary/40 shadow-accent-card transition-shadow duration-300 hover:shadow-[0_16px_36px_hsl(var(--accent)/0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
            (visible ? "pointer-events-auto cursor-pointer" : "pointer-events-none")
          }
        >
          {/* During the hand-off this shows the hero avatar's own drawing, copied
              each frame (see `mirrorHero`), so the two discs are the same face in
              the same pose and the cross-fade can't show two different
              expressions. The companion's own live avatar takes over once the
              hand-off is done. */}
          <span
            ref={mirrorRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ display: handingOffState ? "flex" : "none" }}
          />
          {lowPower ? (
            <StaticGuideMark size={size - 16} />
          ) : (
            <span style={{ visibility: handingOffState ? "hidden" : "visible", display: "inline-flex" }}>
              <GuideAvatar size={size - 16} lookAt={lookAt} settleAfterMs={10_000} paused={!visible && !travelling} />
            </span>
          )}
        </button>
      </motion.div>

      <NexBubble
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

/**
 * The hero avatar's box as laid out, ignoring the scale this loop (and the
 * inline ask box) apply to it. Its untransformed wrapper starts at the same
 * place and the avatar keeps its layout size, so read the wrapper's top and
 * left and the avatar's offset size: no transform is involved.
 */
/**
 * Copies the hero avatar's current drawing into the companion while the two
 * cross-fade, scaled to the companion's face size. One face, one pose, one
 * expression on both discs: two separate avatars, each with its own idle
 * motion, gaze and blink, never line up. Cheap: the drawing is a few dozen
 * SVG nodes, and only its attributes are copied when they change.
 */
let mirrorIds = 0;
function mirrorHero(hero: HTMLElement, mirror: HTMLElement | null, size: number) {
  if (!mirror) return;
  const source = [...hero.querySelectorAll<SVGSVGElement>("svg")].find((svg) => svg.querySelectorAll("*").length > 20);
  if (!source) return;
  let copy = mirror.firstElementChild as SVGSVGElement | null;
  if (!copy || copy.dataset.from !== source.dataset.mirrorId) {
    source.dataset.mirrorId ??= String((mirrorIds += 1));
    copy = source.cloneNode(true) as SVGSVGElement;
    copy.dataset.from = source.dataset.mirrorId;
    // Ids inside the clone (clip paths) must not collide with the hero's.
    copy.querySelectorAll("[id]").forEach((node) => node.setAttribute("id", `m-${node.id}`));
    copy.querySelectorAll("[clip-path]").forEach((node) => node.setAttribute("clip-path", (node.getAttribute("clip-path") ?? "").replace(/url\(#/g, "url(#m-")));
    mirror.replaceChildren(copy);
  } else {
    const from = source.querySelectorAll("*");
    const to = copy.querySelectorAll("*");
    if (from.length !== to.length) {
      mirror.replaceChildren();
      return;
    }
    from.forEach((node, index) => {
      const target = to[index];
      for (const attr of ["d", "transform", "opacity", "visibility", "fill", "cx", "cy", "rx", "ry", "x", "y", "width", "height"]) {
        const value = node.getAttribute(attr);
        if (value !== target.getAttribute(attr)) {
          if (value === null) target.removeAttribute(attr);
          else target.setAttribute(attr, value);
        }
      }
    });
  }
  // The library sizes its svg with an inline style (300px for the hero), which
  // beats the width attribute: set the style, or the copy is drawn at the
  // hero's size inside the scaled-up companion (a face filling the screen).
  const inner = `${size - 16}px`;
  if (copy.style.width !== inner) {
    copy.style.width = inner;
    copy.style.height = inner;
  }
}

function heroLayoutRect(hero: HTMLElement) {
  const wrapper = cachedNode<HTMLElement>("hero-wrapper", () => hero.closest<HTMLElement>('[data-guide-target="hero-guide"]')) ?? hero;
  const box = wrapper.getBoundingClientRect();
  const width = hero.offsetWidth;
  const height = hero.offsetHeight;
  const left = box.left + (box.width - width) / 2;
  return { left, top: box.top, width, height, right: left + width, bottom: box.top + height };
}



/* ------------------------------------------------------------------------ */
/* Spots                                                                     */
/* ------------------------------------------------------------------------ */

/*
 * Reads that don't change while scrolling (which element, its computed
 * padding or sticky offset) are cached, so each frame only reads the rects it
 * needs. A resize or a DOM change (route, a section mounting) clears them; a
 * cached node that has left the page is looked up again.
 */
const nodeCache = new Map<string, Element | null>();
const styleCache = new Map<string, number | { panel: HTMLElement; stickyTop: number } | null>();
let cacheWatched = false;
function clearLayoutCache() {
  nodeCache.clear();
  styleCache.clear();
}
function watchLayoutCache() {
  if (cacheWatched || typeof window === "undefined") return;
  cacheWatched = true;
  window.addEventListener("resize", clearLayoutCache);
  new MutationObserver(clearLayoutCache).observe(document.body, { childList: true, subtree: false });
}
function cachedNode<T extends Element>(key: string, find: () => T | null): T | null {
  const hit = nodeCache.get(key) as T | null | undefined;
  if (hit && hit.isConnected) return hit;
  const found = find();
  nodeCache.set(key, found);
  return found;
}

function contentLeft() {
  const column = cachedNode("content", () => document.querySelector("#main-content .container-narrow") ?? document.querySelector(".container-narrow"));
  if (!column) return 0;
  let padding = styleCache.get("content-padding") as number | undefined;
  if (padding === undefined) {
    padding = parseFloat(getComputedStyle(column).paddingLeft) || 0;
    styleCache.set("content-padding", padding);
  }
  return column.getBoundingClientRect().left + padding;
}

/** The left margin, at mid-height. Fixed to the screen. */
function marginRule(key: string): SpotRule {
  return { key: `margin:${key}`, prefer: ["right", "bottom", "top"], point: (size, viewport) => gutterPoint(contentLeft(), size, viewport) };
}

const CORNER: SpotRule = { key: "corner", prefer: ["left", "top"], point: (size, viewport) => cornerPoint(size, viewport) };

/** Is this element laid out as a sticky side column right now (desktop)? */
/** The section's sticky intro panel and the column that sticks, when the sticky layout is on (desktop). */
function stickyPanel(section: string) {
  const key = `sticky:${section}`;
  const hit = styleCache.get(key) as { panel: HTMLElement; stickyTop: number } | null | undefined;
  if (hit !== undefined && (hit === null || hit.panel.isConnected)) return hit;
  let result: { panel: HTMLElement; stickyTop: number } | null = null;
  const panel = document.getElementById(section)?.querySelector<HTMLElement>("[data-guide-panel]");
  for (let node: HTMLElement | null = panel ?? null; panel && node && node.id !== section; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.position === "sticky") {
      result = { panel, stickyTop: parseFloat(style.top) || 0 };
      break;
    }
  }
  // Only remember a miss once the section exists, so it is looked for again after it mounts.
  if (result || document.getElementById(section)) styleCache.set(key, result);
  return result;
}

/**
 * Under a sticky intro panel (About, Experience, Skills). One continuous,
 * scroll-driven path (`underPanelPoint`): it waits in the margin at the
 * height it will rest at, slides in under the panel as the panel pins, stays
 * while it is pinned, and rides up with it when the section ends. Without the
 * sticky layout (narrow screens) it falls back to the margin.
 */
function underPanelRule(section: string): SpotRule {
  return {
    key: `under:${section}`,
    // Below the avatar, in the free space under the panel, when it fits.
    prefer: ["bottom", "right", "top"],
    point: (size, viewport) => {
      const sticky = stickyPanel(section);
      if (!sticky) return gutterPoint(contentLeft(), size, viewport);
      const box = sticky.panel.getBoundingClientRect();
      // The panel's own offset inside the sticky column (its first child here).
      const column = sticky.panel.parentElement!.getBoundingClientRect();
      const stickyTop = sticky.stickyTop + (box.top - column.top);
      const gutter = gutterPoint(contentLeft(), size, viewport);
      return underPanelPoint({ panelLeft: box.left, panelBottom: box.bottom, pinnedBottom: stickyTop + box.height, gutterX: gutter ? gutter.x : null });
    },
  };
}

/**
 * At the top-left corner of a section's block (Work header, Nex card,
 * Contact grid): rides with it as it scrolls, held on screen by the clamp
 * once the block's top has scrolled past.
 */
function blockCornerRule(section: string, selector: string, offset: Point = { x: 0, y: 0 }): SpotRule {
  return {
    key: `block:${section}`,
    prefer: ["right", "bottom", "top"],
    point: (size, viewport) => {
      const block = cachedNode(`block:${section}`, () => document.getElementById(section)?.querySelector(selector) ?? null);
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

const ABOUT = underPanelRule("about");

const SECTION_RULES: Record<string, SpotRule> = {
  // The hero hands off straight to About's spot (the same rule, so crossing
  // the hero/About boundary is not a change of spot and starts no glide).
  hero: ABOUT,
  about: ABOUT,
  experience: underPanelRule("experience"),
  skills: underPanelRule("skills"),
  work: blockCornerRule("work", '[data-guide-target="work-featured"]', { x: 0, y: -12 }),
  nex: blockCornerRule("nex", '[data-guide-spot="nex"]', { x: 0, y: 24 }),
  contact: blockCornerRule("contact", '[data-guide-spot="contact"]', { x: 0, y: 24 }),
};

/* ------------------------------------------------------------------------ */
/* Other pages                                                               */
/* ------------------------------------------------------------------------ */

/**
 * Where the avatar was last drawn, kept across page changes (this module
 * outlives a route), so the next page's trip starts from there.
 */
let lastDrawn: { point: Point; scale: number; at: number; path: string } | null = null;

type RouteKind = "home" | "work-index" | "case-study" | "other";

function routeKind(pathname: string | null): RouteKind {
  if (pathname === "/") return "home";
  if (pathname === "/work") return "work-index";
  if (pathname?.startsWith("/work/")) return "case-study";
  return "other";
}

const routeNode = (spot: string) => cachedNode<HTMLElement>(`route:${spot}`, () => document.querySelector<HTMLElement>(`[data-guide-route-spot="${spot}"]`));
const visibleBox = (node: HTMLElement | null) => {
  if (!node) return null;
  const box = node.getBoundingClientRect();
  return box.width > 0 && box.height > 0 ? box : null;
};

/**
 * A case study. At the top it waits beside the intro paragraph, in the empty
 * space right of the measure. Once the two-column body arrives it rides
 * under the sticky "On this page" contents (which pins at the top), in the
 * empty column below the list, and leaves with it at the end of the article.
 * One continuous path, the same both ways: it is the under-panel spot with
 * the intro's right side as its waiting place.
 */
const CASE_STUDY_RULE: SpotRule = {
  key: "route:case-study",
  prefer: ["right", "bottom", "top"],
  point: (size, viewport) => {
    const introNode = routeNode("intro");
    const tocNode = routeNode("toc");
    const intro = visibleBox(introNode);
    const column = cachedNode<HTMLElement>("route:column", () => document.querySelector<HTMLElement>("#case-study-article .container-narrow"));
    const columnBox = column?.getBoundingClientRect();
    // Waiting place: the free strip right of the intro paragraph, riding with it.
    const beside = intro && columnBox && columnBox.right - intro.right > size * 2
      ? { x: intro.right + (columnBox.right - intro.right) / 2 - size / 2, y: Math.max(intro.top + intro.height / 2 - size / 2, viewport.insetTop + 40) }
      : gutterPoint(contentLeft(), size, viewport);
    const sticky = tocNode ? stickyTop(tocNode) : null;
    const toc = visibleBox(tocNode);
    // Without the sticky two-column layout (narrower screens), just wait there.
    if (!toc || sticky === null) return beside;
    // Its resting place: under the list once it has pinned, in the empty column.
    const rest = { x: toc.left + 20, y: Math.min(toc.bottom, sticky + toc.height) + 24 };
    if (!beside) return rest;
    // Slide from the waiting place to the rest over the contents' last 360px of approach.
    const k = Math.min(1, Math.max(0, 1 - (toc.top - sticky) / 360));
    return blendPoint(beside, rest, easeInOutCubic(k));
  },
};

/** An element's sticky `top`, when it is laid out sticky right now (desktop), else null. */
function stickyTop(node: HTMLElement) {
  const key = "route:sticky-top";
  const hit = styleCache.get(key) as number | null | undefined;
  if (hit !== undefined) return hit;
  const style = getComputedStyle(node);
  const value = style.position === "sticky" ? parseFloat(style.top) || 0 : null;
  styleCache.set(key, value);
  return value;
}

/**
 * The case-study index. Beside the header's intro paragraph (its right side is
 * empty), then at the start of the group heading nearest the top of the
 * screen, in the margin, riding with it, so it walks down the groups as you
 * scroll.
 */
const WORK_INDEX_RULE: SpotRule = {
  key: "route:work-index",
  prefer: ["right", "bottom", "top"],
  point: (size, viewport) => {
    const header = visibleBox(routeNode("header"));
    const column = cachedNode<HTMLElement>("route:index-column", () => document.querySelector<HTMLElement>("main .container-narrow"));
    const columnBox = column?.getBoundingClientRect();
    if (header && columnBox && header.bottom > viewport.height * 0.35 && columnBox.right - header.right > size * 2) {
      return { x: header.right + (columnBox.right - header.right) / 2 - size / 2, y: header.top + header.height / 2 - size / 2 };
    }
    const left = contentLeft();
    const gutter = gutterPoint(left, size, viewport);
    // The group heading that owns the upper part of the screen.
    const groups = [...document.querySelectorAll<HTMLElement>('[data-guide-route-spot="group"]')];
    const line = viewport.height * 0.45;
    let owner: DOMRect | null = null;
    for (const group of groups) {
      const box = group.getBoundingClientRect();
      if (box.top <= line) owner = box;
    }
    if (!owner) owner = groups[0]?.getBoundingClientRect() ?? null;
    if (!owner) return gutter;
    const x = gutter ? gutter.x : owner.left;
    return { x, y: owner.top - size / 2 + owner.height / 2 };
  },
};

const ROUTE_RULES: Partial<Record<RouteKind, SpotRule>> = {
  "case-study": CASE_STUDY_RULE,
  "work-index": WORK_INDEX_RULE,
};
