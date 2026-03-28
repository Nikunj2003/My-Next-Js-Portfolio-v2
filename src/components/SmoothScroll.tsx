"use client";

import React, { useEffect } from 'react';
import Lenis from 'lenis';
import { scrollToHash, scrollToTop } from '@/lib/scroll';

type LenisWindow = Window & typeof globalThis & {
  __lenis?: Lenis;
};

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.2, // Slower duration for a buttery feel
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing function
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.8, // Slightly lower multiplier makes it feel heavier and smoother
      syncTouch: false, // Let native iOS/Android handle mobile scrolling for the best performance and feel
      touchMultiplier: 1.5, // Ignored when syncTouch is false, but safe to keep
    });

    const appWindow = window as LenisWindow;
    appWindow.__lenis = lenis;

    let rafId: number | null = null;

    function raf(time: number) {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    }

    const startRaf = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(raf);
    };

    const stopRaf = () => {
      if (rafId === null) return;
      window.cancelAnimationFrame(rafId);
      rafId = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lenis.stop();
        stopRaf();
        return;
      }

      lenis.start();
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

      event.preventDefault();
      scrollToHash(href);
    };

    startRaf();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleHashLinkClick);

    return () => {
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
