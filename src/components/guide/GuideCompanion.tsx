"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { animate, cancelFrame, frame as frameLoop, motion, useMotionValue, useReducedMotion } from "framer-motion";
import GuideAvatar from "@/components/guide/GuideAvatar";
import { StaticGuideMark, prefersStatic } from "@/components/guide/GuideAvatarSlot";
import { NexBubble, readingRects } from "@/components/guide/NexBubble";
import { useGuideTour } from "@/components/guide/GuideTourNarrator";
import { SECTION_IDS } from "@/lib/guide/anchors";
import { emitGuide } from "@/lib/guide/bus";
import { dispatchCompanion, getCompanionState, openAsk, openPanel, setCompanionSection, setDockSection, setFooterDocked, setHeroVisible, useCompanionState } from "@/lib/guide/companion-store";
import {
  activeSectionAt,
  blendPoint,
  clampToViewport,
  cornerPoint,
  easeInOutCubic,
  gutterPoint,
  heroDockFrame,
  routeSocketProgress,
  footerDockFrame,
  footerDockProgress,
  freeBubbleSide,
  heroFaceScale,
  heroHandoffProgress,
  routeTravelFrame,
  routeTravelMs,
  socketDockPoint,
  type BubbleSide,
  type Point,
  type Viewport,
} from "@/lib/guide/placement";
import { SECTION_TIPS, TIP_RULES } from "@/lib/guide/tips";
import { HOVER_LINE } from "@/lib/guide/hero-lines";
import { getSpoken, hush, say, sayPetLine } from "@/lib/guide/spoken";
import { introPending, markAvatarDrawn } from "@/lib/hero-intro";
import { useIsMobile, useTouchScreen } from "@/hooks/use-mobile";
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
/** How long Nex takes to fly to the corner when the full conversation opens, and back when it closes. */
const PANEL_FLIGHT_MS = 620;
/** While a tip is waiting its turn (cooldown, another bubble), ask again this often. */
const TIP_RETRY_MS = 5000;
/** A tip's bubble, for finding free space before offering one (one to three lines). */
const TIP_BOX = { width: 360, height: 112 };

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
  // Touch screens (phones, tablets either way up) scroll natively, on the
  // compositor: a fixed layer moved from the main thread trails the page
  // there. So on touch Nex is anchored: laid out in page coordinates where it
  // rests (the hero, the footer slot) so the browser scrolls it with the page,
  // and in the corner while reading, where a fixed place needs no tracking.
  const touch = useTouchScreen();
  const reduceMotion = Boolean(useReducedMotion());
  const companion = useCompanionState();
  const { status } = useChatAvailability();
  const size = isMobile ? MOBILE_SIZE : SIZE;
  const { narrator, announcement: tourAnnouncement, touring } = useGuideTour(isMobile);

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Written by the frame loop below, read by the avatar layer and the bubble.
  const posX = useMotionValue(0);
  const posY = useMotionValue(0);
  const opacity = useMotionValue(0);
  const scale = useMotionValue(1);
  // The companion's own disc and ring. In the hero's socket the page draws
  // them, so only the face shows; they fade in as Nex leaves for the page.
  const chrome = useMotionValue(1);
  // Touch: whether the layer is anchored to the page (absolute) or the screen (fixed).
  const [anchored, setAnchored] = useState(false);
  const anchoredRef = useRef(false);
  const touchRef = useRef(touch);
  useLayoutEffect(() => {
    touchRef.current = touch;
  }, [touch]);
  const [spotKind, setSpotKind] = useState<"ride" | "corner">("ride");
  // Save-data and low-memory devices get the still drawing, as the hero does.
  const [lowPower] = useState(() => typeof navigator !== "undefined" && prefersStatic());
  // Sitting in (or leaving) the hero's socket: it follows the pointer there
  // and reacts to clicks like a pet (set by the loop on change only).
  const [inHero, setInHero] = useState(false);
  const inHeroRef = useRef(false);
  const [inSocket, setInSocket] = useState(false);
  const inSocketRef = useRef(false);
  const dockSectionRef = useRef<string | null>(null);
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
  const visible = settled && !(isMobile && (askOpen || companion.panelOpen));

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
  const routeRef = useRef(route);
  useLayoutEffect(() => {
    routeRef.current = route;
  }, [route]);
  // The conversation is open in a row that reserves a place for Nex: that
  // place is where it goes (one glide there, and back when it closes).
  // (The rows: Work, Nex and Contact's, and the page rows on /work and case
  // studies. The sticky panels keep Nex in their own dock beside it.)
  const askSocketHost = companion.bubble === "ask" && !isMobile && !touring && !companion.panelOpen && hostHasSocket(companion.askHost) ? companion.askHost : null;
  const askSocketRef = useRef(askSocketHost);
  useLayoutEffect(() => {
    askSocketRef.current = askSocketHost;
  }, [askSocketHost]);
  const rule = useMemo<SpotRule>(() => {
    if (cornerOnly) return CORNER;
    if (askSocketHost) return askSocketRule(askSocketHost);
    // Other pages have spots of their own (the case study's table of
    // contents, the index's headings); only an unknown page uses the corner.
    if (route !== "home") return ROUTE_RULES[route] ?? CORNER;
    if (!activeSection) return marginRule("margin");
    return SECTION_RULES[activeSection] ?? marginRule(activeSection);
  }, [activeSection, askSocketHost, cornerOnly, route]);

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
  /** Nex is on its way into the footer's slot (any progress at all): no tips. */
  const landingRef = useRef(false);
  const panelOpenRef = useRef(companion.panelOpen);
  /**
   * The full conversation opening or closing moves Nex between its place in
   * the page (the hero, a spot, the footer slot) and the corner beside the
   * panel. One eased flight from the pose last drawn (position, size, disc)
   * to wherever the new place is this frame, so nothing snaps: it shrinks on
   * the way to the corner and grows back into a slot on the way home.
   */
  const poseFlightRef = useRef<{ from: Point; fromScale: number; fromChrome: number; start: number } | null>(null);
  const drawnPoseRef = useRef<{ point: Point; scale: number; chrome: number } | null>(null);
  // The tour moves Nex to the corner the same way (it narrates from there).
  const cornerModeRef = useRef(false);
  const cornerMode = companion.panelOpen || touring;
  useLayoutEffect(() => {
    panelOpenRef.current = companion.panelOpen;
    if (cornerModeRef.current === cornerMode) return;
    cornerModeRef.current = cornerMode;
    const pose = drawnPoseRef.current;
    poseFlightRef.current = pose && !reduceMotion ? { from: pose.point, fromScale: pose.scale, fromChrome: pose.chrome, start: performance.now() } : null;
    // The glide between spots would run on top of the flight: the flight owns it.
    glideRef.current = null;
  }, [companion.panelOpen, cornerMode, reduceMotion]);
  const visibleRef = useRef(visible);
  const touringRef = useRef(touring);
  useLayoutEffect(() => {
    visibleRef.current = visible;
    touringRef.current = touring;
  }, [touring, visible]);

  useEffect(() => {
    mountedAtRef.current = performance.now();
    // A new page: whatever Nex was saying was about the last one.
    hush();
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
    underContents = false;
    dock = null;
    const footer = () => cachedNode("footer", () => document.querySelector("footer"));
    /** A page header's socket (/work, a case study), when Nex may rest in it now. */
    const routeSocketBox = () =>
      !isHome && !isMobileRef.current && !touringRef.current && !panelOpenRef.current && !askSocketRef.current
        ? visibleBox(cachedNode<HTMLElement>("route-socket", () => document.querySelector<HTMLElement>("[data-guide-route-socket]")))
        : null;
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
      const host = cachedNode("footer-host", () => document.getElementById("nex-host-footer"))?.getBoundingClientRect().height ?? 0;
      const remaining = document.documentElement.scrollHeight - host - window.innerHeight - window.scrollY;
      let progress = footerDockProgress({ remaining, span: viewport.height * HANDOFF_SPAN, scrolled: window.scrollY });
      // While its conversation is open in the footer, Nex stays in the slot.
      const state = getCompanionState();
      if (state.bubble === "ask" && state.askHost === "footer") progress = 1;
      if (reduceMotionRef.current) progress = progress > 0.5 ? 1 : 0;
      if (progress <= 0) return null;
      return { progress, centre: { x: socket.left + socket.width / 2, y: socket.top + socket.height / 2 } };
    };
    /**
     * Touch screens. Three places, one at a time:
     *  - the hero's socket while it is mostly on screen;
     *  - the footer's slot once it is on screen (desktop's landing, without
     *    the scroll-driven curve: native scroll can't be followed);
     *  - the corner otherwise (fixed to the screen, so nothing to track).
     * In the hero and the footer the layer is anchored: positioned in page
     * coordinates and `absolute`, so the browser scrolls it with the page in
     * the same composited frame, with no main-thread tracking at all. A move
     * between places is a short eased flight in screen coordinates (fixed),
     * from where it was drawn; hysteresis keeps a place from flapping.
     */
    type Box = { left: number; top: number; width: number; height: number; bottom: number };
    let touchPlace: "hero" | "footer" | "corner" | null = null;
    let touchFlight: { from: { point: Point; scale: number; chrome: number }; start: number } | null = null;
    const TOUCH_FLIGHT_MS = 480;
    const setAnchor = (next: boolean) => {
      if (next === anchoredRef.current) return;
      anchoredRef.current = next;
      setAnchored(next);
    };
    const touchTick = (now: number, viewport: Viewport, hero: HTMLElement | null, heroBox: Box | undefined, heroHere: boolean) => {
      const footerBox = footerSocket()?.getBoundingClientRect();
      const footerOn = Boolean(footerBox && footerBox.width) && !touringRef.current && !panelOpenRef.current;
      // How much of a box is on screen below the navbar. Hysteresis: in at 60%, out below 35%.
      const shown = (box: Box) => Math.max(0, Math.min(box.bottom, viewport.height) - Math.max(box.top, viewport.insetTop)) / box.height;
      let place: "hero" | "footer" | "corner" = "corner";
      if (heroHere && heroBox && heroBox.width) {
        const share = shown(heroBox);
        if (share >= 0.6 || (touchPlace === "hero" && share >= 0.35)) place = "hero";
      }
      if (place === "corner" && footerOn && footerBox) {
        // The slot may scroll under the navbar on a phone (the footer stacks
        // it first): counted against the whole screen, so the landed Nex
        // scrolls on with the page instead of jumping back to the corner.
        const share = Math.max(0, Math.min(footerBox.bottom, viewport.height) - Math.max(footerBox.top, 0)) / footerBox.height;
        if (share >= 0.6 || (touchPlace === "footer" && share >= 0.35)) place = "footer";
      }
      const target =
        place === "hero" && heroBox
          ? { point: { x: heroBox.left + heroBox.width / 2 - size / 2, y: heroBox.top + heroBox.height / 2 - size / 2 }, scale: heroFaceScale(heroBox.width, size), chrome: 0 }
          : place === "footer" && footerBox
            ? { point: { x: footerBox.left + footerBox.width / 2 - size / 2, y: footerBox.top + footerBox.height / 2 - size / 2 }, scale: FOOTER_SLOT / size, chrome: 1 }
            : { point: cornerPoint(size, viewport), scale: 1, chrome: 1 };
      if (place !== touchPlace) {
        const drawn = drawnPoseRef.current;
        touchFlight = touchPlace !== null && drawn && !reduceMotionRef.current ? { from: drawn, start: now } : null;
        touchPlace = place;
        if (place === "footer") {
          // Whatever it was saying up the page isn't for the footer, and a tip would cover it.
          hush();
          if (getCompanionState().bubble === "tip") dispatchCompanion({ type: "tip/expire" });
        }
        const landed = place === "footer";
        if (landed !== landedRef.current) {
          landedRef.current = landed;
          setFooterDocked(landed);
        }
        if ((place === "hero") !== inHeroRef.current) {
          inHeroRef.current = place === "hero";
          setInHero(place === "hero");
        }
        if (hero) setHeroVisible(place === "hero");
      }
      landingRef.current = place === "footer";
      let pose = target;
      if (touchFlight) {
        const k = Math.min(1, (now - touchFlight.start) / TOUCH_FLIGHT_MS);
        if (k >= 1) touchFlight = null;
        else {
          const hop = routeTravelFrame({ t: k, from: touchFlight.from.point, to: target.point, fromScale: touchFlight.from.scale, toScale: target.scale });
          pose = { point: hop.position, scale: hop.scale, chrome: touchFlight.from.chrome + (target.chrome - touchFlight.from.chrome) * easeInOutCubic(k) };
        }
      }
      // Resting in the hero or the footer: anchored to the page. In flight or
      // in the corner: fixed to the screen.
      const anchor = !touchFlight && place !== "corner";
      setAnchor(anchor);
      const at = anchor ? { x: pose.point.x + window.scrollX, y: pose.point.y + window.scrollY } : pose.point;
      scale.set(pose.scale);
      chrome.set(pose.chrome);
      // In the hero it is the hero's own face, drawn in full from the intro
      // on (the companion's appear fade is for other places, as on desktop).
      opacity.set(place === "hero" ? 1 : fade.get());
      drawnPoseRef.current = { point: pose.point, scale: pose.scale, chrome: pose.chrome };
      posX.set(Math.round(at.x * 2) / 2);
      posY.set(Math.round(at.y * 2) / 2);
      if (opacity.get() > 0.5) lastDrawn = { point: pose.point, scale: pose.scale, chrome: pose.chrome, at: performance.now(), path: pathname };
      const resting = !touchFlight && place !== "corner";
      if (resting !== inSocketRef.current) {
        inSocketRef.current = resting;
        setInSocket(resting);
      }
      const kind = place === "corner" ? "corner" : "ride";
      if (kind !== kindRef.current) {
        kindRef.current = kind;
        setSpotKind(kind);
      }
    };

    // Runs on Framer Motion's frame loop, in its update step: after Lenis has
    // scrolled (SmoothScroll drives Lenis from the read step) and before the
    // render step, so the avatar, the hero and the bubble are all drawn in the
    // frame the page moved in. A separate requestAnimationFrame could run
    // before Lenis and draw last frame's scroll.
    const tick = ({ timestamp: now }: { timestamp: number }) => {
      const viewport: Viewport = { width: document.documentElement.clientWidth, height: window.innerHeight, insetTop: NAVBAR, insetBottom: 0 };

      if (isHome) {
        // Section bounds in page coordinates, measured once per layout (the
        // page's height and width) and read against the scroll: seven layout
        // reads every frame were most of the loop's cost while scrolling.
        const y = window.scrollY;
        const sections = sectionBounds().map((section) => ({ id: section.id, top: section.top - y, bottom: section.bottom - y }));
        const next = activeSectionAt(sections, viewport.height, sectionRef.current);
        if (next !== sectionRef.current) {
          sectionRef.current = next;
          setActiveSection(next);
          setCompanionSection(next);
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
      // With the full conversation open, Nex sits in the corner beside it
      // (the hero's socket shows its still drawing until it comes back).
      const heroHere = Boolean(hero && heroBox && heroBox.width > 0) && !touringRef.current && !panelOpenRef.current;
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
        // Into the hero, or a page header's socket when the page opens at its top.
        const arriving = !isHome ? routeSocketBox() : null;
        const socketTarget = arriving && routeSocketProgress(arriving.top, arriving.top + window.scrollY, viewport.insetTop) === 0 ? arriving : null;
        const heroTarget = travel.toHero && hero && heroBox ? heroBox : socketTarget;
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
        const heroScale = socketTarget && heroTarget === socketTarget ? socketTarget.width / size : heroTarget ? heroFaceScale(heroTarget.width, size) : docked ? FOOTER_SLOT / size : 1;
        const hop = routeTravelFrame({ t, from: travel.from, to, fromScale: travel.fromScale, toScale: heroScale });
        posX.set(Math.round(hop.position.x * 2) / 2);
        posY.set(Math.round(hop.position.y * 2) / 2);
        scale.set(hop.scale);
        const inHeroSocket = Boolean(heroTarget) && heroTarget !== socketTarget;
        chrome.set(travel.fromChrome + ((inHeroSocket ? 0 : 1) - travel.fromChrome) * easeInOutCubic(t));
        opacity.set(1);
        markInHero(inHeroSocket);
        if (t >= 1) {
          travelRef.current = null;
          lastPointRef.current = heroTarget && !socketTarget ? null : to;
          if (docked) landedRef.current = true;
        }
        return;
      }

      if (touchRef.current) {
        touchTick(now, viewport, hero, heroBox, heroHere);
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
      // A page header's socket (/work, a case study): Nex rests in it, drawn
      // at its size, and leaves for its reading spot over the same span of
      // scrolling as the hero, along the same path. Desktop only.
      const routeSocket = routeSocketBox();
      const socketProgress = routeSocket ? routeSocketProgress(routeSocket.top, routeSocket.top + window.scrollY, viewport.insetTop) : 1;
      const routeMorph = routeSocket ? (reduceMotionRef.current ? (socketProgress < 0.5 ? 0 : 1) : socketProgress) : 1;
      const leavingSocket = Boolean(routeSocket) && routeMorph < 1;
      // Resting in a section's dock: the current rule is a dock, Nex is fully
      // in its socket, nothing else is moving it (a glide, the hero, the footer).
      const docked = isHome && !usedFallback && current.key.startsWith("dock:") && dock !== null && current.key === `dock:${dock.section}` && dock.hold >= 0.999 && !glideRef.current && !(heroHere && morph < 1) && !isMobileRef.current && !touringRef.current && !panelOpenRef.current && !landingRef.current;
      // While gliding toward a dock it keeps the previous value instead of
      // dropping to null for the glide and back (each change re-renders every
      // subscriber, in the frame Nex starts to move).
      const dockSection = docked && dock ? dock.section : glideRef.current && current.key.startsWith("dock:") ? dockSectionRef.current : null;
      if (dockSection !== dockSectionRef.current) {
        dockSectionRef.current = dockSection;
        setDockSection(dockSection);
      }
      // Resting in a socket (its own Ask lives in the page): petting, like the hero.
      const resting = (Boolean(routeSocket) && routeMorph < HANDOFF_SWAP_AT) || docked;
      if (resting !== inSocketRef.current) {
        inSocketRef.current = resting;
        setInSocket(resting);
      }
      const landing = leavingHero || leavingSocket ? null : footerLanding(viewport);
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
        // Off the homepage the jumps are across the page (the right strip to
        // under the contents): a hop up over the content, the same arc as a
        // page change, rather than a slide through the text.
        else point = routeRef.current !== "home" ? routeTravelFrame({ t, from: glide.from, to: target }).position : blendPoint(glide.from, target, easeInOutCubic(t));
      }
      const last = lastPointRef.current;
      if (leavingHero && heroBox) {
        const frame = heroDockFrame({ t: morph, heroCentre, heroDiameter: heroBox.width, size, spot: target });
        point = frame.position;
        glideRef.current = null;
        scale.set(frame.scale);
        chrome.set(frame.chrome);
        opacity.set(1);
      } else if (leavingSocket && routeSocket) {
        // Straight from the slot toward its spot (one eased blend, shrinking
        // as it goes): unlike the hero's curve it doesn't drop to the spot's
        // height first, which swept it across the content under the header.
        const u = easeInOutCubic(routeMorph);
        const from = { x: routeSocket.left + routeSocket.width / 2 - size / 2, y: routeSocket.top + routeSocket.height / 2 - size / 2 };
        // Toward where the spot's glide has it this frame (not the spot
        // itself): a fast scroll up while it was gliding across the page used
        // to cancel the glide and snap it to the right first.
        point = blendPoint(from, point, u);
        const startScale = routeSocket.width / size;
        scale.set(startScale + (1 - startScale) * u);
        chrome.set(1);
        opacity.set(fade.get());
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

      if (!leavingHero && !leavingSocket) {
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
      // From the first frame of the landing a tip would open beside a disc
      // growing into the footer, over its links: the one showing goes.
      const nowLanding = Boolean(landing);
      if (nowLanding !== landingRef.current) {
        landingRef.current = nowLanding;
        if (nowLanding && getCompanionState().bubble === "tip") dispatchCompanion({ type: "tip/expire" });
      }
      if (landed !== landedRef.current) {
        landedRef.current = landed;
        setFooterDocked(landed);
        // Whatever it was saying up the page isn't for the footer.
        if (landed) hush();
        // A floating ask box can't stay beside a disc that has grown into the
        // footer: its conversation moves into the footer's own host, in the
        // page. (An in-page host the visitor chose keeps it.)
        const state = getCompanionState();
        if (landed && state.bubble === "ask" && state.askHost === "float") dispatchCompanion({ type: "ask/open", host: "footer" });
        // A tip would open beside a 150px disc, over the footer's links.
        if (landed && state.bubble === "tip") dispatchCompanion({ type: "tip/expire" });
      }

      lastPointRef.current = ridePoint;
      // The panel's flight, last of all: from the pose drawn before it opened
      // or closed to this frame's pose, which keeps tracking the live layout.
      const flight = poseFlightRef.current;
      if (flight) {
        const k = Math.min(1, (now - flight.start) / PANEL_FLIGHT_MS);
        if (k >= 1) poseFlightRef.current = null;
        else {
          const hop = routeTravelFrame({ t: k, from: flight.from, to: point, fromScale: flight.fromScale, toScale: scale.get() });
          point = hop.position;
          scale.set(hop.scale);
          chrome.set(flight.fromChrome + (chrome.get() - flight.fromChrome) * easeInOutCubic(k));
          opacity.set(Math.max(opacity.get(), 1));
        }
      }
      drawnPoseRef.current = { point, scale: scale.get(), chrome: chrome.get() };
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
      inSocketRef.current = false;
      setInSocket(false);
      anchoredRef.current = false;
      setAnchored(false);
      dockSectionRef.current = null;
      setDockSection(null);
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

  // Tells the page the live Nex is drawn on desktop, so the hero socket's
  // still stand-in steps aside for good. The live Nex is the only face on the
  // page from then on (in the socket, on its way, or elsewhere); the still
  // one was showing beside it while it hopped in from another page.
  useEffect(() => {
    const root = document.documentElement;
    // (While the full conversation is open Nex waits in the corner, and the
    // socket shows its still drawing again rather than an empty ring.)
    if (!companion.panelOpen && !touring && (drawn || lowPower)) root.dataset.nexInHero = "";
    else delete root.dataset.nexInHero;
    return () => {
      delete root.dataset.nexInHero;
    };
  }, [companion.panelOpen, drawn, lowPower, touring]);

  // Tips: after a short dwell on a section, offer its one-liner. The policy
  // decides whether one may show (budget, cooldown, nothing else open).
  useEffect(() => {
    if (!isHome || !activeSection || !SECTION_TIPS[activeSection]) return;
    // Not in a background tab: the session's few tips would be spent unseen.
    const offer = () => {
      if (document.visibilityState !== "visible") return;
      // Not while the page is moving: the free-space check measures the page,
      // and a tip opening mid-scroll would chase a moving Nex. The next retry
      // finds it at rest.
      if (performance.now() - lastScrollAt < 500) return;
      // Never at the footer: a tip beside the landed disc would cover its links.
      if (getCompanionState().footerDocked || landingRef.current) return;
      // Phones show a tip as a sheet across the bottom: not once the footer
      // is coming into view (it would cover the end of the page).
      const footerTop = document.querySelector("footer")?.getBoundingClientRect().top ?? Infinity;
      if (isMobile && footerTop < window.innerHeight * 1.2) return;
      // Only into free space: when every side of Nex would cover reading text
      // (short screens), wait; the next retry may find room as the page moves.
      // Resting in this section's dock, the tip is the dock's line: always room.
      const inDock = getCompanionState().dockSection === activeSection;
      const viewport: Viewport = { width: document.documentElement.clientWidth, height: window.innerHeight, insetTop: NAVBAR, insetBottom: 0 };
      // (Phones: the sheet has a fixed place, so the side check doesn't apply.)
      if (!inDock && !isMobile && !freeBubbleSide({ x: posX.get(), y: posY.get() }, size, TIP_BOX, viewport, ruleRef.current.prefer, readingRects())) return;
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
  }, [activeSection, isHome, isMobile, posX, posY, size]);

  // Face the content. Memoised so the avatar's frame loop isn't woken by a new array each render.
  // In the hero it follows the pointer instead.
  const lookAt = useMemo<readonly [number, number] | null>(() => (inHero ? null : spotKind === "corner" ? [-0.45, 0.25] : [0.6, 0]), [inHero, spotKind]);
  // Where Nex is a character to play with rather than a button: in the hero
  // and once it has landed in the footer (both have their own Ask Nex).
  const petMode = inHero || inSocket || companion.footerDocked;

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
        className={"pointer-events-none left-0 top-0 z-50 " + (anchored ? "absolute" : "fixed")}
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
              <GuideAvatar size={size - 16} lookAt={lookAt} followPointer={inHero} paused={!visible && !inHero} />
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
  sectionCache = null;
  nodeCache.clear();
  missedAt.clear();
  styleCache.clear();
}
function watchLayoutCache() {
  if (cacheWatched || typeof window === "undefined") return;
  cacheWatched = true;
  window.addEventListener("resize", clearLayoutCache);
  new MutationObserver(clearLayoutCache).observe(document.body, { childList: true, subtree: false });
}
/** When a lookup last missed: a missing node is looked for again at most every 250ms, not every frame. */
const missedAt = new Map<string, number>();
function cachedNode<T extends Element>(key: string, find: () => T | null): T | null {
  const hit = nodeCache.get(key) as T | null | undefined;
  if (hit && hit.isConnected) return hit;
  const now = performance.now();
  if (hit === null && now - (missedAt.get(key) ?? 0) < 250) return null;
  const found = find();
  nodeCache.set(key, found);
  if (!found) missedAt.set(key, now);
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

/**
 * How far Nex is into the dock of the section it is following (1 = resting in
 * its socket), written by the section's rule each frame and read by the loop
 * (petting, tips in the dock). Reset per page.
 */
let dock: { section: string; hold: number } | null = null;

/**
 * A section's dock (`SectionNexDock`, `data-guide-section-socket`): Nex rests
 * in the ringed socket while it is on screen, drawn at its own size. A socket
 * in a sticky panel (About, Experience, Skills) pins with the panel, so Nex
 * does too; one in a section header (Work, Nex, Contact) scrolls away, and Nex
 * slides out to the margin as it nears the navbar. One continuous function of
 * the socket's position (`socketDockPoint`), so the path is the same both ways.
 * Without the socket (narrower screens) it waits in the margin.
 */
function socketRule(section: string): SpotRule {
  return {
    key: `dock:${section}`,
    // The dock's own line carries what Nex says; a bubble opens away from the text.
    prefer: ["right", "bottom", "top"],
    point: (size, viewport) => {
      const node = cachedNode<HTMLElement>(`dock:${section}`, () => document.querySelector<HTMLElement>(`[data-guide-section-socket="${section}"]`));
      const gutter = gutterPoint(contentLeft(), size, viewport);
      const box = node?.getBoundingClientRect();
      if (!box || !box.width) {
        dock = { section, hold: 0 };
        return gutter;
      }
      const placed = socketDockPoint({ socket: { x: box.left + box.width / 2, y: box.top + box.height / 2 }, size, viewport, gutter });
      dock = { section, hold: placed.hold };
      return placed.point;
    },
  };
}

/**
 * The place an open conversation reserves for Nex (`data-guide-ask-socket`,
 * at the head of a row): Nex rests in it and scrolls with it, so it sits
 * beside the conversation it is having rather than over the page. Once the
 * row's head scrolls under the navbar it waits in the margin (the clamp keeps
 * it on screen); the glide on the change of rule takes it there and back.
 */
function hostHasSocket(host: string | null): host is string {
  return Boolean(host && (host.startsWith("page:") || host === "section:work" || host === "section:nex" || host === "section:contact"));
}

function askSocketRule(host: string): SpotRule {
  return {
    key: `ask:${host}`,
    prefer: ["right", "bottom", "top"],
    point: (size, viewport) => {
      const node = cachedNode<HTMLElement>(`ask-socket:${host}`, () => document.querySelector<HTMLElement>("[data-nex-host-live] [data-guide-ask-socket]"));
      const box = node?.getBoundingClientRect();
      const gutter = gutterPoint(contentLeft(), size, viewport);
      if (!box || !box.width) return gutter;
      const at = { x: box.left + box.width / 2 - size / 2, y: box.top + box.height / 2 - size / 2 };
      // Under the navbar or off the bottom: the margin (beside the row), else the socket.
      if (at.y < viewport.insetTop + 8 || at.y + size > viewport.height - 8) return gutter ?? at;
      return at;
    },
  };
}

const ABOUT = socketRule("about");

const SECTION_RULES: Record<string, SpotRule> = {
  // The hero hands off straight to About's dock (the same rule, so crossing
  // the hero/About boundary is not a change of spot and starts no glide).
  hero: ABOUT,
  about: ABOUT,
  experience: socketRule("experience"),
  skills: socketRule("skills"),
  work: socketRule("work"),
  nex: socketRule("nex"),
  contact: socketRule("contact"),
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
 * The homepage sections' bounds in page coordinates, kept until the page's
 * height or width changes (an answer row opening, a resize, an image loading).
 * A sticky panel never moves its section, so these stay true while scrolling.
 */
let sectionCache: { key: string; bounds: { id: string; top: number; bottom: number }[] } | null = null;
function sectionBounds() {
  const root = document.documentElement;
  const key = `${root.scrollHeight}x${root.clientWidth}`;
  if (sectionCache && sectionCache.key === key) return sectionCache.bounds;
  const y = window.scrollY;
  const bounds = ["hero", ...SECTION_IDS].flatMap((id) => {
    const node = document.getElementById(id);
    if (!node) return [];
    const box = node.getBoundingClientRect();
    return [{ id, top: box.top + y, bottom: box.bottom + y }];
  });
  sectionCache = { key, bounds };
  return bounds;
}

/** When the page last scrolled (tips wait for it to be still). */
let lastScrollAt = 0;
if (typeof window !== "undefined") window.addEventListener("scroll", () => { lastScrollAt = performance.now(); }, { passive: true });

/** Whether Nex is under a case study's contents (see CASE_STUDY_RULE). Reset per page. */
let underContents = false;
/** How far the contents must move off their pin before Nex goes back to the right. */
const CONTENTS_RELEASE = 160;

/**
 * The free strip right of the page's content, just under the navbar: where
 * Nex waits on /work and a case study once it has left the header's slot.
 * Null when the strip is too narrow for it (then the left margin or the corner).
 */
function rightRailPoint(size: number, viewport: Viewport): Point | null {
  const column = cachedNode<HTMLElement>("route:rail-column", () => document.querySelector<HTMLElement>("main .container-narrow"));
  if (!column) return null;
  let padding = styleCache.get("rail-padding") as number | undefined;
  if (padding === undefined) {
    padding = parseFloat(getComputedStyle(column).paddingRight) || 0;
    styleCache.set("rail-padding", padding);
  }
  const contentRight = column.getBoundingClientRect().right - padding;
  const strip = viewport.width - contentRight;
  if (strip < size + 24) return null;
  return { x: contentRight + strip / 2 - size / 2, y: viewport.insetTop + 32 };
}

/**
 * A case study. Nex rests in the header's slot, then waits in the free strip
 * on the right (it never crosses the results or the prose). Once the "On this
 * page" contents have pinned, it makes one jump to the empty column under
 * them, rides there, and leaves with them at the end of the article.
 * Scrolling back up past the pin, it jumps back to the right.
 */
const CASE_STUDY_RULE: SpotRule = {
  key: "route:case-study",
  prefer: ["bottom", "left", "right", "top"],
  point: (size, viewport) => {
    const tocNode = routeNode("toc");
    const sticky = tocNode ? stickyTop(tocNode) : null;
    const toc = visibleBox(tocNode);
    const rail = rightRailPoint(size, viewport) ?? gutterPoint(contentLeft(), size, viewport);
    // Without the sticky two-column layout (narrower screens), the rail.
    if (!toc || sticky === null) {
      underContents = false;
      return rail;
    }
    const rest = { x: toc.left + 20, y: Math.min(toc.bottom, sticky + toc.height) + 24 };
    const roomUnder = rest.y + size + 16 <= viewport.height;
    // Which side, with hysteresis: it moves under the list once the list has
    // pinned, and back to the right only once the list has clearly moved off
    // its pin (scrolled well back down the page). A fast scroll up across the
    // pin used to flip it between the two sides several times, so it bounced
    // left and right; now each crossing is one jump.
    if (!underContents && toc.top <= sticky + 1 && roomUnder) underContents = true;
    else if (underContents && (toc.top > sticky + CONTENTS_RELEASE || !roomUnder)) underContents = false;
    if (underContents) return rest;
    return rail ?? rest;
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
 * The case-study index. Nex rests in the header's slot, then waits in the free
 * strip on the right, beside the cards rather than over them; the left margin
 * when that strip is too narrow.
 */
const WORK_INDEX_RULE: SpotRule = {
  key: "route:work-index",
  prefer: ["bottom", "left", "right", "top"],
  point: (size, viewport) => rightRailPoint(size, viewport) ?? gutterPoint(contentLeft(), size, viewport),
};

const ROUTE_RULES: Partial<Record<RouteKind, SpotRule>> = {
  "case-study": CASE_STUDY_RULE,
  "work-index": WORK_INDEX_RULE,
};
