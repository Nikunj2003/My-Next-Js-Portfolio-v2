/**
 * The hero's intro: Nex sleeps at the centre of the screen, wakes, settles
 * into its place in the name (shrinking to size), and the name closes in on it
 * from both sides (Nikunj from the left, Khitha from the right) along mirrored
 * arcs; then the rest resolves below. Timing and the decision to
 * play live here (pure, tested); `components/HeroIntro.tsx` plays it.
 *
 * The decision is made before the first paint by the inline theme script in
 * layout.tsx (`PLAY_SCRIPT` below), which sets `html[data-hero-intro="play"]`.
 * CSS then shows the starting frame from the first paint, so nothing flashes.
 */

/** Beat start times and durations, in ms from when the intro starts. */
export const INTRO = {
  /** Asleep at the centre of the screen, after the live avatar has drawn. */
  sleepMs: 550,
  /** Waking: the library's waking clip, a pulse, the glow comes up. */
  wakeMs: 500,
  /** Settling from the screen centre into its place, shrinking to its resting size. */
  moveMs: 760,
  /** The name closing in from both sides: when it starts after waking, and how long. */
  nameStartMs: 180,
  nameMs: 720,
  /** The rest of the hero: when each part starts after waking, and the gap between them. */
  copyStartMs: 640,
  copyStaggerMs: 70,
  copyMs: 520,
  /** How large it is while it sleeps, relative to its resting size. */
  stageScale: 1.32,
  /** The longest it waits for the live avatar before giving up and showing the page. */
  avatarTimeoutMs: 1500,
  /** Whatever happens, the intro is over by now (matches the CSS failsafe). */
  deadlineMs: 4000,
} as const;

/** End of the whole intro for `parts` parts revealed below the name (from when it starts). */
export function introTotalMs(parts: number) {
  const copy = INTRO.copyStartMs + (parts - 1) * INTRO.copyStaggerMs + INTRO.copyMs;
  return 450 + INTRO.sleepMs + INTRO.wakeMs + Math.max(copy, INTRO.nameStartMs + INTRO.nameMs, INTRO.moveMs);
}

/**
 * Keyframes for one half of the name closing in on Nex.
 *
 * A shallow arc: it starts off its own side of the screen, slightly low,
 * rises a little above the line as it travels, and settles exactly on it.
 * Sampled in JS (linear between samples) so the path is the curve below, not
 * whatever the browser does between two transforms. Mirrored for the right
 * half. The rotation is at most 3 degrees, and the word is never split.
 */
export function nameArcFrames({ left, distance, lift, steps = 10 }: { left: boolean; distance: number; lift: number; steps?: number }) {
  const sign = left ? -1 : 1;
  const frames: { opacity: number; transform: string; filter: string }[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    const k = 1 - Math.pow(1 - u, 3); // fast in, gentle landing
    // `+ 0` turns -0 into 0, so the last frame is exactly "translate(0px, 0px)".
    const x = sign * distance * (1 - k) + 0;
    const y = lift * (1 - k) - Math.sin(Math.PI * k) * lift * 0.6 + 0;
    const tilt = sign * -3 * (1 - k);
    frames.push({
      opacity: Math.min(1, u * 2.5),
      transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`,
      filter: `blur(${(4 * (1 - k)).toFixed(2)}px)`,
    });
  }
  return frames;
}

export type IntroEnv = {
  path: string;
  hash: string;
  scrollY: number;
  width: number;
  reducedMotion: boolean;
};

/**
 * Whether the intro plays: on every load of the homepage at the top, at any
 * width (below 1024px the name stacks around Nex and the arcs sweep in from
 * the sides the same way), with motion allowed.
 * Not on a link to a section, nor a reload that restores a scrolled position.
 */
/** Narrowest screen the intro plays on (a small phone). */
export const INTRO_MIN_WIDTH = 320;

export function shouldPlayIntro(env: IntroEnv) {
  return env.path === "/" && !env.hash && env.scrollY <= 0 && env.width >= INTRO_MIN_WIDTH && !env.reducedMotion;
}

/**
 * The same decision, run inline before the first paint (layout.tsx). On a
 * reload the browser restores the scroll position later, so it also checks
 * the position the page will restore to, when the browser exposes it.
 */
export const PLAY_SCRIPT = `
  try {
    var r = document.documentElement;
    var key = 'scroll:' + location.pathname;
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    var saved = Number(sessionStorage.getItem(key)) || 0;
    var restoring = nav && (nav.type === 'reload' || nav.type === 'back_forward') && history.scrollRestoration !== 'manual' && saved > 0;
    if (location.pathname === '/' && !location.hash && window.scrollY <= 0 && !restoring && window.innerWidth >= ${INTRO_MIN_WIDTH} &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches) r.dataset.heroIntro = 'play';
    // A reload partway down: the browser paints the top of the page, then
    // restores the scroll a moment later, which flashed the hero. Hold the
    // page hidden until the restore has landed (or 700ms, whichever is first).
    if (restoring) {
      r.dataset.restoring = '';
      var t0 = performance.now();
      var reveal = function () { delete r.dataset.restoring; };
      var check = function () {
        if (Math.abs(window.scrollY - saved) < 4 || performance.now() - t0 > 700) reveal();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    }
    addEventListener('pagehide', function () { sessionStorage.setItem(key, String(window.scrollY)); });
  } catch (e) {}
`;

/** Is the intro still waiting to finish? (Client only.) */
export function introPending() {
  return typeof document !== "undefined" && document.documentElement.dataset.heroIntro === "play";
}

/* The live hero avatar reports when it has drawn; the intro waits for that. */
let drawn = false;
const waiters = new Set<() => void>();
export function markAvatarDrawn() {
  if (drawn) return;
  drawn = true;
  waiters.forEach((resolve) => resolve());
  waiters.clear();
}
export function whenAvatarDrawn(timeoutMs: number): Promise<boolean> {
  if (drawn) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      waiters.delete(done);
      resolve(false);
    }, timeoutMs);
    waiters.add(done);
  });
}
