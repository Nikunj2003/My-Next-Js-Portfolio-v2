"use client";

import { useEffect } from "react";
import { emitGuide } from "@/lib/guide/bus";
import { INTRO, whenAvatarDrawn } from "@/lib/hero-intro";

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

/**
 * Plays the hero's intro, once, on a load of the homepage at the top:
 *
 *   1. The avatar is in the middle of the screen, asleep (eyes closed, z's).
 *   2. It wakes up: the library's waking clip, a pulse, its glow comes up.
 *   3. It glides to its place on the right.
 *   4. The left side appears, top to bottom, with its chips and buttons.
 *
 * The decision to play is made before the first paint (`PLAY_SCRIPT` in
 * lib/hero-intro), and CSS shows the starting frame from that first paint:
 * the copy hidden, the avatar's stage in the middle. This component then runs
 * one timeline with the Web Animations API, awaiting each beat, and removes
 * every style it set when it ends. A click, a key or a wheel skips to the end.
 *
 * Glass and solid surfaces (`data-hero-glass`) are moved in, never faded: a
 * parent below full opacity flattens backdrop blur until the fade ends.
 */
export function HeroIntro() {
  useEffect(() => {
    const root = document.documentElement;
    const done = () => {
      delete root.dataset.heroIntro;
      root.dataset.heroReady = "";
    };
    if (root.dataset.heroIntro !== "play") {
      done();
      return;
    }

    const hero = document.getElementById("hero");
    const q = <T extends Element = HTMLElement>(sel: string) => hero?.querySelector<T & HTMLElement>(sel) ?? null;
    const stage = q("[data-hero-part=stage]");
    const glow = q("[data-hero-part=avatar-glow]");
    const zz = q("[data-hero-part=zz]");
    const pulse = q("[data-hero-part=pulse]");
    const backdrop = q("[data-hero-part=backdrop]");
    const chips = [...(hero?.querySelectorAll<HTMLElement>("[data-hero-chip]") ?? [])];
    const avatarUi = q("[data-hero-part=avatar-ui]");
    const copy = [...(hero?.querySelectorAll<HTMLElement>("[data-hero-part=copy]") ?? [])];
    if (!hero || !stage) {
      done();
      return;
    }

    const running: Animation[] = [];
    const play = (el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      if (!el) return null;
      const animation = el.animate(keyframes, { fill: "both", ...options });
      running.push(animation);
      return animation;
    };
    let cancelled = false;
    const skip = () => {
      cancelled = true;
      running.forEach((animation) => animation.finish());
    };
    const skipEvents = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    skipEvents.forEach((name) => window.addEventListener(name, skip, { passive: true, once: true }));

    // Where the stage sits at rest, and the offset that puts it in the middle
    // of the screen. Measured with no transform on it (CSS holds the start
    // frame with opacity only, never a transform, so this is its real place).
    const rest = stage.getBoundingClientRect();
    const toCentre = {
      x: window.innerWidth / 2 - (rest.left + rest.width / 2),
      y: window.innerHeight / 2 - (rest.top + rest.height / 2),
    };
    const centred = `translate(${toCentre.x}px, ${toCentre.y}px) scale(${INTRO.stageScale})`;

    const run = async () => {
      // 1. Asleep in the middle. The stage appears out of the dark there.
      play(stage, [{ transform: centred, opacity: 0, filter: "blur(10px)" }, { transform: centred, opacity: 1, filter: "blur(0)" }], { duration: 600, easing: EASE_OUT });
      play(glow, [{ opacity: 0 }, { opacity: 0.35 }], { duration: 600 });
      const live = await whenAvatarDrawn(INTRO.avatarTimeoutMs);
      if (cancelled) return;
      if (!live) return; // it couldn't load: show the page as it is
      emitGuide({ type: "intro/sleep" });
      play(zz, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
      await wait(INTRO.sleepMs);
      if (cancelled) return;

      // 2. It wakes up.
      emitGuide({ type: "intro/wake", now: Date.now() });
      play(zz, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
      play(pulse, [{ opacity: 0.9, transform: "scale(0.9)" }, { opacity: 0, transform: "scale(1.8)" }], { duration: 900, easing: EASE_OUT });
      play(glow, [{ opacity: 0.35 }, { opacity: 1 }], { duration: 700, easing: EASE_OUT });
      play(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: 1200, easing: EASE_OUT });
      await wait(INTRO.wakeMs);
      if (cancelled) return;

      // 3. It takes its place on the right.
      const move = play(stage, [{ transform: centred }, { transform: "none" }], { duration: INTRO.moveMs, easing: EASE_IN_OUT });

      // 4. The left side appears as it settles, top to bottom, then the
      //    avatar's chips and buttons.
      copy.forEach((el, index) => {
        const glass = el.hasAttribute("data-hero-glass");
        const delay = INTRO.copyStartMs + index * INTRO.copyStaggerMs;
        play(
          el,
          glass
            ? [{ opacity: 1, transform: "translateY(16px)", clipPath: "inset(0 0 100% 0)" }, { opacity: 1, transform: "none", clipPath: "inset(0 0 0 0)" }]
            : [{ opacity: 0, transform: "translateY(16px)", filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
          { duration: INTRO.copyMs, delay, easing: EASE_OUT }
        );
      });
      chips.forEach((chip, index) => {
        play(chip, [{ transform: "scale(0.6)", clipPath: "circle(0% at 50% 50%)" }, { transform: "none", clipPath: "circle(80% at 50% 50%)" }], {
          duration: 520,
          delay: INTRO.moveMs - 120 + index * 80,
          easing: EASE_OUT,
        });
      });
      play(avatarUi, [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 560, delay: INTRO.moveMs, easing: EASE_OUT });

      await Promise.all([move?.finished, ...running.map((animation) => animation.finished)]).catch(() => {});
    };

    run().finally(() => {
      skipEvents.forEach((name) => window.removeEventListener(name, skip));
      // Hand every element back to its own CSS.
      running.forEach((animation) => animation.cancel());
      done();
    });

    return () => {
      skipEvents.forEach((name) => window.removeEventListener(name, skip));
      running.forEach((animation) => animation.cancel());
    };
  }, []);

  return null;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
