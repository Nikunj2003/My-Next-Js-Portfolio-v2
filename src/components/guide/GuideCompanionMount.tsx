"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { whenIdle } from "@/components/guide/GuideAvatarSlot";
import { appendTwinExchange } from "@/lib/chat/twin-chat-store";
import { openAsk, openPanel } from "@/lib/guide/companion-store";
import { START_TOUR_EVENT } from "@/lib/guide/tour-control";

const GuideCompanion = dynamic(() => import("@/components/guide/GuideCompanion"), { ssr: false, loading: () => null });

/**
 * Mounts the scroll companion once the browser is idle, so it costs nothing on
 * first load. It also owns the `open-ai-twin` listener, which has to work from
 * the first click even before the avatar itself has loaded:
 *
 * - `openAiTwin(question)` opens the inline ask bubble and sends the question.
 * - `openAiTwin(question, answer)` hands an inline answer off: the exchange is
 *   appended without re-sending, and the full conversation opens.
 * - `{ expand: true }` opens the full conversation panel.
 */
export function GuideCompanionMount() {
  const [ready, setReady] = useState(false);
  const [pendingTour, setPendingTour] = useState(false);
  const replayingRef = useRef(false);

  useEffect(() => whenIdle(() => setReady(true)), []);

  // A tour start before the companion has loaded would reach nobody. Load it
  // now, then replay the event once the narrator is listening (it marks <html>).
  useEffect(() => {
    const onStart = () => {
      if (replayingRef.current || document.documentElement.dataset.guideTour === "ready") return;
      setReady(true);
      setPendingTour(true);
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
        window.dispatchEvent(new CustomEvent(START_TOUR_EVENT));
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
      const detail = (event as CustomEvent<{ question?: string; answer?: string; expand?: boolean }>).detail ?? {};
      const question = detail.question?.trim() ?? "";
      setReady(true);
      if (question && detail.answer) {
        appendTwinExchange(question, detail.answer);
        openPanel();
        return;
      }
      if (detail.expand) {
        openPanel();
        return;
      }
      openAsk(question || undefined);
    };
    window.addEventListener("open-ai-twin", onOpen);
    return () => window.removeEventListener("open-ai-twin", onOpen);
  }, []);

  return ready ? <GuideCompanion /> : null;
}
