"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { whenIdle } from "@/components/guide/GuideAvatarSlot";
import { appendNexExchange } from "@/lib/chat/nex-chat-store";
import { openAsk, openPanel } from "@/lib/guide/companion-store";
import { START_TOUR_EVENT, type StartTourDetail } from "@/lib/guide/tour-control";
import { introPending } from "@/lib/hero-intro";
import type { AskHost } from "@/lib/guide/bubble-policy";

const GuideCompanion = dynamic(() => import("@/components/guide/GuideCompanion"), { ssr: false, loading: () => null });

/**
 * Mounts the scroll companion once the browser is idle, so it costs nothing on
 * first load. It also owns the `open-nex` listener, which has to work from
 * the first click even before the avatar itself has loaded:
 *
 * - `openNex(question)` opens the inline ask bubble and sends the question.
 * - `openNex(question, answer)` hands an inline answer off: the exchange is
 *   appended without re-sending, and the full conversation opens.
 * - `{ expand: true }` opens the full conversation panel.
 */
export function GuideCompanionMount() {
  const [ready, setReady] = useState(false);
  // The start waiting for the narrator, with its visitor path (replayed as asked).
  const [pendingTour, setPendingTour] = useState<false | StartTourDetail>(false);
  const replayingRef = useRef(false);

  // On idle, so it costs nothing on first load, except when the hero's intro
  // is about to play: the intro moves this one Nex, so it loads at once.
  useEffect(() => {
    if (introPending()) {
      queueMicrotask(() => setReady(true));
      return;
    }
    return whenIdle(() => setReady(true));
  }, []);

  // A tour start before the companion has loaded would reach nobody. Load it
  // now, then replay the event once the narrator is listening (it marks <html>).
  useEffect(() => {
    const onStart = (event: Event) => {
      if (replayingRef.current || document.documentElement.dataset.guideTour === "ready") return;
      setReady(true);
      setPendingTour((event as CustomEvent<StartTourDetail>).detail ?? {});
    };
    window.addEventListener(START_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_TOUR_EVENT, onStart);
  }, []);

  useEffect(() => {
    if (!ready || !pendingTour) return;
    const startedAt = performance.now();
    let frame = 0;
    const poll = () => {
      if (document.documentElement.dataset.guideTour === "ready") {
        replayingRef.current = true;
        window.dispatchEvent(new CustomEvent<StartTourDetail>(START_TOUR_EVENT, { detail: pendingTour || {} }));
        replayingRef.current = false;
        setPendingTour(false);
      } else if (performance.now() - startedAt < 5000) {
        frame = requestAnimationFrame(poll);
      } else {
        setPendingTour(false);
      }
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [ready, pendingTour]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ question?: string; answer?: string; expand?: boolean; host?: AskHost; inPage?: boolean }>).detail ?? {};
      const question = detail.question?.trim() ?? "";
      setReady(true);
      if (question && detail.answer) {
        appendNexExchange(question, detail.answer);
        if (detail.inPage) openAsk(undefined, detail.host);
        else openPanel();
        return;
      }
      if (detail.expand) {
        openPanel();
        return;
      }
      openAsk(question || undefined, detail.host);
    };
    window.addEventListener("open-nex", onOpen);
    return () => window.removeEventListener("open-nex", onOpen);
  }, []);

  return ready ? <GuideCompanion /> : null;
}
