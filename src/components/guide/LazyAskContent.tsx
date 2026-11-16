"use client";

import dynamic from "next/dynamic";

/**
 * The ask box, loaded when a conversation first opens rather than with the
 * page: it brings the answer renderer (react-markdown and its plugins), which
 * every section's host and the companion used to carry in their first load.
 * `preloadAskContent` starts the download early (the browser goes idle after
 * load), so opening it is still instant.
 */
const load = () => import("@/components/guide/AskContent").then((mod) => mod.AskContent);

export const LazyAskContent = dynamic(load, {
  ssr: false,
  // Holds the box's shape while it arrives (only ever briefly).
  loading: () => <div className="min-h-[12rem] flex-1" aria-busy="true" />,
});

let preloaded = false;
export function preloadAskContent() {
  if (preloaded) return;
  preloaded = true;
  void load();
}

if (typeof window !== "undefined") {
  const idle = () => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    window.setTimeout(() => (ric ? ric(preloadAskContent, { timeout: 4000 }) : preloadAskContent()), 4000);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}
