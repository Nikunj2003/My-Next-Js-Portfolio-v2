"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Send, User, Trash2, ArrowDown } from "lucide-react";
import { type Components } from "react-markdown";
import { useRouter } from "next/navigation";
import { buildAnswerComponents } from "@/components/ai/AnswerBody";
import { NexAnswerBody } from "@/components/ai/NexAnswerBody";
import { StaticGuideMark } from "@/components/guide/GuideAvatarSlot";
import { chatSuggestions } from "@/data/portfolio";
import type { ChatToolCall } from "@/lib/chat-contract";
import { clearNexChat, isNexChatBusy, partialAnswerNote, retryNexMessage, sendNexMessage } from "@/lib/chat/nex-chat-store";
import type { Message } from "@/lib/chat/types";
import { useTurnAnchor } from "@/lib/chat/useTurnAnchor";
import { useNexChat } from "@/lib/chat/useNexChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatAvailability } from "@/hooks/useChatAvailability";
import { useLenisLock } from "@/hooks/useLenisLock";
import { scrollToHash } from "@/lib/scroll";
import { runGuideAction } from "@/lib/guide/actions";
import { emitGuide } from "@/lib/guide/bus";
import { closePanel, openPanel, takePendingQuestion, useCompanionState } from "@/lib/guide/companion-store";
import { cn } from "@/lib/utils";

const messageSelector = (id: string) => `[data-message-id="${id}"]`;
/** Stable module-level setter: the open state lives in the companion store. */
const setIsOpen = (open: boolean) => (open ? openPanel() : closePanel());
function isVisible(node: HTMLElement) {
  if (node.getClientRects().length === 0) return false;
  const style = getComputedStyle(node);
  return style.visibility !== "hidden" && style.display !== "none";
}
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * The full conversation panel with Nex. The conversation itself lives in the
 * shared Nex chat store, so this panel and the inline ask bubble beside the
 * guide avatar always show the same history. Opened from the bubble's
 * "Open full conversation" or by `openNex(..., { expand: true })`.
 */
const NexChat = () => {
  const { panelOpen: isOpen } = useCompanionState();

  const isMobile = useIsMobile();

  /*
   * Locked on mobile only.
   *
   * Mobile renders `fixed inset-0` with a full backdrop, so it is a modal and
   * the page behind it must not move. Desktop is a 20-24rem corner panel with
   * no scrim — a non-modal surface the visitor is expected to read *alongside*
   * the page, so freezing the page behind it was wrong.
   */
  useLenisLock(isOpen && isMobile);
  const { messages, isLoading, announcement, turnAnchorId } = useNexChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const shouldReduceMotion = useReducedMotion();
  const { status: chatAvailabilityStatus } = useChatAvailability();
  const router = useRouter();
  const { spacerRef, showJump: showJumpToLatest, jumpToLatest, restoreToEnd } = useTurnAnchor(scrollRef, {
    anchorId: turnAnchorId,
    selector: messageSelector,
    reducedMotion: Boolean(shouldReduceMotion),
    active: isOpen,
    layoutKey: isMobile ? "mobile" : "desktop",
  });

  const navigateToSection = useCallback(
    (href: string) => {
      const performScroll = () => {
        scrollToHash(href);
      };

      if (isMobile) {
        setIsOpen(false);
      }

      window.setTimeout(performScroll, isMobile && !shouldReduceMotion ? 180 : 0);
    },
    [isMobile, shouldReduceMotion]
  );

  // Internal pages (/work/...) go through the router. On mobile the sheet
  // closes first so the new page isn't hidden behind it.
  const navigateToPath = useCallback(
    (href: string) => {
      if (isMobile) setIsOpen(false);
      router.push(href);
    },
    [isMobile, router]
  );

  // Shared with every inline answer surface via `buildAnswerComponents`, so
  // the panel and an in-page answer render markdown identically rather than
  // maintaining two copies that quietly drift.
  const markdownComponents = useMemo<Components>(
    () => buildAnswerComponents(navigateToSection, navigateToPath),
    [navigateToPath, navigateToSection]
  );

  // Opening the panel shows the end of the history once. After that, nothing
  // scrolls on its own: a new question is anchored to the top by useTurnAnchor.
  useLayoutEffect(() => {
    if (isOpen) restoreToEnd();
  }, [isOpen, restoreToEnd]);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        // Back to where the visitor was, if that is still on screen; otherwise
        // the companion button; otherwise leave focus alone.
        // The opener may have been inside the ask box, which closed when the
        // panel opened; the hero avatar stands in for it on the homepage.
        const candidates = [
          restoreFocusRef.current,
          document.querySelector<HTMLElement>("[data-guide-companion-button]"),
          document.querySelector<HTMLElement>("[data-guide-hero-avatar]"),
        ];
        const focusTarget = candidates.find((node): node is HTMLElement => Boolean(node) && document.contains(node) && isVisible(node!) && node!.tabIndex >= 0 && !node!.closest("[aria-hidden='true']"));
        focusTarget?.focus({ preventScroll: true });
      }

      restoreFocusRef.current = null;
      wasOpenRef.current = false;
      return;
    }

    if (!wasOpenRef.current) {
      const activeElement = document.activeElement;
      restoreFocusRef.current =
        activeElement instanceof HTMLElement && activeElement !== document.body ? activeElement : null;
    }
    wasOpenRef.current = true;

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, isMobile && !shouldReduceMotion ? 220 : 40);

    return () => window.clearTimeout(focusTimer);
  }, [isMobile, isOpen, shouldReduceMotion]);

  // The input stays enabled while an answer streams, so focus isn't lost when
  // sending. If focus drifted off it during the wait (the visitor tapped a
  // chip or the send button), put it back inside the panel when the answer ends.
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && isOpen) {
      const dialog = dialogRef.current;
      const active = document.activeElement;
      const focusInPanel = !active || active === document.body || Boolean(dialog?.contains(active));
      if (focusInPanel && active !== inputRef.current) inputRef.current?.focus({ preventScroll: true });
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, isOpen]);

  const isTyping = input.trim().length > 0;
  useEffect(() => {
    if (isOpen) emitGuide({ type: "chat/typing", active: isTyping });
  }, [isOpen, isTyping]);

  useEffect(() => {
    if (chatAvailabilityStatus === "unknown") return;
    emitGuide({ type: "availability", available: chatAvailabilityStatus !== "unavailable" });
  }, [chatAvailabilityStatus]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Another layer (the palette, the menu, an IME) already handled it.
        if (event.defaultPrevented || event.isComposing) return;
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      // Only the mobile sheet is modal. The desktop panel sits beside the page
      // (aria-modal="false"), so Tab must be free to leave it.
      const dialogNode = dialogRef.current;
      if (event.key !== "Tab" || !isMobile || !dialogNode) return;

      const focusable = Array.from(dialogNode.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMobile]);

  /*
   * Desktop: the panel sits beside the page, so the page moves right away.
   * Mobile: the sheet covers the page, so scrolling behind it would be
   * invisible. The call is shown as a "Take me there" button instead, which
   * closes the sheet and then moves.
   */
  const handleAgentNavigate = useCallback(
    (call: ChatToolCall) => {
      if (!call.href) return;
      // The sheet covers the page, so neither a scroll nor a route change would be seen.
      if (isMobile) return;
      window.setTimeout(() => runGuideAction({ href: call.href!, highlight: call.highlight }, router), 300);
    },
    [isMobile, router]
  );

  const takeMeThere = useCallback(
    (call: ChatToolCall) => {
      if (!call.href) return;
      setIsOpen(false);
      window.setTimeout(
        () => runGuideAction({ href: call.href!, highlight: call.highlight }, router),
        shouldReduceMotion ? 0 : 260
      );
    },
    [router, shouldReduceMotion]
  );

  const handleSend = useCallback(
    (text?: string) => {
      const message = (text ?? input).trim();
      if (!message || isNexChatBusy()) return;
      // The busy check above is synchronous, so the store will take this one.
      if (text === undefined) setInput("");
      void sendNexMessage(message, { unavailable: chatAvailabilityStatus === "unavailable", onNavigate: handleAgentNavigate });
    },
    [chatAvailabilityStatus, handleAgentNavigate, input]
  );

  // A question asked elsewhere while the panel is open ("Ask about this", the
  // palette) is queued in the companion store; send it once the chat is free.
  const { pendingQuestion } = useCompanionState();
  useEffect(() => {
    if (!isOpen || !pendingQuestion || isLoading) return;
    const timer = window.setTimeout(() => {
      if (isNexChatBusy()) return;
      const question = takePendingQuestion();
      if (question) handleSend(question);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [handleSend, isLoading, isOpen, pendingQuestion]);

  const handleSuggestionClick = (text: string) => handleSend(text);

  const handleRetry = (message: Message) =>
    retryNexMessage(message, { unavailable: chatAvailabilityStatus === "unavailable", onNavigate: handleAgentNavigate });

  const clearChat = () => clearNexChat();

  const chatStatusLabel =
    chatAvailabilityStatus === "available"
      ? "Nex is online"
      : chatAvailabilityStatus === "checking"
        ? "Checking Nex…"
        : chatAvailabilityStatus === "unknown"
          ? "Status unknown"
        : "Nex is offline";
  const chatStatusDotClass =
    chatAvailabilityStatus === "available"
      ? "bg-emerald-500 animate-pulse"
      : chatAvailabilityStatus === "checking"
        ? "bg-amber-400 animate-pulse"
        : chatAvailabilityStatus === "unknown"
          ? "bg-amber-400/70"
        : "bg-muted-foreground/60";
  const canSendMessages = chatAvailabilityStatus !== "unavailable";

  // Shared render function for ChatContent (prevents unmount/remount on every keystroke)
  const renderChatContent = () => (
    <div className="flex flex-col h-full w-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className={cn(
        "flex-none border-b border-border/40 flex items-center justify-between",
        isMobile ? "px-4 py-3 bg-background" : "px-5 py-4 bg-accent/5"
      )}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full guide-disc ring-1 ring-primary/30">
            <StaticGuideMark size={30} />
          </div>
          <div>
            <p id="nex-title" className="text-sm font-semibold">Nex <span className="font-normal text-muted-foreground">· AI guide to Nikunj&apos;s work</span></p>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full motion-reduce:animate-none ${chatStatusDotClass}`} />
              <p id="nex-status" className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{chatStatusLabel}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearChat}
            className="p-2 transition-colors hover:bg-muted rounded-full"
            title="Clear chat"
            aria-label="Clear chat history"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 transition-colors hover:bg-muted rounded-full"
            aria-label="Close Nex"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

      {/* Messages */}
      <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        data-lenis-prevent
        role="log"
        aria-live="off"
        // Keyboard users can scroll the conversation.
        tabIndex={0}
        className={cn(
          "scroll-panel flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-6 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20",
          isMobile ? "px-3 py-4" : "px-4 py-6"
        )}
      >
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-4">
            <motion.div
              data-message-id={msg.id}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.15 : 0.3 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "justify-start"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                msg.role === "assistant" ? "bg-primary/10" : "bg-muted"
              }`}>
                {msg.role === "assistant" ? <StaticGuideMark size={22} /> : <User className="w-4 h-4" />}
              </div>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-accent-soft ${
                  msg.role === "user"
                    ? "max-w-[85%] bg-primary text-primary-foreground rounded-tr-none"
                    : msg.error
                      ? "w-full max-w-[calc(100%-2.75rem)] sm:max-w-[88%] rounded-tl-none border border-amber-500/30 bg-amber-500/5 text-foreground"
                      : "w-full max-w-[calc(100%-2.75rem)] sm:max-w-[88%] bg-muted/50 dark:bg-muted/20 border border-border/20 rounded-tl-none text-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <>
                    <NexAnswerBody
                      message={msg}
                      components={markdownComponents}
                      reducedMotion={Boolean(shouldReduceMotion)}
                      showTakeMeThere={isMobile}
                      onTakeMeThere={takeMeThere}
                    />
                    {/* A kept partial answer: the text above, why it stopped here. */}
                    {partialAnswerNote(msg) && (
                      <p role="alert" className="mt-3 border-t border-amber-500/30 pt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                        {partialAnswerNote(msg)}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="line-clamp-6">{msg.content}</span>
                )}
              </div>
            </motion.div>

            {msg.role === "assistant" && msg.error?.retryable && (
              <motion.div
                className="mt-3 flex items-center gap-2 pl-11"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduceMotion ? 0 : 0.2, duration: shouldReduceMotion ? 0.2 : 0.25 }}
              >
                <button
                  type="button"
                  onClick={() => handleRetry(msg)}
                  disabled={isLoading || msg.error.isRetrying}
                  className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {msg.error.isRetrying ? "Retrying..." : "Retry"}
                </button>
                <span className="text-[11px] text-muted-foreground">
                  {msg.error.code === "rate_limited" ? "Wait a moment if it keeps failing." : "Sends the same prompt again."}
                </span>
              </motion.div>
            )}

            {/* Suggestions beneath the AI message */}
            {msg.role === "assistant" && msg.suggestions && msg.suggestions.length > 0 && (
              <motion.div
                className="mt-3 flex flex-wrap gap-2 pl-11"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduceMotion ? 0 : 0.55, duration: shouldReduceMotion ? 0.2 : 0.3 }}
              >
                {msg.suggestions.map((s, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    disabled={!canSendMessages || isLoading}
                    className={`group relative max-w-full select-none overflow-hidden rounded-full px-3 py-1 text-[11px] transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      canSendMessages
                        ? "bg-primary/10 text-foreground hover:bg-primary/20"
                        : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                    }`}
                    aria-label={`Ask: ${s}`}
                  >
                    <span className="relative z-10 flex max-w-full items-center gap-1 overflow-hidden whitespace-nowrap">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3 opacity-60"
                      >
                        <path d="M12 19l-7-7 7-7" />
                        <path d="M19 19l-7-7 7-7" />
                      </svg>
                      <span className="truncate">{s}</span>
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        ))}
        {/*
          Shown only when no assistant bubble exists yet.

          This indicator predates streaming, when a pending answer had nothing on
          screen at all. Now the assistant bubble is placed as soon as the first
          event arrives and carries its own status ("Thinking", tool trace), so
          an unconditional `isLoading` indicator rendered a SECOND empty bubble
          beneath the real one.
        */}
        {isLoading && !messages.some((message) => message.streaming) && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <StaticGuideMark size={22} />
            </div>
            <div className="bg-muted/50 dark:bg-muted/20 border border-border/20 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5 items-center shadow-accent-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce motion-reduce:animate-none [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce motion-reduce:animate-none [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce motion-reduce:animate-none" />
            </div>
          </div>
        )}
        {/* Room below a new question, so it can sit at the top while its
            answer streams in. Shrinks to nothing as the answer grows. */}
        <div ref={spacerRef} aria-hidden="true" className="pointer-events-none !mt-0 shrink-0" />
      </div>
      {showJumpToLatest && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-3 left-1/2 flex min-h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/50 glass-strong px-3 py-1.5 text-xs font-medium text-foreground shadow-accent-soft transition-colors hover:text-primary"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          Jump to latest
        </button>
      )}
      </div>

      {/* Action Area */}
      <div className={cn(
        "flex-none border-t border-border/40",
        isMobile
          ? "p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-background"
          : "p-4 bg-accent/5"
      )}>
        {/* Initial suggestions if no conversation yet */}
        {messages.length <= 1 && !isLoading && (
          <motion.div
            className="mb-4 flex flex-wrap gap-2"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.15 : 0.3 }}
          >
            {(isMobile ? chatSuggestions : chatSuggestions.slice(0, 4)).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => handleSuggestionClick(s)}
                disabled={!canSendMessages}
                className={`max-w-full select-none overflow-hidden rounded-full px-3 py-1 text-xs transition-colors ${
                  canSendMessages
                    ? "bg-primary/10 text-foreground hover:bg-primary/20"
                    : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                }`}
              >
                <span className="block truncate whitespace-nowrap">{s}</span>
              </button>
            ))}
          </motion.div>
        )}

        {chatAvailabilityStatus === "unknown" && (
          <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
            This browser could not verify the live assistant ahead of time. You can still try sending a message below.
          </div>
        )}

        {chatAvailabilityStatus === "unavailable" && (
          <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
            The live assistant is unavailable right now. You can still use the contact section or resume while the service is down.
          </div>
        )}

        {/* Input */}
        <div className="relative flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
              e.preventDefault();
              void handleSend();
            }}
            placeholder={canSendMessages ? "Ask Nex about Nikunj's work…" : "Nex is offline right now."}
            aria-label="Message Nex"
            autoComplete="off"
            disabled={!canSendMessages}
            className="flex-1 bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading || !canSendMessages}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-accent-soft"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/60">
          Chat history stays on this device for 7 days. Use Clear chat to remove it sooner.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Conditional Rendering Based on Viewport */}
      {isMobile ? (
        // Mobile: Fullscreen overlay (using Dialog pattern instead of Drawer)
        <AnimatePresence mode="wait">
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="chat-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0.15 : 0.25 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-50 bg-black/80 glass-scrim"
                aria-hidden="true"
              />

              {/* Chat Content */}
              <motion.div
                id="nex-dialog"
                ref={dialogRef}
                key="chat-content"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
                transition={shouldReduceMotion ? { duration: 0.2 } : { type: "spring", damping: 30, stiffness: 300 }}
                className="fixed inset-0 z-50 flex flex-col bg-background"
                style={{ height: '100dvh', maxHeight: '100dvh' }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Conversation with Nex"
                aria-describedby="nex-status"
              >
                {renderChatContent()}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        // Desktop: Existing floating panel
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id="nex-dialog"
              layout
              layoutId="chat-window"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 20, rotateX: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 10, rotateX: 10 }}
              transition={
                shouldReduceMotion
                  ? { layout: { duration: 0.2 }, duration: 0.2 }
                  : {
                      layout: { type: "spring", stiffness: 260, damping: 34, mass: 0.7 },
                      type: "spring" as const,
                      stiffness: 260,
                      damping: 34,
                      mass: 0.7,
                    }
              }
              className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 glass-strong glass-overlay border border-border/60 rounded-2xl shadow-accent-card flex flex-col overflow-hidden"
              style={{
                height: "32rem",
                maxHeight: "calc(100vh - 8rem)",
              }}
              aria-label="Conversation with Nex"
              aria-describedby="nex-status"
              role="dialog"
              aria-modal="false"
            >
              {renderChatContent()}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
};

export default NexChat;
