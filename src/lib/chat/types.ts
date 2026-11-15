import type { ChatToolCall, ChatTrace } from "@/lib/chat-contract";

export interface Message {
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

export type SendRequest =
  | string
  | {
      text?: string;
      retryMessageId?: string;
      retryUserMessageId?: string;
    };

export type StreamOutcome = {
  content: string;
  suggestions?: string[];
  toolCalls: ChatToolCall[];
  trace?: ChatTrace;
};

export type ChatApiError = {
  error?: string;
  code?: string;
  retryable?: boolean;
};

export type ChatRequestError = Error & {
  code?: string;
  retryable?: boolean;
  status?: number;
};
