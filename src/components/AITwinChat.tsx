"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatSuggestions } from "@/data/portfolio";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

const WELCOME = "Hey! I'm Nikunj's AI twin. Ask me anything about his projects, tech stack, or experience — I'll answer as he would. 🤖";

const AITwinChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingUserMessageIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

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
    const handleOpenTwin = (e: Event) => {
      const customEvent = e as CustomEvent<{ question: string }>;
      setIsOpen(true);
      if (customEvent.detail?.question) {
        setTimeout(() => {
          handleSend(customEvent.detail.question);
        }, 100);
      }
    };
    window.addEventListener("open-ai-twin", handleOpenTwin);
    return () => window.removeEventListener("open-ai-twin", handleOpenTwin);
  }, []);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    
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
          conversationHistory: messages.map(m => ({
            content: m.content,
            sender: m.role === "user" ? "user" : "ai"
          })).slice(-10)
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
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  const handleSuggestionDoubleClick = (text: string) => {
    setInput(text);
    Promise.resolve().then(() => handleSend(text));
  };

  const clearChat = () => {
    setMessages([{ id: "welcome", role: "assistant", content: WELCOME }]);
    pendingUserMessageIdRef.current = null;
  };

  // Shared render function for ChatContent (prevents unmount/remount on every keystroke)
  const renderChatContent = () => (
    <div className="flex flex-col h-full w-full overflow-hidden">
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
            <p className="text-sm font-semibold">Nikunj's AI Twin</p>
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
      <div ref={scrollRef} className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden space-y-6 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20",
        isMobile ? "px-3 py-4" : "px-4 py-6"
      )}>
        {messages.map((msg, i) => (
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
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted/50 dark:bg-muted/20 border border-border/20 rounded-tl-none prose prose-invert prose-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                    className="group relative select-none overflow-hidden rounded-full bg-primary/10 px-3 py-1 text-[11px] text-foreground transition-colors hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label={`Ask: ${s}`}
                    title="Double-click to send"
                  >
                    <span className="relative z-10 flex items-center gap-1">
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
                      {s}
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
                className="select-none rounded-full bg-primary/10 px-3 py-1 text-xs text-foreground transition-colors hover:bg-primary/20"
                title="Double-click to send"
              >
                {s}
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
