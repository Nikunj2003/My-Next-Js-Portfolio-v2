/**
 * The hero's intro: the avatar wakes up in the middle of the screen, takes its
 * place on the right, then the left side appears. Timing and the decision to
 * play live here (pure, tested); `components/HeroIntro.tsx` plays it.
 *
 * The decision is made before the first paint by the inline theme script in
 * layout.tsx (`PLAY_SCRIPT` below), which sets `html[data-hero-intro="play"]`.
 * CSS then shows the starting frame from the first paint, so nothing flashes.
 */

/** Beat start times and durations, in ms from when the intro starts. */
export const INTRO = {
  /** Asleep in the middle of the screen. */
  sleepMs: 1000,
  /** Waking: the library's waking clip, a pulse, the glow comes up. */
  wakeMs: 750,
  /** Gliding from the middle to its place on the right. */
  moveMs: 700,
  /** The left side and the avatar's chips and buttons: when each starts after the move begins. */
  copyStartMs: 380,
  copyStaggerMs: 90,
  copyMs: 620,
  /** How large it is while it sleeps in the middle, relative to its resting size. */
  stageScale: 1.12,
  /** The longest it waits for the live avatar before giving up and showing the page. */
  avatarTimeoutMs: 1500,
} as const;

/** End of the whole intro for `parts` left-side parts. */
export function introTotalMs(parts: number) {
  return INTRO.sleepMs + INTRO.wakeMs + INTRO.copyStartMs + (parts - 1) * INTRO.copyStaggerMs + INTRO.copyMs;
}

export type IntroEnv = {
  path: string;
  hash: string;
  scrollY: number;
  width: number;
  reducedMotion: boolean;
};

/**
 * Whether the intro plays: on every load of the homepage at the top, on a
 * wide screen (the avatar column is hidden below 1024px), with motion allowed.
 * Not on a link to a section, nor a reload that restores a scrolled position.
 */
export function shouldPlayIntro(env: IntroEnv) {
  return env.path === "/" && !env.hash && env.scrollY <= 0 && env.width >= 1024 && !env.reducedMotion;
}

/**
 * The same decision, run inline before the first paint (layout.tsx). On a
 * reload the browser restores the scroll position later, so it also checks
 * the position the page will restore to, when the browser exposes it.
 */
export const PLAY_SCRIPT = `
  try {
    var r = document.documentElement;
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    var restoring = nav && nav.type === 'reload' && history.scrollRestoration !== 'manual' && sessionStorage.getItem('hero-scroll') > 0;
    if (location.pathname === '/' && !location.hash && window.scrollY <= 0 && !restoring && window.innerWidth >= 1024 &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches) r.dataset.heroIntro = 'play';
    addEventListener('pagehide', function () { sessionStorage.setItem('hero-scroll', String(window.scrollY)); });
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
