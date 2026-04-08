"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Trash2 } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatSuggestions } from "@/data/portfolio";
import { CHAT_CLIENT_TIMEOUT_MS } from "@/lib/chat-contract";
import {
  createStoredChatEnvelope,
  parseStoredChatEnvelope,
} from "@/lib/chat-storage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatAvailability } from "@/hooks/useChatAvailability";
import { scrollToHash } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import { CHAT_MEMORY_WINDOW, CHAT_STORAGE_KEY, WELCOME_MESSAGE, trimConversationHistory } from "@/lib/ai-twin";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
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

type ChatApiSuccess = {
  response?: string;
  suggestions?: string[];
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
const OFFLINE_ASSISTANT_MESSAGE = "Nikunj's AI twin is offline right now. You can still browse the projects, use the contact section, or download the resume while the service is unavailable.";

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
      error: sanitizeMessageError(message.error),
    }));

  const trimmed = trimConversationHistory(parsed, CHAT_MEMORY_WINDOW);
  return trimmed.length > 0 ? [...INITIAL_MESSAGES, ...trimmed] : INITIAL_MESSAGES;
}

const AITwinChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasHydratedHistory, setHasHydratedHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingUserMessageIdRef = useRef<string | null>(null);
  const isSendingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const handleSendRef = useRef<(request?: SendRequest) => Promise<void>>(async () => {});
  const isMobile = useIsMobile();
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

  const markdownComponents = useMemo<Components>(
    () => ({
      a: ({ href = "", children, ...props }) => {
        const isHashLink = href.startsWith("#");
        const isInternalPath = href.startsWith("/");
        const isResumeLink = /resume|\.pdf$/i.test(href);
        const isExternalLink = !isHashLink && !isInternalPath && !href.startsWith("mailto:");

        return (
          <a
            {...props}
            href={href}
            download={isResumeLink && isInternalPath ? true : undefined}
            target={isExternalLink ? "_blank" : undefined}
            rel={isExternalLink ? "noopener noreferrer" : undefined}
            onClick={(event) => {
              props.onClick?.(event);
              if (event.defaultPrevented || !isHashLink) return;
              event.preventDefault();
              navigateToSection(href);
            }}
            className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary/80 break-words"
          >
            {children}
          </a>
        );
      },
      p: ({ children }) => <p className="mb-3 last:mb-0 whitespace-pre-wrap">{children}</p>,
      ul: ({ children }) => <ul className="mb-3 list-disc space-y-2 pl-5 marker:text-primary last:mb-0">{children}</ul>,
      ol: ({ children }) => <ol className="mb-3 list-decimal space-y-2 pl-5 marker:text-primary last:mb-0">{children}</ol>,
      li: ({ children }) => <li className="pl-1">{children}</li>,
      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
      em: ({ children }) => <em className="text-foreground/90">{children}</em>,
      h1: ({ children }) => <h1 className="mb-3 text-base font-semibold tracking-tight text-foreground">{children}</h1>,
      h2: ({ children }) => <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-foreground">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-2 text-sm font-semibold tracking-tight text-foreground">{children}</h3>,
      blockquote: ({ children }) => (
        <blockquote className="my-4 border-l-2 border-primary/40 pl-3 text-foreground/80">{children}</blockquote>
      ),
      hr: () => <hr className="my-4 border-border/40" />,
      pre: ({ children }) => (
        <pre className="my-4 overflow-x-auto rounded-xl border border-border/40 bg-background/70 p-3 text-xs leading-6">
          {children}
        </pre>
      ),
      code: ({ className, children, ...props }) => {
        const isBlock = Boolean(className);

        return (
          <code
            {...props}
            className={cn(
              "font-mono",
              isBlock
                ? "text-[12px] text-foreground"
                : "rounded-md bg-background/70 px-1.5 py-0.5 text-[0.82em] text-primary",
              className
            )}
          >
            {children}
          </code>
        );
      },
      table: ({ children }) => (
        <div className="my-4 overflow-x-auto rounded-xl border border-border/40 bg-background/40">
          <table className="min-w-[34rem] w-full border-collapse text-left text-xs sm:text-sm">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-background/60">{children}</thead>,
      tbody: ({ children }) => <tbody className="divide-y divide-border/20">{children}</tbody>,
      tr: ({ children }) => <tr className="align-top">{children}</tr>,
      th: ({ children }) => (
        <th className="border-b border-border/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/80 sm:text-xs">
          {children}
        </th>
      ),
      td: ({ children }) => <td className="px-3 py-2 text-foreground/90">{children}</td>,
    }),
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
    const timeoutId = window.setTimeout(() => controller.abort(), CHAT_CLIENT_TIMEOUT_MS);
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

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          conversationHistory: getConversationHistory(messages, isRetry ? retryUserMessageId : undefined)
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw await buildResponseError(response);

      const data = (await response.json()) as ChatApiSuccess;
      const suggestions = Array.isArray(data.suggestions)
        ? data.suggestions.filter((suggestion): suggestion is string => typeof suggestion === "string")
        : undefined;

      if (typeof data.response !== "string" || data.response.trim().length === 0) {
        throw createChatRequestError("The chat service returned an empty response. Please retry.", {
          code: "empty_response",
          retryable: true,
          status: 502,
        });
      }

      const assistantContent = data.response;

      if (isRetry && retryMessageId) {
        setMessages((prev) => {
          let replaced = false;
          const next = prev.map((message) => {
            if (message.id !== retryMessageId) return message;

            replaced = true;
            return {
              ...message,
              content: assistantContent,
              suggestions,
              error: undefined,
            };
          });

          return replaced
            ? next
            : [
                ...next,
                {
                  id: createMessageId(),
                  role: "assistant",
                  content: assistantContent,
                  suggestions,
                },
              ];
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            content: assistantContent,
            suggestions,
          },
        ]);
      }
    } catch (error) {
      console.error("AI Chat Error:", error);
      const nextErrorState = getErrorState(error, msg, userMsgId);

      if (isRetry && retryMessageId) {
        setMessages((prev) => {
          let replaced = false;
          const next = prev.map((message) => {
            if (message.id !== retryMessageId) return message;

            replaced = true;
            return {
              ...message,
              content: nextErrorState.content,
              suggestions: undefined,
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
                  error: nextErrorState.error,
                },
              ];
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            content: nextErrorState.content,
            error: nextErrorState.error,
          },
        ]);
      }
    } finally {
      window.clearTimeout(timeoutId);
      isSendingRef.current = false;
      setIsLoading(false);
    }
  }, [chatAvailabilityStatus, getConversationHistory, input, messages]);

  handleSendRef.current = handleSend;

  useEffect(() => {
    const handleOpenTwin = (e: Event) => {
      const customEvent = e as CustomEvent<{ question: string }>;
      setIsOpen(true);
      if (customEvent.detail?.question) {
        window.setTimeout(() => {
          void handleSendRef.current(customEvent.detail.question);
        }, 100);
      }
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
        : "Assistant Offline";
  const chatStatusDotClass =
    chatAvailabilityStatus === "available"
      ? "bg-emerald-500 animate-pulse"
      : chatAvailabilityStatus === "checking"
        ? "bg-amber-400 animate-pulse"
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
        onWheelCapture={(e) => e.stopPropagation()}
        onTouchMoveCapture={(e) => e.stopPropagation()}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        className={cn(
          "flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-6 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20",
          isMobile ? "px-3 py-4" : "px-4 py-6"
        )}
      >
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-4">
            <motion.div
              data-message-id={msg.id}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "justify-start"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                msg.role === "assistant" ? "bg-primary/10" : "bg-muted"
              }`}>
                {msg.role === "assistant" ? <Bot className="w-4 h-4 text-primary" /> : <User className="w-4 h-4" />}
              </div>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "max-w-[85%] bg-primary text-primary-foreground rounded-tr-none"
                    : msg.error
                      ? "w-full max-w-[calc(100%-2.75rem)] sm:max-w-[88%] rounded-tl-none border border-amber-500/30 bg-amber-500/5 text-foreground"
                      : "w-full max-w-[calc(100%-2.75rem)] sm:max-w-[88%] bg-muted/50 dark:bg-muted/20 border border-border/20 rounded-tl-none text-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
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
                    disabled={!canSendMessages}
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
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted/50 dark:bg-muted/20 border border-border/20 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5 items-center shadow-sm">
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
          >
            {chatSuggestions.map((s) => (
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
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
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
          "fixed z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 ease-in-out border-2 border-primary/20 group cursor-pointer",
          isMobile ? "bottom-4 right-4" : "bottom-6 right-6"
        )}
        whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
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
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-50 bg-black/80"
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
              transition={{
                layout: {
                  type: "spring",
                  stiffness: 260,
                  damping: 34,
                  mass: 0.7,
                },
                ...(shouldReduceMotion
                  ? { duration: 0.2 }
                  : {
                      type: "spring" as const,
                      stiffness: 260,
                      damping: 34,
                      mass: 0.7,
                    })
              }}
              className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-background/55 dark:bg-background/55 backdrop-blur-[22px] backdrop-saturate-150 border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
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
