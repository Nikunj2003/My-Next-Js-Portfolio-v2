import { emitGuide } from "@/lib/guide/bus";
import { guideTargetSelector } from "@/lib/guide/targets";
import { scrollToElement, scrollToHash } from "@/lib/scroll";

const RING_MS = 2600;
let ringTimer: ReturnType<typeof setTimeout> | null = null;

/** Rings an element for a moment. CSS does the drawing (`[data-guide-active]`). */
export function highlightGuideTarget(target: string) {
  const element = document.querySelector(guideTargetSelector(target));
  if (!(element instanceof HTMLElement)) return false;
  document.querySelectorAll("[data-guide-active]").forEach((node) => node.removeAttribute("data-guide-active"));
  element.setAttribute("data-guide-active", "true");
  if (ringTimer) clearTimeout(ringTimer);
  ringTimer = setTimeout(() => element.removeAttribute("data-guide-active"), RING_MS);
  return true;
}

/** Removes the ring right away and cancels its pending removal. */
export function clearGuideHighlight() {
  if (ringTimer) clearTimeout(ringTimer);
  ringTimer = null;
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-guide-active]").forEach((node) => node.removeAttribute("data-guide-active"));
}

/** The on-screen centre of an element, for avatars to look at. */
export function pointOfElement(element: Element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + Math.min(rect.height, window.innerHeight) / 2 };
}

export type GuideAction = {
  href: string;
  highlight?: string;
};

type Router = { push: (href: string) => void };

/**
 * Carries out a `navigate_to` result: scroll and ring an on-page target, or
 * route to another page. External links and downloads are left to the visitor
 * to click, so the agent never opens a tab or starts a download on its own.
 */
export function runGuideAction(action: GuideAction, router: Router, onDone?: () => void) {
  const { href, highlight } = action;
  if (href.startsWith("#")) {
    const onComplete = () => {
      const ringTarget = highlight ?? null;
      const element = ringTarget ? document.querySelector(guideTargetSelector(ringTarget)) : document.querySelector(href);
      if (ringTarget) highlightGuideTarget(ringTarget);
      if (element) emitGuide({ type: "guide/point", pointAt: pointOfElement(element) });
      window.setTimeout(() => emitGuide({ type: "guide/point", pointAt: null }), RING_MS);
      onDone?.();
    };
    if (highlight?.startsWith("project:")) {
      const card = document.querySelector(guideTargetSelector(highlight));
      if (card instanceof HTMLElement) {
        scrollToElement(card, { onComplete });
        window.history.pushState(null, "", href);
        return "scroll";
      }
    }
    return scrollToHash(href, { onComplete }) ? "scroll" : "missing";
  }
  // `//host` is protocol-relative: it would leave the site.
  if (/^\/(?![/\\])/.test(href) && !/\.pdf$/i.test(href)) {
    router.push(href);
    onDone?.();
    return "route";
  }
  return "external";
}
