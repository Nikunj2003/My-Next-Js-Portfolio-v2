"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { whenIdle } from "@/components/guide/GuideAvatarSlot";
import { appendTwinExchange } from "@/lib/chat/twin-chat-store";
import { openAsk, openPanel } from "@/lib/guide/companion-store";

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

  useEffect(() => whenIdle(() => setReady(true)), []);

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
