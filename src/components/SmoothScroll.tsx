"use client";

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import { cancelFrame, frame } from 'framer-motion';
import { scrollToHash, scrollToTop } from '@/lib/scroll';
import { reapplyScrollLock } from '@/lib/scroll-lock';

type LenisWindow = Window & typeof globalThis & {
  __lenis?: Lenis;
};

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /**
   * Reset scroll on client-side navigation.
   *
   * Lenis caches its own scroll position and, because the effect below runs once
   * with an empty dep array, it never learns about route changes. Next resets
   * `window.scrollY` on navigation but Lenis then writes its stale value back on
   * the next frame — so opening a case study from the homepage (where the
   * featured row sits far down a very tall page) landed you near the footer.
   *
   * It looked correct from `/work` only because that page is short: the stale
   * offset got clamped to almost nothing, which is why the bug appeared to
   * depend on the entry point rather than on navigation itself.
   */
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // Skip the very first run. On a hard load or a refresh the browser owns the
    // scroll position — forcing 0 here would defeat scroll restoration, which is
    // a separate fix. Only client-side navigations need the reset.
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    // A hash target owns the scroll position; do not fight it.
    if (window.location.hash) return;

    const lenis = (window as LenisWindow).__lenis;

    if (lenis) {
      lenis.scrollTo(0, { immediate: true, force: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const lenis = new Lenis({
      // A slightly slower, softer glide than before (was 1.05 / 0.9): enough to
      // feel deliberate, still quick to skim a long page. Touch is untouched.
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.8,
      syncTouch: false,
      touchMultiplier: 1.2,
      /**
       * Defer to any inner scroll container under the cursor.
       *
       * Defaults to false, which is why scrolling inside the chat and the
       * command palette lagged: Lenis was still smoothing those wheel events
       * against the page while the browser also scrolled the container.
       * With this on, Lenis checks for a scrollable ancestor and bails out,
       * so nested lists scroll natively at full speed.
       */
      allowNestedScroll: true,
      /**
       * No rubber-banding past the top or bottom. Without this the page could
       * be dragged above the first section into blank space.
       */
      overscroll: false,
    });

    const appWindow = window as LenisWindow;
    appWindow.__lenis = lenis;
    // An overlay may already be open (opened before Lenis existed).
    reapplyScrollLock();

    /**
     * Align Lenis with wherever the browser actually restored the page.
     *
     * Lenis caches its own scroll position when it initialises. On a refresh the
     * browser restores the previous offset asynchronously, so Lenis could start
     * from a stale value and then correct itself on the first frame — which read
     * as the page auto-scrolling a little on every reload. Resyncing after the
     * restore settles removes the drift without fighting the browser (leaving
     * scrollRestoration on "auto", so refreshing keeps your reading position).
     */
    const syncToRestoredPosition = () => {
      lenis.resize();
      lenis.scrollTo(window.scrollY, { immediate: true, force: true });
    };

    // Two passes: one after layout, one after the restore has definitely landed.
    const syncFrame = window.requestAnimationFrame(syncToRestoredPosition);
    const syncTimer = window.setTimeout(syncToRestoredPosition, 120);

    /**
     * Lenis runs on Framer Motion's frame loop, in its `read` step, rather than
     * on a separate requestAnimationFrame. Every scroll-driven thing on the page
     * (the guide companion, its bubble, the hero hand-off, the progress bar)
     * then reads the scroll position Lenis has just written and renders in the
     * same frame. With two separate loops their order could invert (it did
     * after every tab switch), and the companion trailed the page by a frame.
     */
    let running = false;
    const step = ({ timestamp }: { timestamp: number }) => lenis.raf(timestamp);

    const startRaf = () => {
      if (running) return;
      running = true;
      frame.read(step, true);
    };

    const stopRaf = () => {
      if (!running) return;
      running = false;
      cancelFrame(step);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lenis.stop();
        stopRaf();
        return;
      }

      lenis.start();
      // start() resets Lenis, clearing isLocked: re-lock behind open overlays.
      reapplyScrollLock();
      startRaf();
    };

    const handleHashLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const link = event.target.closest('a[href^="#"]');
      if (!(link instanceof HTMLAnchorElement)) return;

      const href = link.getAttribute('href');
      if (!href) return;

      if (href === '#') {
        event.preventDefault();
        scrollToTop();
        return;
      }

      const handled = scrollToHash(href, {
        focusTarget: link.dataset.focusTarget === 'true',
      });

      if (handled) {
        event.preventDefault();
      }
    };

    startRaf();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleHashLinkClick);

    return () => {
      window.cancelAnimationFrame(syncFrame);
      window.clearTimeout(syncTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleHashLinkClick);
      stopRaf();
      if (appWindow.__lenis === lenis) {
        delete appWindow.__lenis;
      }
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
