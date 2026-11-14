"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { anchorScrollTop, computeReserve, contentHeightAboveSpacer, distanceToContentEnd, reachedAnchor, shouldAnchor } from "@/lib/chat/turn-anchor";

type Options = {
  /** Id of the latest user message; a new id anchors once. */
  anchorId: string | null;
  /** Locates the anchor element inside the scroller. */
  selector: (id: string) => string;
  reducedMotion: boolean;
  /** False while the surface is hidden; it re-measures when shown. */
  active: boolean;
};

/**
 * Keeps the latest question at the top of a chat scroller while its answer
 * streams in below, instead of chasing the bottom on every token.
 *
 * Returns a ref for the spacer element to render after the last message, and
 * a "jump to latest" control for when the visitor scrolls up to reread.
 */
export function useTurnAnchor(scrollerRef: RefObject<HTMLElement | null>, { anchorId, selector, reducedMotion, active }: Options) {
  const spacerRef = useRef<HTMLDivElement>(null);
  const lastAnchoredRef = useRef<string | null>(null);
  const targetRef = useRef<number | null>(null);
  /** The anchor scroll was issued and the target hasn't been reached yet. */
  const seekingRef = useRef(false);
  const [showJump, setShowJump] = useState(false);

  /** Height of everything above the spacer, measured from where the spacer sits. */
  const readContentHeight = useCallback(() => {
    const scroller = scrollerRef.current;
    const spacer = spacerRef.current;
    if (!scroller || !spacer) return 0;
    return contentHeightAboveSpacer({
      spacerRectTop: spacer.getBoundingClientRect().top,
      scrollerRectTop: scroller.getBoundingClientRect().top,
      scrollTop: scroller.scrollTop,
    });
  }, [scrollerRef]);

  const applyReserve = useCallback(() => {
    const scroller = scrollerRef.current;
    const spacer = spacerRef.current;
    if (!scroller || !spacer) return;
    const target = targetRef.current;
    const current = spacer.offsetHeight;
    const next =
      target === null ? 0 : computeReserve({ targetScrollTop: target, clientHeight: scroller.clientHeight, contentHeight: readContentHeight() });
    if (Math.abs(next - current) >= 1) spacer.style.height = `${next}px`;
  }, [readContentHeight, scrollerRef]);

  // Scroll the new question to the top, once per turn.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!active || !scroller || !anchorId || !shouldAnchor(lastAnchoredRef.current, anchorId)) return;
    const anchor = scroller.querySelector(selector(anchorId));
    if (!(anchor instanceof HTMLElement)) return;
    lastAnchoredRef.current = anchorId;
    const target = anchorScrollTop(anchor.getBoundingClientRect().top, scroller.getBoundingClientRect().top, scroller.scrollTop);
    targetRef.current = target;
    applyReserve();
    seekingRef.current = true;
    scroller.scrollTo({ top: target, behavior: reducedMotion ? "auto" : "smooth" });
  }, [active, anchorId, applyReserve, reducedMotion, scrollerRef, selector]);

  // As the answer grows, only the spacer changes. Coalesced to one write per frame.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!active || !scroller) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        applyReserve();
        // The first scrollTo can land before the spacer has grown, which clamps it
        // short. Issue it again until the target is reached; a visitor scroll ends the chase.
        const target = targetRef.current;
        if (seekingRef.current && target !== null) {
          if (reachedAnchor(scroller.scrollTop, target)) seekingRef.current = false;
          else if (scroller.scrollHeight - scroller.clientHeight >= target) scroller.scrollTo({ top: target, behavior: "auto" });
        }
        updateJump();
      });
    };
    const stopSeeking = () => {
      seekingRef.current = false;
    };
    const updateJump = () => {
      const distance = distanceToContentEnd({
        scrollTop: scroller.scrollTop,
        clientHeight: scroller.clientHeight,
        contentHeight: readContentHeight(),
      });
      setShowJump((current) => (current === distance > 48 ? current : distance > 48));
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(scroller);
    Array.from(scroller.children).forEach((child) => resize.observe(child));
    const mutation = new MutationObserver(() => {
      Array.from(scroller.children).forEach((child) => resize.observe(child));
      schedule();
    });
    mutation.observe(scroller, { childList: true, subtree: true, characterData: true });
    scroller.addEventListener("scroll", updateJump, { passive: true });
    // Wheel and touch are the visitor, not our own scrollTo.
    scroller.addEventListener("wheel", stopSeeking, { passive: true });
    scroller.addEventListener("touchstart", stopSeeking, { passive: true });
    return () => {
      scroller.removeEventListener("wheel", stopSeeking);
      scroller.removeEventListener("touchstart", stopSeeking);
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      scroller.removeEventListener("scroll", updateJump);
    };
  }, [active, applyReserve, readContentHeight, scrollerRef]);

  const jumpToLatest = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    seekingRef.current = false;
    const end = readContentHeight() - scroller.clientHeight;
    scroller.scrollTo({ top: Math.max(0, end), behavior: reducedMotion ? "auto" : "smooth" });
  }, [readContentHeight, reducedMotion, scrollerRef]);

  /** Restores the reading position when the surface is (re)opened: the end of the history. */
  const restoreToEnd = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    targetRef.current = null;
    seekingRef.current = false;
    if (spacerRef.current) spacerRef.current.style.height = "0px";
    scroller.scrollTop = scroller.scrollHeight;
  }, [scrollerRef]);

  return { spacerRef, showJump, jumpToLatest, restoreToEnd };
}
