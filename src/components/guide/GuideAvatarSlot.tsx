"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { GuideAvatarProps } from "@/components/guide/GuideAvatar";

const GuideAvatar = dynamic(() => import("@/components/guide/GuideAvatar"), {
  ssr: false,
  loading: () => null,
});

type NavigatorWithHints = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

/** Low-power devices keep the static mark: the avatar is a nicety, not content. */
function prefersStatic() {
  const nav = navigator as NavigatorWithHints;
  return Boolean(nav.connection?.saveData) || (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2);
}

let idleReady = false;
const idleWaiters = new Set<() => void>();

/** Resolves once the browser is idle after load, shared by every slot. */
export function whenIdle(callback: () => void) {
  if (idleReady) {
    callback();
    return () => {};
  }
  idleWaiters.add(callback);
  if (idleWaiters.size === 1) {
    const release = () => {
      idleReady = true;
      idleWaiters.forEach((waiter) => waiter());
      idleWaiters.clear();
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(release, { timeout: 2500 });
    else window.setTimeout(release, 1200);
  }
  return () => idleWaiters.delete(callback);
}

/**
 * Reserves the avatar's box and shows a static mark until the live avatar is
 * mounted on idle, so the avatar never costs initial-load JS or layout shift.
 */
export function GuideAvatarSlot({ size, className, ...props }: GuideAvatarProps) {
  const [live, setLive] = useState(false);
  // The still drawing stays on screen until the live avatar has actually
  // drawn (its chunk loads asynchronously), then the two cross-fade. Swapping
  // straight away left the slot empty for a moment on every load.
  const [drawn, setDrawn] = useState(false);
  const liveRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersStatic()) return;
    return whenIdle(() => setLive(true));
  }, []);

  useEffect(() => {
    const node = liveRef.current;
    if (!live || !node) return;
    const check = () => {
      if (node.querySelector("svg")) {
        setDrawn(true);
        return true;
      }
      return false;
    };
    if (check()) return;
    const observer = new MutationObserver(() => {
      if (check()) observer.disconnect();
    });
    observer.observe(node, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [live]);

  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 motion-reduce:transition-none"
        style={{ opacity: drawn ? 0 : 1 }}
      >
        <StaticGuideMark size={size} />
      </span>
      {live && (
        <span ref={liveRef} className="relative inline-flex transition-opacity duration-300 motion-reduce:transition-none" style={{ opacity: drawn ? 1 : 0 }}>
          <GuideAvatar size={size} {...props} />
        </span>
      )}
    </span>
  );
}

/** A still drawing of the guide's face: shown before load and on low-power devices. */
export function StaticGuideMark({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="-150 -170 300 320" className="overflow-visible">
      <line x1="0" y1="-112" x2="0" y2="-150" stroke="#1d7f74" strokeWidth="10" strokeLinecap="round" />
      <circle cx="0" cy="-156" r="14" fill="#54dec7" stroke="#090e1a" strokeWidth="6" />
      <rect x="-131" y="-23" width="26" height="58" rx="13" fill="#1d7f74" stroke="#090e1a" strokeWidth="6" />
      <rect x="105" y="-23" width="26" height="58" rx="13" fill="#1d7f74" stroke="#090e1a" strokeWidth="6" />
      <ellipse cx="0" cy="0" rx="120" ry="114" fill="#29d6b9" stroke="#090e1a" strokeWidth="6" />
      <rect x="-46" y="-43" width="24" height="56" rx="12" fill="#090e1a" />
      <rect x="22" y="-43" width="24" height="56" rx="12" fill="#090e1a" />
      <path d="M -11 36 Q 0 43 11 36" stroke="#090e1a" strokeWidth="6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
