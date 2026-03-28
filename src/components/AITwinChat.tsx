"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Trash2 } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatSuggestions } from "@/data/portfolio";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { CHAT_MEMORY_WINDOW, CHAT_STORAGE_KEY, WELCOME_MESSAGE } from "@/lib/ai-twin";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

type LenisWindow = Window & typeof globalThis & {
  __lenis?: {
    scrollTo: (target: number | string | HTMLElement, options?: { offset?: number }) => void;
  };
};

const WELCOME = WELCOME_MESSAGE;
const INITIAL_MESSAGES: Message[] = [{ id: "welcome", role: "assistant", content: WELCOME }];

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
    }));

  const trimmed = parsed.filter((message) => message.id !== "welcome").slice(-CHAT_MEMORY_WINDOW);
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
  const handleSendRef = useRef<(text?: string) => Promise<void>>(async () => {});
  const isMobile = useIsMobile();

  const getConversationHistory = useCallback(
    (sourceMessages: Message[]) =>
      sourceMessages
        .filter((message) => message.id !== "welcome")
        .slice(-CHAT_MEMORY_WINDOW)
        .map((message) => ({
          content: message.content,
          sender: message.role === "user" ? "user" : "ai",
        })),
    []
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        setMessages(sanitizeStoredMessages(JSON.parse(stored)));
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
        ...messages.filter((message) => message.id !== "welcome").slice(-CHAT_MEMORY_WINDOW),
      ];

      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(memoryMessages));
    } catch (error) {
      console.warn("Failed to persist AI Twin chat history:", error);
    }
  }, [hasHydratedHistory, messages]);

  const navigateToSection = useCallback(
    (href: string) => {
      const performScroll = () => {
        const target = document.querySelector(href);
        if (!(target instanceof HTMLElement)) return;

        const lenis = (window as LenisWindow).__lenis;
        if (lenis) {
          lenis.scrollTo(target, { offset: -85 });
        } else {
          const top = target.getBoundingClientRect().top + window.scrollY - 85;
          window.scrollTo({ top, behavior: "smooth" });
        }

        window.history.pushState(null, "", href);
      };

      if (isMobile) {
        setIsOpen(false);
      }

      window.setTimeout(performScroll, isMobile ? 180 : 0);
    },
    [isMobile]
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
          behavior: "smooth"
        });
        pendingUserMessageIdRef.current = null;
        return;
      }
    }

    // Default: scroll to bottom
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

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

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isSendingRef.current) return;

    isSendingRef.current = true;
    const userMsgId = Date.now().toString();
    setInput("");
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: msg }]);
    pendingUserMessageIdRef.current = userMsgId;
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          conversationHistory: getConversationHistory(messages)
        }),
      });

      if (!response.ok) throw new Error("API call failed");

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          suggestions: data.suggestions
        },
      ]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I'm having trouble connecting to my brain right now. Please try again or reach out to Nikunj directly via email!"
        },
      ]);
    } finally {
      isSendingRef.current = false;
      setIsLoading(false);
    }
  }, [getConversationHistory, input, messages]);

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
  };

  const handleSuggestionDoubleClick = (text: string) => {
    setInput(text);
    Promise.resolve().then(() => handleSend(text));
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
    pendingUserMessageIdRef.current = null;
    window.localStorage.removeItem(CHAT_STORAGE_KEY);
  };

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
            <p className="text-sm font-semibold">Nikunj&apos;s AI Twin</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Assistant Online</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-2 transition-colors hover:bg-muted rounded-full"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 transition-colors hover:bg-muted rounded-full"
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
        className={cn(
          "flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-6 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20",
          isMobile ? "px-3 py-4" : "px-4 py-6"
        )}
      >
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-4">
            <motion.div
              data-message-id={msg.id}
              initial={{ opacity: 0, y: 10 }}
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

            {/* Suggestions beneath the AI message */}
            {msg.role === "assistant" && msg.suggestions && msg.suggestions.length > 0 && (
              <motion.div
                className="mt-3 flex flex-wrap gap-2 pl-11"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.3 }}
              >
                {msg.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    onDoubleClick={() => handleSuggestionDoubleClick(s)}
                    className="group relative max-w-full select-none overflow-hidden rounded-full bg-primary/10 px-3 py-1 text-[11px] text-foreground transition-colors hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" />
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {chatSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestionClick(s)}
                onDoubleClick={() => handleSuggestionDoubleClick(s)}
                className="max-w-full select-none overflow-hidden rounded-full bg-primary/10 px-3 py-1 text-xs text-foreground transition-colors hover:bg-primary/20"
              >
                <span className="block truncate whitespace-nowrap">{s}</span>
              </button>
            ))}
          </motion.div>
        )}

        {/* Input */}
        <div className="relative flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 ease-in-out border-2 border-primary/20 group cursor-pointer",
          isMobile ? "bottom-4 right-4" : "bottom-6 right-6"
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Toggle AI chat"
      >
        <motion.div
          className="relative"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={isOpen ? "close" : "chat"}
              initial={{ rotate: -90, opacity: 0, scale: 0.4 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.4 }}
              transition={{ type: "spring", stiffness: 340, damping: 24 }}
              className="flex items-center justify-center"
            >
              {isOpen ? (
                <X size={24} />
              ) : (
                <motion.span whileHover={{ y: -2 }}>
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
              />

              {/* Chat Content */}
              <motion.div
                key="chat-content"
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed inset-0 z-50 flex flex-col bg-background"
                style={{ height: '100dvh', maxHeight: '100dvh' }}
                onClick={(e) => e.stopPropagation()}
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
              layout
              layoutId="chat-window"
              initial={{ opacity: 0, scale: 0.8, y: 20, rotateX: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10, rotateX: 10 }}
              transition={{
                layout: {
                  type: "spring",
                  stiffness: 260,
                  damping: 34,
                  mass: 0.7,
                },
                type: "spring",
                stiffness: 260,
                damping: 34,
                mass: 0.7
              }}
              className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-background/55 dark:bg-background/55 backdrop-blur-[22px] backdrop-saturate-150 border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              style={{
                height: "32rem",
                maxHeight: "calc(100vh - 8rem)",
                perspective: "1000px",
                transformStyle: "preserve-3d",
                willChange: "width,height,transform,border-radius,box-shadow,backdrop-filter"
              }}
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
