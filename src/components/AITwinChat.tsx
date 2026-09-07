"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Trash2, Wrench } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { buildAnswerComponents } from "@/components/ai/AnswerBody";
import { chatSuggestions } from "@/data/portfolio";
import {
  CHAT_CLIENT_TIMEOUT_MS,
  CHAT_STREAM_IDLE_TIMEOUT_MS,
  CHAT_ENDPOINT,
  createChatEventParser,
  type ChatToolCall,
  type ChatTrace,
} from "@/lib/chat-contract";
import {
  createStoredChatEnvelope,
  parseStoredChatEnvelope,
} from "@/lib/chat-storage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatAvailability } from "@/hooks/useChatAvailability";
import { useLenisLock } from "@/hooks/useLenisLock";
import { scrollToHash } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import { CHAT_MEMORY_WINDOW, CHAT_STORAGE_KEY, WELCOME_MESSAGE, trimConversationHistory } from "@/lib/ai-twin";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  /** Tools the agent invoked for this answer, in call order. */
  toolCalls?: ChatToolCall[];
  /** Closing summary of how the answer was produced. */
  trace?: ChatTrace;
  /** True while text is still streaming in. */
  streaming?: boolean;
  /** Server-reported progress ("Thinking", "Writing answer") while streaming. */
  status?: string;
  error?: {
    code: string;
    retryable: boolean;
    retryText?: string;
    userMessageId?: string;
    isRetrying?: boolean;
  };
}

type SendRequest =
  | string
  | {
      text?: string;
      retryMessageId?: string;
      retryUserMessageId?: string;
    };

type StreamOutcome = {
  content: string;
  suggestions?: string[];
  toolCalls: ChatToolCall[];
  trace?: ChatTrace;
};

type ChatApiError = {
  error?: string;
  code?: string;
  retryable?: boolean;
};

type ChatRequestError = Error & {
  code?: string;
  retryable?: boolean;
  status?: number;
};

const WELCOME = WELCOME_MESSAGE;
const INITIAL_MESSAGES: Message[] = [{ id: "welcome", role: "assistant", content: WELCOME }];
const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const OFFLINE_ASSISTANT_MESSAGE = "Nikunj's AI twin is offline right now. You can still browse the projects, review backend and platform work, use the contact section, or download the resume while the service is unavailable.";

function createMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createChatRequestError(message: string, options: Partial<ChatRequestError> = {}): ChatRequestError {
  const error = new Error(message) as ChatRequestError;
  error.code = options.code;
  error.retryable = options.retryable;
  error.status = options.status;
  return error;
}

function sanitizeMessageError(value: unknown): Message["error"] | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as NonNullable<Message["error"]>;

  if (typeof candidate.code !== "string" || typeof candidate.retryable !== "boolean") {
    return undefined;
  }

  if (candidate.retryText !== undefined && typeof candidate.retryText !== "string") {
    return undefined;
  }

  if (candidate.userMessageId !== undefined && typeof candidate.userMessageId !== "string") {
    return undefined;
  }

  return {
    code: candidate.code,
    retryable: candidate.retryable,
    retryText: candidate.retryText,
    userMessageId: candidate.userMessageId,
    isRetrying: false,
  };
}

async function buildResponseError(response: Response) {
  const raw = await response.text();
  let payload: ChatApiError | null = null;

  try {
    payload = raw ? (JSON.parse(raw) as ChatApiError) : null;
  } catch {
    payload = null;
  }

  const fallbackMessage =
    response.status === 429
      ? "You're sending messages too quickly right now. Please wait a moment and retry."
      : response.status >= 500
        ? "The chat service hit a server error. Please retry."
        : "This message could not be sent.";

  return createChatRequestError(payload?.error || fallbackMessage, {
    code: payload?.code || `http_${response.status}`,
    retryable: payload?.retryable ?? (response.status >= 500 || response.status === 429),
    status: response.status,
  });
}

function getErrorState(error: unknown, retryText: string, userMessageId?: string) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      content: "This request timed out before the assistant finished replying. Retry to send the same message again.",
      error: {
        code: "client_timeout",
        retryable: true,
        retryText,
        userMessageId,
      },
    } satisfies Pick<Message, "content" | "error">;
  }

  if (error instanceof TypeError) {
    return {
      content: "I couldn't reach the chat service just now. Check your connection and retry.",
      error: {
        code: "network_error",
        retryable: true,
        retryText,
        userMessageId,
      },
    } satisfies Pick<Message, "content" | "error">;
  }

  const requestError = error as ChatRequestError;

  return {
    content: requestError.message || "Something went wrong while sending that message.",
    error: {
      code: requestError.code || "unknown_error",
      retryable: requestError.retryable ?? true,
      retryText,
      userMessageId,
    },
  } satisfies Pick<Message, "content" | "error">;
}

function sanitizeStoredMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) return INITIAL_MESSAGES;

  const parsed = value
    .filter((item): item is Message => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Message;
      return (
        typeof candidate.id === "string" &&
        (candidate.role === "user" || candidate.role === "assistant") &&
        typeof candidate.content === "string" &&
        (candidate.suggestions === undefined || Array.isArray(candidate.suggestions))
      );
    })
    .map((message) => ({
      ...message,
      suggestions: Array.isArray(message.suggestions)
        ? message.suggestions.filter((suggestion): suggestion is string => typeof suggestion === "string")
        : undefined,
      // Any stored tool call is finished by definition; a persisted "running"
      // state would spin forever, and a persisted `streaming` flag would leave
      // the caret blinking on a message that is already complete.
      toolCalls: Array.isArray(message.toolCalls)
        ? message.toolCalls
            .filter((call): call is ChatToolCall => Boolean(call) && typeof call.id === "string" && typeof call.label === "string")
            .map((call) => ({ ...call, status: "done" as const }))
        : undefined,
      trace: message.trace && typeof message.trace === "object" ? message.trace : undefined,
      streaming: false,
      error: sanitizeMessageError(message.error),
    }));

  const trimmed = trimConversationHistory(parsed, CHAT_MEMORY_WINDOW);
  return trimmed.length > 0 ? [...INITIAL_MESSAGES, ...trimmed] : INITIAL_MESSAGES;
}

/**
 * Reads the NDJSON agent stream and writes it into message state as it
 * arrives, so tool calls appear while they run and text paints progressively.
 *
 * Throws a chat request error on an `error` event so the existing retry
 * classification in getErrorState handles it unchanged.
 */
async function consumeChatStream(
  response: Response,
  assistantId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  replaceExisting: boolean,
  /** Called on every received chunk so the caller can reset its idle timer. */
  onActivity?: () => void
): Promise<StreamOutcome> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw createChatRequestError("The chat service returned no response body. Please retry.", {
      code: "empty_response",
      retryable: true,
      status: 502,
    });
  }

  const decoder = new TextDecoder();
  const parser = createChatEventParser();

  let content = "";
  let suggestions: string[] | undefined;
  let trace: ChatTrace | undefined;
  let toolCalls: ChatToolCall[] = [];
  let placed = false;
  let streamError: unknown;

  const patch = (updater: (message: Message) => Message) => {
    setMessages((prev) => {
      if (!placed) {
        placed = true;
        const seed: Message = { id: assistantId, role: "assistant", content: "", streaming: true };

        if (replaceExisting && prev.some((message) => message.id === assistantId)) {
          return prev.map((message) =>
            message.id === assistantId
              ? updater({ ...message, content: "", suggestions: undefined, error: undefined, streaming: true })
              : message
          );
        }

        return [...prev, updater(seed)];
      }

      return prev.map((message) => (message.id === assistantId ? updater(message) : message));
    });
  };

  const handleEvent = (event: ReturnType<typeof parser.push>[number]) => {
    switch (event.type) {
      case "tool_call": {
        toolCalls = [...toolCalls, event.call];
        patch((message) => ({ ...message, toolCalls }));
        break;
      }
      case "tool_result": {
        toolCalls = toolCalls.map((call) => (call.id === event.call.id ? event.call : call));
        patch((message) => ({ ...message, toolCalls }));

        // The agent asked to move the page; honour it via the existing helper
        // so Lenis and reduced-motion handling stay consistent.
        if (event.call.name === "navigate_to" && event.call.href && !event.call.refused) {
          const href = event.call.href;
          if (href.startsWith("#")) {
            window.setTimeout(() => scrollToHash(href), 400);
          }
        }
        break;
      }
      case "text_delta": {
        // Text supersedes any progress label.
        content += event.text;
        patch((message) => ({ ...message, content, status: undefined }));
        break;
      }
      case "text_replace": {
        // The server rewrote the answer after streaming it (link
        // normalisation), so swap the body rather than appending to it.
        content = event.text;
        patch((message) => ({ ...message, content, status: undefined }));
        break;
      }
      case "trace": {
        trace = event.trace;
        patch((message) => ({ ...message, trace }));
        break;
      }
      case "suggestions": {
        suggestions = event.suggestions.filter((suggestion): suggestion is string => typeof suggestion === "string");
        break;
      }
      case "status": {
        patch((message) => ({ ...message, status: event.label }));
        break;
      }
      case "error": {
        streamError = createChatRequestError(event.error, {
          code: event.code,
          retryable: event.retryable,
          status: 502,
        });
        break;
      }
      default:
        break;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // Progress is proof of life: the caller's idle timer restarts here.
    onActivity?.();
    parser.push(decoder.decode(value, { stream: true })).forEach(handleEvent);
  }
  parser.flush().forEach(handleEvent);

  if (streamError) throw streamError;

  return { content, suggestions, toolCalls, trace };
}

const AITwinChat = () => {
  const [isOpen, setIsOpen] = useState(false);
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
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasHydratedHistory, setHasHydratedHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingUserMessageIdRef = useRef<string | null>(null);
  const isSendingRef = useRef(false);
  /** The in-flight request, so clearing the chat can abort it. */
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const handleSendRef = useRef<(request?: SendRequest) => Promise<void>>(async () => {});
  const shouldReduceMotion = useReducedMotion();
  const { status: chatAvailabilityStatus } = useChatAvailability();

  const getConversationHistory = useCallback(
    (sourceMessages: Message[], beforeMessageId?: string) => {
      const endIndex = beforeMessageId ? sourceMessages.findIndex((message) => message.id === beforeMessageId) : -1;
      const scopedMessages = endIndex >= 0 ? sourceMessages.slice(0, endIndex) : sourceMessages;

      return trimConversationHistory(
        scopedMessages.filter((message) => !message.error),
        CHAT_MEMORY_WINDOW
      )
        .map((message) => ({
          content: message.content,
          sender: message.role === "user" ? "user" : "ai",
        }));
    },
    []
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsedEnvelope = parseStoredChatEnvelope<Message>(JSON.parse(stored));

        if (parsedEnvelope) {
          setMessages(sanitizeStoredMessages(parsedEnvelope.messages));
        } else {
          window.localStorage.removeItem(CHAT_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn("Failed to restore AI Twin chat history:", error);
    } finally {
      setHasHydratedHistory(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedHistory) return;

    try {
      const memoryMessages = [
        ...INITIAL_MESSAGES,
        ...trimConversationHistory(messages, CHAT_MEMORY_WINDOW),
      ];

      window.localStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify(createStoredChatEnvelope(memoryMessages)),
      );
    } catch (error) {
      console.warn("Failed to persist AI Twin chat history:", error);
    }
  }, [hasHydratedHistory, messages]);

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

  // Shared with every inline answer surface via `buildAnswerComponents`, so
  // the panel and an in-page answer render markdown identically rather than
  // maintaining two copies that quietly drift.
  const markdownComponents = useMemo<Components>(
    () => buildAnswerComponents(navigateToSection),
    [navigateToSection]
  );

  // Auto-scroll to bottom or anchor to user message top
  useEffect(() => {
    if (!scrollRef.current) return;
    
    // If we have a pending user message, anchor to it when response arrives
    if (pendingUserMessageIdRef.current && !isLoading) {
      const userMsgEl = scrollRef.current.querySelector(`[data-message-id="${pendingUserMessageIdRef.current}"]`) as HTMLElement;
        if (userMsgEl) {
          scrollRef.current.scrollTo({
            top: userMsgEl.offsetTop - 16,
            behavior: shouldReduceMotion ? "auto" : "smooth"
          });
          pendingUserMessageIdRef.current = null;
          return;
      }
    }

    // Default: scroll to bottom
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [isLoading, messages, shouldReduceMotion]);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        const focusTarget = restoreFocusRef.current ?? launcherButtonRef.current;
        if (focusTarget && document.contains(focusTarget)) {
          focusTarget.focus();
        }
      }

      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      restoreFocusRef.current = activeElement;
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, isMobile && !shouldReduceMotion ? 220 : 40);

    return () => window.clearTimeout(focusTimer);
  }, [isMobile, isOpen, shouldReduceMotion]);

  useEffect(() => {
    if (!isOpen || !isMobile) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevDocOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevDocOverflow;
    };
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const dialogNode = dialogRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

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
  }, [isOpen]);

  const handleSend = useCallback(async (request?: SendRequest) => {
    const normalizedRequest = typeof request === "string" ? { text: request } : request;
    const msg = normalizedRequest?.text || input.trim();
    if (!msg || isSendingRef.current) return;

    if (chatAvailabilityStatus === "unavailable") {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (
          lastMessage?.role === "assistant" &&
          lastMessage.content === OFFLINE_ASSISTANT_MESSAGE
        ) {
          return prev;
        }

        return [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            content: OFFLINE_ASSISTANT_MESSAGE,
          },
        ];
      });
      return;
    }

    isSendingRef.current = true;
    const retryMessageId = normalizedRequest?.retryMessageId;
    const retryUserMessageId = normalizedRequest?.retryUserMessageId;
    const isRetry = Boolean(retryMessageId && retryUserMessageId);
    const userMsgId = retryUserMessageId || createMessageId();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    /*
     * Two timers, not one.
     *
     * `timeoutId` is an absolute backstop. `idleTimeoutId` is the one that
     * actually governs: it restarts on every received chunk, so a long answer
     * that keeps streaming is never mistaken for a stalled request — which is
     * precisely what the old single fixed timer got wrong.
     */
    const timeoutId = window.setTimeout(() => controller.abort(), CHAT_CLIENT_TIMEOUT_MS);
    let idleTimeoutId = window.setTimeout(() => controller.abort(), CHAT_STREAM_IDLE_TIMEOUT_MS);
    const resetIdleTimer = () => {
      window.clearTimeout(idleTimeoutId);
      idleTimeoutId = window.setTimeout(() => controller.abort(), CHAT_STREAM_IDLE_TIMEOUT_MS);
    };
    setInput("");

    if (isRetry && retryMessageId) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === retryMessageId
            ? {
                ...message,
                suggestions: undefined,
                error: message.error
                  ? {
                      ...message.error,
                      isRetrying: true,
                    }
                  : undefined,
              }
            : message
        )
      );
    } else {
      setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: msg }]);
    }

    pendingUserMessageIdRef.current = userMsgId;
    setIsLoading(true);

    // Declared out here so the catch block can clear `streaming` on the exact
    // message that was mid-stream, rather than appending a second bubble and
    // leaving the first one blinking.
    const assistantId = isRetry && retryMessageId ? retryMessageId : createMessageId();

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          conversationHistory: getConversationHistory(messages, isRetry ? retryUserMessageId : undefined)
        }),
        redirect: "error",
        signal: controller.signal,
      });

      if (!response.ok) throw await buildResponseError(response);

      const outcome = await consumeChatStream(
        response,
        assistantId,
        setMessages,
        isRetry && Boolean(retryMessageId),
        resetIdleTimer
      );

      const suggestions = outcome.suggestions;

      if (outcome.content.trim().length === 0) {
        throw createChatRequestError("The chat service returned an empty response. Please retry.", {
          code: "empty_response",
          retryable: true,
          status: 502,
        });
      }

      const assistantContent = outcome.content;

      setMessages((prev) => {
        let replaced = false;
        const next = prev.map((message) => {
          if (message.id !== assistantId) return message;

          replaced = true;
          return {
            ...message,
            content: assistantContent,
            suggestions,
            toolCalls: outcome.toolCalls.length > 0 ? outcome.toolCalls : undefined,
            trace: outcome.trace,
            streaming: false,
            error: undefined,
          };
        });

        return replaced
          ? next
          : [
              ...next,
              {
                id: assistantId,
                role: "assistant" as const,
                content: assistantContent,
                suggestions,
                toolCalls: outcome.toolCalls.length > 0 ? outcome.toolCalls : undefined,
                trace: outcome.trace,
              },
            ];
      });
    } catch (error) {
      console.error("AI Chat Error:", error);
      const nextErrorState = getErrorState(error, msg, userMsgId);

      // Both paths must clear `streaming`, and both must patch the message that
      // was already streaming rather than appending beside it. Previously the
      // retry path omitted `streaming: false` and the non-retry path appended a
      // brand-new message — so a failure after the first text_delta left the
      // partial reply blinking its cursor forever, with an unrelated error
      // bubble underneath it.
      const targetId = assistantId;

      setMessages((prev) => {
        let replaced = false;
        const next = prev.map((message) => {
          if (message.id !== targetId) return message;

          replaced = true;
          return {
            ...message,
            content: nextErrorState.content,
            suggestions: undefined,
            streaming: false,
            error: {
              ...nextErrorState.error,
              isRetrying: false,
            },
          };
        });

        return replaced
          ? next
          : [
              ...next,
              {
                id: createMessageId(),
                role: "assistant",
                content: nextErrorState.content,
                streaming: false,
                error: nextErrorState.error,
              },
            ];
      });
    } finally {
      window.clearTimeout(timeoutId);
      // Must be cleared too, or it aborts the NEXT request after this one
      // completes, since the controller stays referenced by the closure.
      window.clearTimeout(idleTimeoutId);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      isSendingRef.current = false;
      setIsLoading(false);
    }
  }, [chatAvailabilityStatus, getConversationHistory, input, messages]);

  handleSendRef.current = handleSend;

  useEffect(() => {
    const handleOpenTwin = (e: Event) => {
      const customEvent = e as CustomEvent<{ question: string; answer?: string }>;
      const { question, answer } = customEvent.detail ?? { question: "" };
      setIsOpen(true);

      if (!question) return;

      /*
       * A "Continue in AI Twin" handoff from an inline answer already has the
       * answer — resending the question would burn a request and a wait the
       * visitor already sat through. Appending both turns directly reaches the
       * same place `handleSend` would have (this component hydrates from
       * localStorage on mount and re-persists on every `messages` change, so
       * writing the envelope directly from the dispatching component would
       * just be overwritten the next time this effect ran).
       */
      if (answer) {
        setMessages((prev) => [
          ...prev,
          { id: createMessageId(), role: "user", content: question },
          { id: createMessageId(), role: "assistant", content: answer },
        ]);
        return;
      }

      window.setTimeout(() => {
        void handleSendRef.current(question);
      }, 100);
    };

    window.addEventListener("open-ai-twin", handleOpenTwin);
    return () => window.removeEventListener("open-ai-twin", handleOpenTwin);
  }, []);

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    Promise.resolve().then(() => handleSend(text));
  };

  const handleRetry = (message: Message) => {
    if (!message.error?.retryable || !message.error.retryText || !message.error.userMessageId) return;

    void handleSend({
      text: message.error.retryText,
      retryMessageId: message.id,
      retryUserMessageId: message.error.userMessageId,
    });
  };

  const clearChat = () => {
    // Abort any in-flight stream first. Without this the request kept running
    // against a message id that no longer existed, and the success handler then
    // appended a finished answer with no user question above it.
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isSendingRef.current = false;
    setIsLoading(false);

    setMessages(INITIAL_MESSAGES);
    pendingUserMessageIdRef.current = null;

    try {
      window.localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear AI Twin chat history:", error);
    }
  };

  const chatStatusLabel =
    chatAvailabilityStatus === "available"
      ? "Assistant Online"
      : chatAvailabilityStatus === "checking"
        ? "Checking service"
        : chatAvailabilityStatus === "unknown"
          ? "Status unknown"
        : "Assistant Offline";
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
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p id="ai-twin-title" className="text-sm font-semibold">Nikunj&apos;s AI Twin</p>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full motion-reduce:animate-none ${chatStatusDotClass}`} />
              <p id="ai-twin-status" className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{chatStatusLabel}</p>
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
            aria-label="Close AI chat"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        data-lenis-prevent
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
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
                {msg.role === "assistant" ? <Bot className="w-4 h-4 text-primary" /> : <User className="w-4 h-4" />}
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
                    {/* Tool calls appear as they execute — this is the part
                        that reads as an agent rather than a text box. */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <ul className="mb-3 flex flex-col gap-1.5 border-l-2 border-primary/25 pl-3">
                        {msg.toolCalls.map((call) => (
                          <li key={call.id} className="flex items-baseline gap-2 font-mono text-[11px] leading-relaxed">
                            <Wrench
                              className={cn(
                                "mt-0.5 h-3 w-3 shrink-0",
                                call.status === "running" ? "animate-spin motion-reduce:animate-none text-primary" : "text-primary/70"
                              )}
                            />
                            <span className="min-w-0 break-all text-foreground/75">{call.label}</span>
                            {call.status === "done" && (
                              <span className={cn("shrink-0", call.refused ? "text-amber-500/90" : "text-muted-foreground/70")}>
                                {call.refused ? "· none" : `· ${call.summary}`}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {msg.content}
                    </ReactMarkdown>

                    {msg.streaming && msg.content.length > 0 && (
                      <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-primary/70 align-middle motion-reduce:animate-none" />
                    )}

                    {/* Progress label from the server while a tool round runs and
                        no answer text has arrived yet. The server has always sent
                        these; the client used to drop them on the floor. */}
                    {msg.streaming && msg.status && msg.content.length === 0 && (
                      <p className="font-mono text-[11px] text-muted-foreground/70">
                        {msg.status}
                        <span className="ml-1 animate-pulse motion-reduce:animate-none">…</span>
                      </p>
                    )}

                    {/* Collapsed by default: a recruiter never has to open it,
                        an engineer can. */}
                    {msg.trace && !msg.error && (
                      <details className="group mt-3 border-t border-border/30 pt-2">
                        <summary className="cursor-pointer list-none font-mono text-[11px] text-muted-foreground/70 transition-colors hover:text-primary">
                          <span className="group-open:hidden">
                            trace · {msg.trace.toolCount} tool{msg.trace.toolCount === 1 ? "" : "s"} ·{" "}
                            {(msg.trace.elapsedMs / 1000).toFixed(1)}s
                          </span>
                          <span className="hidden group-open:inline">hide trace</span>
                        </summary>
                        <dl className="mt-2 flex flex-col gap-1 font-mono text-[10.5px] text-muted-foreground/70">
                          <div className="flex gap-2">
                            <dt className="w-16 shrink-0">rounds</dt>
                            <dd>{msg.trace.rounds}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-16 shrink-0">latency</dt>
                            <dd>{(msg.trace.elapsedMs / 1000).toFixed(2)}s</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-16 shrink-0">model</dt>
                            <dd className="break-all">{msg.trace.model}</dd>
                          </div>
                          {msg.trace.sources.length > 0 && (
                            <div className="flex gap-2">
                              <dt className="w-16 shrink-0">grounded</dt>
                              <dd className="break-words">{msg.trace.sources.join(", ")}</dd>
                            </div>
                          )}
                          {msg.trace.refusals.length > 0 && (
                            <div className="flex gap-2 text-amber-500/90">
                              <dt className="w-16 shrink-0">declined</dt>
                              <dd className="break-words">{msg.trace.refusals.join("; ")}</dd>
                            </div>
                          )}
                        </dl>
                      </details>
                    )}
                  </>
                ) : (
                  msg.content
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
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted/50 dark:bg-muted/20 border border-border/20 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5 items-center shadow-accent-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce motion-reduce:animate-none [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce motion-reduce:animate-none [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce motion-reduce:animate-none" />
            </div>
          </div>
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
            placeholder={canSendMessages ? "Type a message..." : "AI chat is currently unavailable."}
            aria-label="Message Nikunj's AI twin"
            autoComplete="off"
            disabled={!canSendMessages || isLoading}
            className="flex-1 bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-60"
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
      {/* Floating Button */}
      <motion.button
        ref={launcherButtonRef}
        type="button"
        initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={shouldReduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 260, damping: 20 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-accent-card hover:shadow-[0_16px_36px_hsl(var(--accent)/0.22)] flex items-center justify-center transition-all duration-300 ease-in-out border-2 border-primary/20 group cursor-pointer",
          isMobile ? "bottom-4 right-4" : "bottom-6 right-6"
        )}
        whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
        aria-label="Toggle AI chat"
        aria-expanded={isOpen}
        aria-controls="ai-twin-dialog"
        title={chatStatusLabel}
      >
        <motion.div
          className="relative"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={shouldReduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 260, damping: 20 }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={isOpen ? "close" : "chat"}
              initial={shouldReduceMotion ? { opacity: 0 } : { rotate: -90, opacity: 0, scale: 0.4 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { rotate: 90, opacity: 0, scale: 0.4 }}
              transition={shouldReduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 340, damping: 24 }}
              className="flex items-center justify-center"
            >
              {isOpen ? (
                <X size={24} />
              ) : (
                <motion.span whileHover={shouldReduceMotion ? undefined : { y: -2 }}>
                  <MessageCircle size={24} />
                </motion.span>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.button>

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
                id="ai-twin-dialog"
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
                aria-labelledby="ai-twin-title"
                aria-describedby="ai-twin-status"
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
              id="ai-twin-dialog"
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
              aria-labelledby="ai-twin-title"
              aria-describedby="ai-twin-status"
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

export default AITwinChat;
