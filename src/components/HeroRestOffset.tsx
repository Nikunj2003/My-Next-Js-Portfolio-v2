"use client";

import { useLayoutEffect } from "react";

/**
 * Centres the hero's content in the screen at rest, then holds it there.
 *
 * The hero used to centre its content with flexbox, so when the chat or the
 * tour chooser opened under the actions the block grew and flexbox re-centred
 * it: the name and Nex slid up by half of what opened, which read as the page
 * jumping. Here the free space is measured at rest (the hero's open panels are
 * zero-height then) and kept as a fixed top offset (`--hero-rest`), so
 * anything that opens grows the page downward and nothing above it moves.
 * Measured again on a resize, and only while nothing is open.
 */
export function HeroRestOffset() {
  useLayoutEffect(() => {
    const hero = document.getElementById("hero");
    const content = hero?.querySelector<HTMLElement>("[data-hero-content]");
    if (!hero || !content) return;
    const measure = () => {
      if (content.querySelector("#nex-host-hero, [data-hero-expanded]")) return;
      const styles = getComputedStyle(hero);
      const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      const free = window.innerHeight - padding - content.offsetHeight;
      hero.style.setProperty("--hero-rest", `${Math.max(0, Math.floor(free / 2))}px`);
    };
    measure();
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(measure, 150);
    };
    window.addEventListener("resize", onResize);
    // Fonts landing change the name's size: measure again then too.
    void document.fonts?.ready.then(measure);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
    };
  }, []);
  return null;
}
