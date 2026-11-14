type LenisLike = {
  scrollTo: (
    target: number | string | HTMLElement,
    options?: { offset?: number; onComplete?: () => void; immediate?: boolean }
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
 */
export function scrollToOffset(top: number, options: { onComplete?: () => void } = {}) {
  let done = false;
  const complete = () => {
    if (done) return;
    done = true;
    options.onComplete?.();
  };
  const lenis = (window as ScrollWindow).__lenis;
  if (lenis) {
    lenis.scrollTo(top, { onComplete: complete });
    window.setTimeout(complete, 1600);
    return;
  }
  if (Math.abs(top - window.scrollY) < 2) {
    complete();
    return;
  }
  window.addEventListener("scrollend", complete, { once: true });
  window.setTimeout(complete, 1200);
  window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
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
