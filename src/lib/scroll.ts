type LenisLike = {
  scrollTo: (
    target: number | string | HTMLElement,
    options?: { offset?: number; onComplete?: () => void; immediate?: boolean; force?: boolean }
  ) => void;
};

type ScrollWindow = Window & typeof globalThis & {
  __lenis?: LenisLike;
};

type ScrollToHashOptions = {
  offset?: number;
  updateHash?: boolean;
  focusTarget?: boolean;
  /** Called once the scroll has settled. */
  onComplete?: () => void;
};

type ScrollToElementOptions = {
  offset?: number;
  onComplete?: () => void;
};

export const SECTION_SCROLL_OFFSET = 85;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function updateHash(href: string) {
  if (window.location.hash === href) return;
  window.history.pushState(null, "", href);
}

export function scrollToHash(href: string, options: ScrollToHashOptions = {}) {
  const {
    offset = SECTION_SCROLL_OFFSET,
    updateHash: shouldUpdateHash = true,
    focusTarget = false,
  } = options;

  if (typeof window === "undefined" || !href.startsWith("#")) {
    return false;
  }

  const target = document.querySelector(href);
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (focusTarget) {
    target.focus({ preventScroll: true });
  }

  scrollToElement(target, { offset, onComplete: options.onComplete });

  if (shouldUpdateHash) {
    updateHash(href);
  }

  return true;
}

/**
 * Scrolls an element into view under the fixed navbar, through Lenis when it
 * is running, and reports when the scroll has settled. The native fallback
 * listens for `scrollend` with a timer as a backstop for browsers without it.
 */
export function scrollToElement(target: HTMLElement, options: ScrollToElementOptions = {}) {
  const { offset = SECTION_SCROLL_OFFSET, onComplete } = options;
  let done = false;
  const complete = () => {
    if (done) return;
    done = true;
    onComplete?.();
  };

  const lenis = (window as ScrollWindow).__lenis;
  if (lenis) {
    lenis.scrollTo(target, { offset: -offset, onComplete: complete });
    // Lenis skips onComplete when it is already at the target.
    window.setTimeout(complete, 1600);
    return;
  }

  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  if (Math.abs(top - window.scrollY) < 2) {
    complete();
    return;
  }
  window.addEventListener("scrollend", complete, { once: true });
  window.setTimeout(complete, 1200);
  window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

/**
 * Scrolls the page to an absolute position, through Lenis when it is running,
 * and reports when the scroll has settled.
 *
 * `force` lets the scroll run while Lenis is locked (the mobile chat sheet
 * locks it), which the guided tour needs. Returns a function that cancels the
 * pending completion: the timer is cleared and `onComplete` is never called.
 * It does not stop a scroll already under way.
 */
export function scrollToOffset(top: number, options: { onComplete?: () => void } = {}) {
  let done = false;
  let fallback: ReturnType<typeof setTimeout> | null = null;
  const finish = () => {
    done = true;
    if (fallback) clearTimeout(fallback);
    fallback = null;
    window.removeEventListener("scrollend", complete);
  };
  const complete = () => {
    if (done) return;
    finish();
    options.onComplete?.();
  };
  const cancel = () => {
    if (done) return;
    finish();
  };
  const lenis = (window as ScrollWindow).__lenis;
  if (lenis) {
    lenis.scrollTo(top, { onComplete: complete, force: true });
    // Lenis skips onComplete when it is already at the target.
    fallback = setTimeout(complete, 1600);
    return cancel;
  }
  if (Math.abs(top - window.scrollY) < 2) {
    complete();
    return cancel;
  }
  window.addEventListener("scrollend", complete, { once: true });
  fallback = setTimeout(complete, 1200);
  window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  return cancel;
}

export function scrollToTop(updateHash = false) {
  if (typeof window === "undefined") {
    return;
  }

  const lenis = (window as ScrollWindow).__lenis;

  if (lenis) {
    lenis.scrollTo(0);
  } else {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  if (!updateHash && window.location.hash) {
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
  }
}
