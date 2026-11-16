"use client";

import { useEffect } from "react";
import { emitGuide } from "@/lib/guide/bus";
import { INTRO, nameArcFrames, whenAvatarDrawn } from "@/lib/hero-intro";

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

/**
 * Plays the hero's intro, once, on a load of the homepage at the top:
 *
 *   1. Nex appears asleep at the centre of the screen, a little larger than
 *      its place in the hero.
 *   2. It wakes: the library's waking clip, one pulse, its glow comes up.
 *   3. It settles into its place in the name, shrinking to its resting size,
 *      while "Nikunj" and "Khitha" sweep in from their own sides on mirrored
 *      arcs and close on it.
 *   4. The rest resolves below, top to bottom.
 *
 * The decision to play is made before the first paint (`PLAY_SCRIPT`), and
 * CSS draws the starting frame from that first paint. One timeline with the
 * Web Animations API; everything it set is removed at the end. A click, key,
 * wheel or touch skips to the end. Each run carries its own token, so a
 * cancelled run (React's development double effect, a route change) can never
 * finish the intro for the run that replaced it.
 *
 * Glass and solid surfaces (`data-hero-glass`) are moved in, never faded: a
 * parent below full opacity flattens backdrop blur until the fade ends.
 */
export function HeroIntro() {
  useEffect(() => {
    const root = document.documentElement;
    const finish = () => {
      delete root.dataset.heroIntro;
      root.dataset.heroReady = "";
    };
    if (root.dataset.heroIntro !== "play") {
      finish();
      return;
    }

    const hero = document.getElementById("hero");
    const q = (sel: string) => hero?.querySelector<HTMLElement>(sel) ?? null;
    const stage = q("[data-hero-part=stage]");
    const glow = q("[data-hero-part=avatar-glow]");
    const zz = q("[data-hero-part=zz]");
    const pulse = q("[data-hero-part=pulse]");
    // The ring: its track draws on as Nex wakes, its orbit fades in as it settles.
    const ringTrack = q("[data-hero-part=ring-track]");
    const ringTrackLine = ringTrack?.querySelector("circle") ?? null;
    const ringTicks = ringTrack ? [...ringTrack.querySelectorAll("line")] : [];
    const ringOrbit = q("[data-hero-part=ring-orbit]");
    const backdrop = q("[data-hero-part=backdrop]");
    const names = [...(hero?.querySelectorAll<HTMLElement>("[data-hero-name]") ?? [])];
    const caption = q("[data-hero-part=ask-host]");
    const copy = [...(hero?.querySelectorAll<HTMLElement>("[data-hero-part=copy]") ?? [])];
    if (!hero || !stage) {
      finish();
      return;
    }

    let alive = true;
    const running: Animation[] = [];
    const play = (el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      if (!el || !alive) return null;
      const animation = el.animate(keyframes, { fill: "both", ...options });
      running.push(animation);
      return animation;
    };
    const skip = () => running.forEach((animation) => animation.finish());
    const skipEvents = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    let skipped = false;
    const onSkip = () => {
      skipped = true;
      skip();
    };
    skipEvents.forEach((name) => window.addEventListener(name, onSkip, { passive: true, once: true }));

    // Measured before anything moves (CSS holds the start frame with opacity
    // and clip only, so these are the real resting places).
    const rest = stage.getBoundingClientRect();
    const fromCentre = {
      x: window.innerWidth / 2 - (rest.left + rest.width / 2),
      y: window.innerHeight / 2 - (rest.top + rest.height / 2),
    };
    const asleep = `translate(${Math.round(fromCentre.x)}px, ${Math.round(fromCentre.y)}px) scale(${INTRO.stageScale})`;
    const nameStarts = names.map((el) => {
      const box = el.getBoundingClientRect();
      const left = el.dataset.heroName === "left";
      return { el, left, distance: left ? box.right + 32 : window.innerWidth - box.left + 32, lift: box.height * 0.55 };
    });

    const run = async () => {
      // 1. Asleep at the centre of the screen.
      play(stage, [{ transform: asleep, opacity: 0, filter: "blur(8px)" }, { transform: asleep, opacity: 1, filter: "blur(0)" }], { duration: 450, easing: EASE_OUT });
      play(glow, [{ opacity: 0 }, { opacity: 0.4 }], { duration: 450 });
      const live = await whenAvatarDrawn(INTRO.avatarTimeoutMs);
      if (!alive || skipped || !live) return;
      emitGuide({ type: "intro/sleep" });
      play(zz, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      await wait(INTRO.sleepMs);
      if (!alive || skipped) return;

      // 2. It wakes.
      emitGuide({ type: "intro/wake", now: Date.now() });
      play(zz, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
      play(pulse, [{ opacity: 0.85, transform: "scale(0.9)" }, { opacity: 0, transform: "scale(1.6)" }], { duration: 800, easing: EASE_OUT });
      play(glow, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 600, easing: EASE_OUT });
      // Power on: one sweep draws the track round Nex, the ticks land after it.
      play(ringTrack, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
      play(ringTrackLine, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: INTRO.wakeMs + 260, easing: EASE_IN_OUT });
      ringTicks.forEach((tick, index) => play(tick, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 140 + index * ((INTRO.wakeMs + 120) / 4) }));
      play(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: 1000, easing: EASE_OUT });
      await wait(INTRO.wakeMs);
      if (!alive || skipped) return;

      // 3. It settles into its place, shrinking to size, and the name closes in.
      const settle = play(stage, [{ transform: asleep }, { transform: "none" }], { duration: INTRO.moveMs, easing: EASE_IN_OUT });
      play(ringOrbit, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: INTRO.moveMs * 0.5, easing: EASE_OUT });
      nameStarts.forEach(({ el, left, distance, lift }) => {
        play(el, nameArcFrames({ left, distance, lift }), { duration: INTRO.nameMs, delay: INTRO.nameStartMs, easing: "linear" });
      });

      // 4. What Nex says, then the rest, top to bottom.
      play(caption, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 480, delay: INTRO.copyStartMs - 120, easing: EASE_OUT });
      copy.forEach((el, index) => {
        const glass = el.hasAttribute("data-hero-glass");
        const delay = INTRO.copyStartMs + index * INTRO.copyStaggerMs;
        play(
          el,
          glass
            ? [{ opacity: 1, transform: "translateY(14px)", clipPath: "inset(0 0 100% 0)" }, { opacity: 1, transform: "none", clipPath: "inset(0 0 0 0)" }]
            : [{ opacity: 0, transform: "translateY(14px)", filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
          { duration: INTRO.copyMs, delay, easing: EASE_OUT }
        );
      });

      await Promise.all([settle?.finished, ...running.map((animation) => animation.finished)]).catch(() => {});
    };

    // The page must never stay hidden: the CSS failsafe reveals it at 4s, and
    // this ends the intro at the same deadline whatever is still pending.
    const deadline = window.setTimeout(onSkip, INTRO.deadlineMs);

    void run().finally(() => {
      window.clearTimeout(deadline);
      if (!alive) return; // a newer run owns the intro now
      skipEvents.forEach((name) => window.removeEventListener(name, onSkip));
      running.forEach((animation) => animation.cancel());
      finish();
    });

    return () => {
      alive = false;
      window.clearTimeout(deadline);
      skipEvents.forEach((name) => window.removeEventListener(name, onSkip));
      running.forEach((animation) => animation.cancel());
      // Unmounted mid-intro (a route change): leave the page shown, not hidden.
      if (root.dataset.heroIntro === "play" && !document.getElementById("hero")?.isConnected) finish();
    };
  }, []);

  return null;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
