"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { anchorScrollTop, computeReserve, distanceToContentEnd, shouldAnchor } from "@/lib/chat/turn-anchor";

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
  const [showJump, setShowJump] = useState(false);

  const readReserve = () => spacerRef.current?.offsetHeight ?? 0;

  const applyReserve = useCallback(() => {
    const scroller = scrollerRef.current;
    const spacer = spacerRef.current;
    if (!scroller || !spacer) return;
    const target = targetRef.current;
    const current = readReserve();
    const next =
      target === null
        ? 0
        : computeReserve({ targetScrollTop: target, clientHeight: scroller.clientHeight, scrollHeight: scroller.scrollHeight, currentReserve: current });
    if (Math.abs(next - current) >= 1) spacer.style.height = `${next}px`;
  }, [scrollerRef]);

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
        updateJump();
      });
    };
    const updateJump = () => {
      const distance = distanceToContentEnd({
        scrollTop: scroller.scrollTop,
        clientHeight: scroller.clientHeight,
        scrollHeight: scroller.scrollHeight,
        reserve: readReserve(),
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
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      scroller.removeEventListener("scroll", updateJump);
    };
  }, [active, applyReserve, scrollerRef]);

  const jumpToLatest = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const end = scroller.scrollHeight - readReserve() - scroller.clientHeight;
    scroller.scrollTo({ top: Math.max(0, end), behavior: reducedMotion ? "auto" : "smooth" });
  }, [reducedMotion, scrollerRef]);

  /** Restores the reading position when the surface is (re)opened: the end of the history. */
  const restoreToEnd = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    targetRef.current = null;
    if (spacerRef.current) spacerRef.current.style.height = "0px";
    scroller.scrollTop = scroller.scrollHeight;
  }, [scrollerRef]);

  return { spacerRef, showJump, jumpToLatest, restoreToEnd };
}
