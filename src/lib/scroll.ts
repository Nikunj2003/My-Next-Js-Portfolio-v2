type LenisLike = {
  scrollTo: (target: number | string | HTMLElement, options?: { offset?: number }) => void;
};

type ScrollWindow = Window & typeof globalThis & {
  __lenis?: LenisLike;
};

type ScrollToHashOptions = {
  offset?: number;
  updateHash?: boolean;
  focusTarget?: boolean;
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

  const lenis = (window as ScrollWindow).__lenis;

  if (lenis) {
    lenis.scrollTo(target, { offset: -offset });
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  if (shouldUpdateHash) {
    updateHash(href);
  }

  return true;
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
