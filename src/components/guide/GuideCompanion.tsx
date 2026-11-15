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
import { dispatchCompanion, getCompanionState, openAsk, openPanel, setFooterDocked, setHeroVisible, useCompanionState } from "@/lib/guide/companion-store";
import {
  activeSectionAt,
  blendPoint,
  clampToViewport,
  cornerPoint,
  easeInOutCubic,
  gutterPoint,
  heroDockFrame,
  footerDockFrame,
  footerDockProgress,
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
import { HOVER_LINE } from "@/lib/guide/hero-lines";
import { getSpoken, say, sayPetLine } from "@/lib/guide/spoken";
import { introPending, markAvatarDrawn } from "@/lib/hero-intro";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatAvailability } from "@/hooks/useChatAvailability";
import { NAVBAR_CLEARANCE as NAVBAR } from "@/lib/scroll";

const SIZE = 68;
const MOBILE_SIZE = 56;
/** How long the glide between two sections' spots takes. */
const GLIDE_MS = 650;
/** The hand-off progress at which the conversation leaves the hero for the companion's own bubble. */
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
/** The footer slot's size: Nex lands there drawn at this diameter. */
const FOOTER_SLOT = 150;
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

  // Written by the frame loop below, read by the avatar layer and the bubble.
  const posX = useMotionValue(0);
  const posY = useMotionValue(0);
  const opacity = useMotionValue(0);
  const scale = useMotionValue(1);
  // The companion's own disc and ring. In the hero's socket the page draws
  // them, so only the face shows; they fade in as Nex leaves for the page.
  const chrome = useMotionValue(1);
  const [spotKind, setSpotKind] = useState<"ride" | "corner">("ride");
  // Save-data and low-memory devices get the still drawing, as the hero does.
  const [lowPower] = useState(() => typeof navigator !== "undefined" && prefersStatic());
  // Sitting in (or leaving) the hero's socket: it follows the pointer there
  // and reacts to clicks like a pet (set by the loop on change only).
  const [inHero, setInHero] = useState(false);
  const inHeroRef = useRef(false);
  // The live drawing has rendered: until then the hero's socket keeps its still one.
  const [drawn, setDrawn] = useState(false);

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
  // One Nex: on desktop it is in the hero's socket while the hero is on
  // screen, so it is visible there too. Phones keep the still drawing in the
  // hero and show the companion (in the corner) once the hero has scrolled away.
  const visible = settled && (touring || !(isMobile && heroVisible)) && !(isMobile && (askOpen || companion.panelOpen));

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
  const travelRef = useRef<{ from: Point; fromScale: number; fromChrome: number; start: number; ms: number; toHero: boolean } | null>(null);
  const reduceMotionRef = useRef(reduceMotion);
  const isMobileRef = useRef(isMobile);
  useLayoutEffect(() => {
    reduceMotionRef.current = reduceMotion;
    isMobileRef.current = isMobile;
  }, [isMobile, reduceMotion]);

  const sectionRef = useRef<string | null>(null);
  const landedRef = useRef(false);
  const panelOpenRef = useRef(companion.panelOpen);
  useLayoutEffect(() => {
    panelOpenRef.current = companion.panelOpen;
  }, [companion.panelOpen]);
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
      ? { from: departed.point, fromScale: departed.scale, fromChrome: departed.chrome, start: -1, ms: 0, toHero: false }
      : null;
    lastPointRef.current = null;
    glideRef.current = null;
    clearLayoutCache();
    watchLayoutCache();
    const footer = () => cachedNode("footer", () => document.querySelector("footer"));
    const footerSocket = () => cachedNode<HTMLElement>("footer-socket", () => document.querySelector<HTMLElement>("[data-guide-footer-socket]"));
    /**
     * The footer landing, from the live layout: how far along it is, and the
     * slot's centre. Desktop with motion only; the tour, the panel and phones
     * keep the corner. Reduced motion snaps: landed once the band is in view.
     */
    const footerLanding = (viewport: Viewport) => {
      if (isMobileRef.current || touringRef.current || panelOpenRef.current) return null;
      const socket = footerSocket()?.getBoundingClientRect();
      if (!socket || !socket.width) return null;
      // Paced like the hero hand-off (same span of scrolling). The scroll left
      // before the page ends ignores the footer's own conversation, so opening
      // it never pulls Nex back out of the slot.
      const host = document.getElementById("nex-host-footer")?.getBoundingClientRect().height ?? 0;
      const remaining = document.documentElement.scrollHeight - host - window.innerHeight - window.scrollY;
      let progress = footerDockProgress({ remaining, span: viewport.height * HANDOFF_SPAN, scrolled: window.scrollY });
      // While its conversation is open in the footer, Nex stays in the slot.
      const state = getCompanionState();
      if (state.bubble === "ask" && state.askHost === "footer") progress = 1;
      if (reduceMotionRef.current) progress = progress > 0.5 ? 1 : 0;
      if (progress <= 0) return null;
      return { progress, centre: { x: socket.left + socket.width / 2, y: socket.top + socket.height / 2 } };
    };
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

      // The hero's socket: on desktop Nex sits in it while the hero is on
      // screen, drawn at the socket's face size, and shrinks into the page as
      // the visitor scrolls (one element, nothing cross-faded). Phones keep
      // the still drawing there; the tour narrates from the corner.
      const hero = isHome ? cachedNode<HTMLElement>("hero", () => document.querySelector<HTMLElement>("[data-guide-hero-avatar]")) : null;
      // The socket's layout box, never a transformed one (the intro moves its wrapper).
      const heroBox = hero ? heroLayoutRect(hero) : undefined;
      const heroHere = Boolean(hero && heroBox && heroBox.width > 0) && !isMobileRef.current && !touringRef.current;
      const markInHero = (next: boolean) => {
        if (next === inHeroRef.current) return;
        inHeroRef.current = next;
        setInHero(next);
      };

      // The intro: Nex is drawn wherever the intro has the socket's wrapper
      // right now (asleep at the screen's centre, then settling into place),
      // at its size and fade, so the intro moves the one live Nex.
      if (heroHere && hero && introPending()) {
        const stage = cachedNode<HTMLElement>("hero-stage", () => hero.closest<HTMLElement>('[data-hero-part="stage"]'));
        const box = (stage ?? hero).getBoundingClientRect();
        posX.set(Math.round((box.left + box.width / 2 - size / 2) * 2) / 2);
        posY.set(Math.round((box.top + box.height / 2 - size / 2) * 2) / 2);
        scale.set(heroFaceScale(box.width, size));
        chrome.set(0);
        opacity.set(stage ? Number(getComputedStyle(stage).opacity) || 0 : 1);
        markInHero(true);
        return;
      }
      // On a load or a refresh nothing is drawn until the page has settled:
      // the hero column is still fading in and the browser may still be
      // restoring a scrolled position. Animating the hand-off from that
      // half-built state is what played a stray hand-off on every refresh.
      // Once settled, the companion simply appears at its spot (or stays
      // hidden over the hero); the hand-off only ever plays from real scrolling.
      if (!settledRef.current) {
        // The hero's intro has ended (HeroIntro sets this, at once when it
        // doesn't play), so the hand-off never starts from a half-built hero.
        const columnShown = !hero || !introPending();
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
          } else if (!heroGuides) opacity.set(0);
          return;
        } else {
          // Waiting for the new page: hold where it was, so the trip starts there.
          const travel = travelRef.current;
          if (travel) {
            posX.set(travel.from.x);
            posY.set(travel.from.y);
            scale.set(travel.fromScale);
            chrome.set(travel.fromChrome);
            opacity.set(1);
          } else opacity.set(0);
          return;
        }
      }
      // A trip between pages: one hop from where it was to where it belongs
      // here, read from the live layout every frame so it lands exactly. Into
      // the homepage with the hero on screen, it lands in the hero's socket.
      const travel = travelRef.current;
      if (travel && travel.start >= 0) {
        const heroTarget = travel.toHero && hero && heroBox ? heroBox : null;
        const landing = heroTarget ? null : footerLanding(viewport);
        const docked = landing && landing.progress >= 1 ? landing : null;
        const to = docked
          ? { x: docked.centre.x - size / 2, y: docked.centre.y - size / 2 }
          : heroTarget
          ? { x: heroTarget.left + heroTarget.width / 2 - size / 2, y: heroTarget.top + heroTarget.height / 2 - size / 2 }
          : clampToViewport(ruleRef.current.point(size, viewport) ?? marginRule("").point(size, viewport) ?? CORNER.point(size, viewport)!, size, viewport, footer()?.getBoundingClientRect().top ?? null);
        if (!travel.ms) travel.ms = routeTravelMs(travel.from, to);
        const t = Math.min(1, (now - travel.start) / travel.ms);
        // Landing in the hero: grow to its face size.
        const heroScale = heroTarget ? heroFaceScale(heroTarget.width, size) : docked ? FOOTER_SLOT / size : 1;
        const hop = routeTravelFrame({ t, from: travel.from, to, fromScale: travel.fromScale, toScale: heroScale });
        posX.set(Math.round(hop.position.x * 2) / 2);
        posY.set(Math.round(hop.position.y * 2) / 2);
        scale.set(hop.scale);
        chrome.set(travel.fromChrome + ((heroTarget ? 0 : 1) - travel.fromChrome) * easeInOutCubic(t));
        opacity.set(1);
        markInHero(Boolean(heroTarget));
        if (t >= 1) {
          travelRef.current = null;
          lastPointRef.current = heroTarget ? null : to;
          if (docked) landedRef.current = true;
        }
        return;
      }

      // How far Nex has left the hero: a plain function of the scroll
      // position, so the same scroll draws the same frame, a stop mid-way
      // holds and scrolling back plays it in reverse. Lenis smooths the scroll.
      // Reduced motion: in the socket or at its spot, nothing in between.
      let morph = heroHere && heroBox ? handoffProgress(heroBox, viewport) : 1;
      if (reduceMotionRef.current && morph > 0 && morph < 1) morph = morph < 0.5 ? 0 : 1;
      const heroCentre = heroBox ? { x: heroBox.left + heroBox.width / 2, y: heroBox.top + heroBox.height / 2 } : { x: 0, y: 0 };
      const leavingHero = heroHere && morph < 1;
      markInHero(leavingHero);
      // Nex in the hero hosts the conversation there; past this point the ask
      // box moves to the companion's own bubble. Phones: while the hero shows.
      if (hero) setHeroVisible(heroHere ? morph < HANDOFF_SWAP_AT : heroBox ? heroBox.bottom > NAVBAR + heroBox.height * 0.5 && heroBox.width > 0 : false);
      if (!visibleRef.current) {
        lastPointRef.current = null;
        glideRef.current = null;
        opacity.set(fade.get());
        return;
      }

      const current = ruleRef.current;
      const fallback = CORNER.point(size, viewport)!;
      const ruled = current.point(size, viewport) ?? marginRule("").point(size, viewport);
      const usedFallback = ruled === null;
      let target = ruled ?? fallback;
      const landing = leavingHero ? null : footerLanding(viewport);
      // The footer is an obstacle for every spot but its own slot. With the
      // panel open the corner sits just below the panel, over the page's end:
      // pushing it above the footer put it inside the panel.
      const footerTop = landing || panelOpenRef.current ? null : footer()?.getBoundingClientRect().top ?? null;
      target = clampToViewport(target, size, viewport, footerTop);

      let point = target;
      const glide = glideRef.current;
      if (glide) {
        const t = (now - glide.start) / GLIDE_MS;
        if (t >= 1) glideRef.current = null;
        else point = blendPoint(glide.from, target, easeInOutCubic(t));
      }
      const last = lastPointRef.current;
      if (leavingHero && heroBox) {
        const frame = heroDockFrame({ t: morph, heroCentre, heroDiameter: heroBox.width, size, spot: target });
        point = frame.position;
        glideRef.current = null;
        scale.set(frame.scale);
        chrome.set(frame.chrome);
        opacity.set(1);
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

      if (!leavingHero) {
        scale.set(1);
        chrome.set(1);
        // Fully shown, or the short in-place fade on other pages, the tour and the panel.
        opacity.set(heroHere ? 1 : fade.get());
      }

      // The footer landing, last: from wherever the spot rule (and its glide)
      // put it this frame, curve into the slot and grow to its size. A pure
      // function of the band's position, so scrolling back plays it in reverse.
      // The ride's own position is kept unblended in `lastPointRef`, so the
      // landing never trips the ride's jump-smoothing.
      const ridePoint = point;
      if (landing) {
        const frame = footerDockFrame({ t: landing.progress, from: ridePoint, slotCentre: landing.centre, size, slotSize: FOOTER_SLOT });
        point = frame.position;
        scale.set(frame.scale);
        opacity.set(opacity.get() * frame.opacity);
      }
      const landed = Boolean(landing && landing.progress >= 1);
      if (landed !== landedRef.current) {
        landedRef.current = landed;
        setFooterDocked(landed);
        // A floating ask box can't stay beside a disc that has grown into the
        // footer: its conversation moves into the footer's own host, in the
        // page. (An in-page host the visitor chose keeps it.)
        const state = getCompanionState();
        if (landed && state.bubble === "ask" && state.askHost === "float") dispatchCompanion({ type: "ask/open", host: "footer" });
        // A tip would open beside a 150px disc, over the footer's links.
        if (landed && state.bubble === "tip") dispatchCompanion({ type: "tip/expire" });
      }

      lastPointRef.current = ridePoint;
      posX.set(Math.round(point.x * 2) / 2);
      posY.set(Math.round(point.y * 2) / 2);
      if (opacity.get() > 0.5) lastDrawn = { point, scale: scale.get(), chrome: chrome.get(), at: performance.now(), path: pathname };

      const kind = current === CORNER || usedFallback ? "corner" : "ride";
      if (kind !== kindRef.current) {
        kindRef.current = kind;
        setSpotKind(kind);
      }
    };
    frameLoop.update(tick, true);
    return () => {
      cancelFrame(tick);
      landedRef.current = false;
      setFooterDocked(false);
      inHeroRef.current = false;
      setInHero(false);
    };
    // Re-run per page: each page settles afresh and the trip starts from the last one.
  }, [chrome, fade, isHome, opacity, pathname, posX, posY, scale, size]);

  // The live drawing has rendered: the hero's intro waits for it, and the
  // socket's still drawing gives way to it.
  useEffect(() => {
    const button = buttonRef.current;
    if (!button || lowPower) return;
    const check = () => {
      if (!button.querySelector("svg")) return false;
      setDrawn(true);
      markAvatarDrawn();
      return true;
    };
    if (check()) return;
    const observer = new MutationObserver(() => {
      if (check()) observer.disconnect();
    });
    observer.observe(button, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [lowPower]);

  // Tells the page Nex is in the hero's socket (its still drawing hides).
  useEffect(() => {
    const root = document.documentElement;
    if (inHero && (drawn || lowPower)) root.dataset.nexInHero = "";
    else delete root.dataset.nexInHero;
    return () => {
      delete root.dataset.nexInHero;
    };
  }, [drawn, inHero, lowPower]);

  // Tips: after a short dwell on a section, offer its one-liner. The policy
  // decides whether one may show (budget, cooldown, nothing else open).
  useEffect(() => {
    if (!isHome || !activeSection || !SECTION_TIPS[activeSection]) return;
    // Not in a background tab: the session's few tips would be spent unseen.
    const offer = () => {
      if (document.visibilityState !== "visible") return;
      // Never at the footer: a tip beside the landed disc would cover its links.
      if (getCompanionState().footerDocked) return;
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
  // In the hero it follows the pointer instead.
  const lookAt = useMemo<readonly [number, number] | null>(() => (inHero ? null : spotKind === "corner" ? [-0.45, 0.25] : [0.6, 0]), [inHero, spotKind]);
  // Where Nex is a character to play with rather than a button: in the hero
  // and once it has landed in the footer (both have their own Ask Nex).
  const petMode = inHero || companion.footerDocked;

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
    if (petMode) {
      emitGuide({ type: "pet/click", now: Date.now() });
      sayPetLine();
      return;
    }
    if (companion.bubble === "ask") dispatchCompanion({ type: "ask/close" });
    else openAsk();
  };
  const hover = (active: boolean) => {
    emitGuide({ type: "page/hover", active });
    if (active && petMode && !getSpoken()) say(HOVER_LINE, 2400);
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
          // In the hero the socket's own button is the keyboard stop.
          tabIndex={visible && !inHero ? 0 : -1}
          onClick={toggle}
          onMouseDown={(event) => event.preventDefault()}
          onPointerEnter={() => hover(true)}
          onPointerLeave={() => hover(false)}
          onFocus={() => hover(true)}
          onBlur={() => hover(false)}
          aria-label={petMode ? "Nex, Nikunj's AI guide. Activate for a reaction." : companion.bubble === "ask" ? "Close Nex" : "Ask Nex a question"}
          aria-expanded={petMode ? undefined : companion.bubble === "ask"}
          aria-controls={petMode ? undefined : "nex-bubble"}
          className={
            "group relative flex h-full w-full items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
            (visible ? "pointer-events-auto cursor-pointer" : "pointer-events-none")
          }
        >
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full guide-disc ring-1 ring-primary/40 shadow-accent-card transition-shadow duration-300 group-hover:shadow-[0_16px_36px_hsl(var(--accent)/0.28)]"
            style={{ opacity: chrome }}
          />
          {lowPower ? (
            <StaticGuideMark size={size - 16} />
          ) : (
            <span className="relative inline-flex">
              <GuideAvatar size={size - 16} lookAt={lookAt} followPointer={inHero} settleAfterMs={10_000} paused={!visible && !inHero} />
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
 * The hero socket's box as laid out, ignoring the intro's transform on its
 * wrapper: the untransformed outer wrapper's top and left and the socket's
 * offset size.
 */
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
let lastDrawn: { point: Point; scale: number; chrome: number; at: number; path: string } | null = null;

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
