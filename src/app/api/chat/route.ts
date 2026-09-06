import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, SYSTEM_PROMPT, SUGGESTION_SYSTEM_PROMPT } from "@/lib/ai-config";
import {
  CHAT_FINAL_ANSWER_RESERVE_MS,
  CHAT_MAX_TOOL_ROUNDS,
  CHAT_PRIMARY_RESPONSE_TIMEOUT_MS,
  CHAT_STREAM_CONTENT_TYPE,
  CHAT_SUGGESTION_TIMEOUT_MS,
  CHAT_TOOL_ROUND_TIMEOUT_MS,
  CHAT_TOTAL_RESPONSE_BUDGET_MS,
  type ChatAvailabilityResponse,
  type ChatErrorCode,
  type ChatStreamEvent,
  type ChatToolCall,
  type ChatTrace,
} from "@/lib/chat-contract";
import { TOOL_DEFINITIONS, executeTool, formatToolCall } from "@/lib/ai-tools";
import { CHAT_MEMORY_WINDOW, appendContextualLinks, findMatchingProjects, normalizeText, trimConversationHistory } from "@/lib/ai-twin";
import { checkRateLimit, getClientKey, getRateLimitHeaders } from "@/lib/rate-limit";

interface Message {
  content: string;
  sender: "user" | "ai";
}

interface ProviderToolCall {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
}

interface ChatCompletionMessageParam {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ProviderToolCall[];
  tool_call_id?: string;
  name?: string;
}


const RATE_LIMIT = 39;
const WINDOW_MS = 60_000;
const TARGET_SUGGESTION_COUNT = 4;
const MAX_SUGGESTION_LENGTH = 44;
const MAX_MESSAGE_LENGTH = 1200;
const MAX_HISTORY_MESSAGE_LENGTH = 4000;

const requestStore = new Map<string, { count: number; resetAt: number }>();

const chatHistoryMessageSchema = z.object({
  content: z.string().trim().min(1).max(MAX_HISTORY_MESSAGE_LENGTH),
  sender: z.enum(["user", "ai"]),
});

const chatRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(MAX_MESSAGE_LENGTH),
  conversationHistory: z.array(chatHistoryMessageSchema).max(CHAT_MEMORY_WINDOW).optional().default([]),
});

const categoryKeywords: Record<string, RegExp> = {
  experience: /(experience|role|intern|work|company|job|position|impact|responsibilit)/i,
  skills: /(skill|stack|technology|tech|framework|language|tool)/i,
  projects: /(project|build|develop|app|application|platform|system|tool|repo|github)/i,
  achievements: /(achieve|award|won|improv|result|reduced|increase|coverage|accuracy|milestone)/i,
  contact: /(contact|reach|email|linkedin|connect|collaborate|hire|resume|cv)/i,
  career_goals: /(goal|future|plan|aspiration|next|aim|grow)/i,
};

const unsupportedSuggestionPatterns = [
  /linkedin posts?/i,
  /blog posts?/i,
  /\barticles?\b/i,
  /\bnewsletters?\b/i,
  /\bpodcasts?\b/i,
  /\bconference talks?\b/i,
  /\btalks?\b/i,
  /\blive demos?\b/i,
  /\bdemo links?\b/i,
  /\byoutube\b/i,
  /\btwitter\b/i,
  /\bx posts?\b/i,
];

function createChatErrorResponse(
  status: number,
  code: ChatErrorCode,
  error: string,
  headers?: HeadersInit,
  retryable = true
) {
  return NextResponse.json(
    {
      error,
      code,
      retryable,
    },
    {
      status,
      headers,
    }
  );
}

function detectCategories(...texts: string[]): Set<string> {
  const categories = new Set<string>();
  const corpus = texts.join("\n");

  for (const [category, regex] of Object.entries(categoryKeywords)) {
    if (regex.test(corpus)) {
      categories.add(category);
    }
  }

  return categories;
}

function categorizeSuggestion(question: string): string {
  for (const [category, regex] of Object.entries(categoryKeywords)) {
    if (regex.test(question)) {
      return category;
    }
  }

  return "other";
}

function normalizeSuggestion(question: string) {
  let next = question
    .trim()
    .replace(/^[-*]\s*/, "")
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/\s+/g, " ");

  next = next.replace(/[.!]+$/, "").trim();

  if (next.length > 0 && !/[?!]$/.test(next)) {
    next = `${next}?`;
  }

  return next;
}

function isSupportedSuggestion(question: string) {
  return !unsupportedSuggestionPatterns.some((pattern) => pattern.test(question));
}

function getProjectReference(title: string) {
  return title.split(/[\u2013\u2014-]/)[0]?.trim() || title;
}

function scoreSuggestion(
  question: string,
  currentFocusCategories: string[],
  currentKeywords: Set<string>,
  focusProjects: string[]
) {
  const normalizedQuestion = normalizeText(question);
  let score = 0;

  if (/^(how|why|what|which|could|can|would)/i.test(question)) score += 2;
  if (/^tell me about/i.test(question)) score -= 1;

  for (const projectName of focusProjects) {
    if (normalizedQuestion.includes(normalizeText(projectName))) {
      score += 3;
    }
  }

  const keywordOverlap = normalizedQuestion
    .split(" ")
    .filter((token) => token.length > 3 && currentKeywords.has(token)).length;

  score += Math.min(keywordOverlap, 3);

  const category = categorizeSuggestion(question);
  if (currentFocusCategories.includes(category)) {
    score += 2;
  }

  return score;
}

function buildFallbackSuggestions(
  currentMessage: string,
  aiResponse: string,
  recentMessages: Message[],
  priorUserTexts: string[]
) {
  const matchedProjects = findMatchingProjects(`${currentMessage}\n${aiResponse}`);
  const currentFocusCategories = Array.from(detectCategories(currentMessage, aiResponse));
  const usedCategories = Array.from(
    detectCategories(...recentMessages.map((message) => message.content), currentMessage, aiResponse)
  );
  const orderedCategories = Array.from(
    new Set([
      ...currentFocusCategories,
      ...Object.keys(categoryKeywords).filter((category) => !usedCategories.includes(category)),
      ...usedCategories,
      ...Object.keys(categoryKeywords),
    ])
  );

  const fallbackByCategory: Record<string, string[]> = {
    experience: [
      "What impact are you driving at ArmorCode?",
      "How did Xansr shape your backend style?",
    ],
    skills: [
      "Which tools do you use most day to day?",
      "Which skill do you lean on most?",
    ],
    projects: [
      "Which project should I open first?",
      "Which build best shows your style?",
    ],
    achievements: [
      "Which result are you proudest of?",
      "What achievement stands out most?",
    ],
    contact: [
      "Could you share your LinkedIn?",
      "What's the best way to reach you?",
    ],
    career_goals: [
      "What are you building next?",
      "Where do you want to grow next?",
    ],
  };

  const projectSpecificSuggestions = matchedProjects.flatMap((project) => {
    const reference = getProjectReference(project.title);

    return [
      `How did you build ${reference}?`,
      `What was hardest in ${reference}?`,
      `Could you share the ${reference} repo?`,
    ];
  });

  const suggestions = [...projectSpecificSuggestions, ...orderedCategories.flatMap((category) => fallbackByCategory[category] ?? [])]
    .map(normalizeSuggestion)
    .filter(isSupportedSuggestion)
    .filter((question) => question.length > 0 && question.length <= MAX_SUGGESTION_LENGTH)
    .filter((question) => !priorUserTexts.includes(normalizeText(question)))
    .filter((question, index, all) => all.findIndex((entry) => entry.toLowerCase() === question.toLowerCase()) === index)
    .slice(0, TARGET_SUGGESTION_COUNT);

  return suggestions.length > 0 ? suggestions : getDefaultSuggestions();
}

function getPriorUserTexts(recentMessages: Message[], currentMessage: string) {
  const priorUserTexts = recentMessages
    .filter((message) => message.sender === "user")
    .map((message) => normalizeText(message.content));

  priorUserTexts.push(normalizeText(currentMessage));

  return priorUserTexts;
}

function isAbortError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { name?: string; code?: number | string };
  return candidate.name === "AbortError" || candidate.code === 20 || candidate.code === "ABORT_ERR";
}

async function postChatCompletion(
  invokeUrl: string,
  headers: Record<string, string>,
  body: object,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(invokeUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function isChatConfigured() {
  return Boolean(process.env.LLM_API_KEY?.trim());
}

export async function GET() {
  const payload: ChatAvailabilityResponse = {
    available: isChatConfigured(),
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

/* ------------------------------------------------------------------ *
 * Agent loop
 * ------------------------------------------------------------------ */

function parseToolArgs(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function classifyUpstreamFailure(status: number): { code: ChatErrorCode; error: string; retryable: boolean } {
  if (status === 429) {
    return { code: "upstream_rate_limited", error: "The AI service is busy. Please try again shortly.", retryable: true };
  }
  if (status === 401 || status === 403) {
    return { code: "upstream_auth_error", error: "The AI service rejected the request. Please contact Nikunj directly.", retryable: false };
  }
  // A 4xx other than 429 means the request itself was wrong, so replaying it
  // verbatim fails identically. Only 5xx and unknown statuses are worth a retry.
  if (status >= 400 && status < 500) {
    return {
      code: "upstream_error",
      error: "The AI service could not process that request.",
      retryable: false,
    };
  }
  return { code: "upstream_error", error: "The AI service returned an error. Please try again.", retryable: true };
}

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  const rateLimitResult = checkRateLimit(requestStore, getClientKey(request), {
    limit: RATE_LIMIT,
    windowMs: WINDOW_MS,
  });
  const rateLimitHeaders = getRateLimitHeaders(RATE_LIMIT, rateLimitResult.remaining, rateLimitResult.resetAt);

  if (rateLimitResult.limited) {
    return createChatErrorResponse(
      429,
      "rate_limited",
      "Too many requests. Please wait a minute before trying again.",
      {
        ...rateLimitHeaders,
        "Retry-After": String(rateLimitResult.retryAfter),
      }
    );
  }

  let parsedBody;
  try {
    parsedBody = chatRequestSchema.safeParse(await request.json());
  } catch {
    return createChatErrorResponse(400, "invalid_request", "Invalid chat request.", rateLimitHeaders, false);
  }

  if (!parsedBody.success) {
    return createChatErrorResponse(
      400,
      "invalid_request",
      parsedBody.error.issues[0]?.message || "Invalid chat request.",
      rateLimitHeaders,
      false
    );
  }

  const { message, conversationHistory } = parsedBody.data;

  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) {
    console.warn("LLM API key not configured");
    return createChatErrorResponse(
      503,
      "service_unavailable",
      "The AI service is not configured right now. Please contact Nikunj directly if you need help.",
      rateLimitHeaders,
      false
    );
  }

  const invokeUrl = process.env.LLM_BASE_URL?.trim() || "https://integrate.api.nvidia.com/v1/chat/completions";
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const recentMessages = trimConversationHistory(conversationHistory, CHAT_MEMORY_WINDOW);

  const messages: ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM_PROMPT }];
  recentMessages.forEach((msg) => {
    messages.push({ role: msg.sender === "user" ? "user" : "assistant", content: msg.content });
  });
  messages.push({ role: "user", content: message });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      /**
       * True once the client has gone away or the stream has been closed.
       *
       * `enqueue` throws on a detached stream. Without this guard a client
       * disconnect threw inside `send`, and the catch handler's own `send`
       * calls threw again with nothing above them to catch it — an unhandled
       * rejection on every abandoned request. Writes are now no-ops after the
       * stream is gone, and closing is idempotent.
       */
      let closed = false;

      const send = (event: ChatStreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The consumer detached mid-response; stop trying to write.
          closed = true;
        }
      };

      const finish = () => {
        if (closed) return;
        closed = true;
        try {
          finish();
        } catch {
          // Already closed by the runtime after a disconnect.
        }
      };

      // A client that navigates away or hits stop should end the work, not
      // leave the loop running against the provider.
      request.signal.addEventListener("abort", () => {
        closed = true;
      });

      const sources: string[] = [];
      const refusals: string[] = [];
      let toolCount = 0;
      let rounds = 0;
      let answer = "";

      const emitTrace = () => {
        const trace: ChatTrace = {
          rounds,
          toolCount,
          elapsedMs: Date.now() - requestStartedAt,
          sources: Array.from(new Set(sources)).slice(0, 6),
          refusals,
          model: AI_MODEL,
        };
        send({ type: "trace", trace });
      };

      try {
        // Tool rounds. The model may skip tools entirely, in which case this
        // loop exits on the first pass and we stream whatever it said.
        for (let round = 0; round <= CHAT_MAX_TOOL_ROUNDS; round += 1) {
          const elapsed = Date.now() - requestStartedAt;
          const isFinalRound = round === CHAT_MAX_TOOL_ROUNDS;
          const budgetLeft = CHAT_TOTAL_RESPONSE_BUDGET_MS - elapsed - CHAT_FINAL_ANSWER_RESERVE_MS;

          // Out of time for another tool round: force a text answer.
          const mustAnswer = isFinalRound || budgetLeft <= 0;

          rounds = round + 1;

          if (round > 0) {
            send({ type: "status", label: mustAnswer ? "Writing answer" : "Thinking" });
          }

          let response: Response;
          try {
            response = await postChatCompletion(
              invokeUrl,
              headers,
              {
                model: AI_MODEL,
                messages,
                top_p: 0.95,
                temperature: 0.6,
                ...(mustAnswer ? {} : { tools: TOOL_DEFINITIONS, tool_choice: "auto" }),
              },
              // The final answer used to get the full primary timeout with no
              // deduction for time already spent in tool rounds, so a request
              // that burned 15s across two rounds could still take another 16s
              // — ~31s against a declared 18.5s budget and a 24s client
              // timeout. Both paths now clamp to whatever budget remains.
              Math.min(
                mustAnswer ? CHAT_PRIMARY_RESPONSE_TIMEOUT_MS : CHAT_TOOL_ROUND_TIMEOUT_MS,
                Math.max(2_000, budgetLeft)
              )
            );
          } catch (error) {
            if (isAbortError(error)) {
              send({
                type: "error",
                error: "The AI service took too long to respond. Please try again.",
                code: "upstream_timeout",
                retryable: true,
              });
            } else {
              console.error("LLM request failed");
              send({
                type: "error",
                error: "Could not reach the AI service. Please try again.",
                code: "upstream_unreachable",
                retryable: true,
              });
            }
            emitTrace();
            send({ type: "done" });
            finish();
            return;
          }

          if (!response.ok) {
            console.error("LLM API error", response.status);
            const failure = classifyUpstreamFailure(response.status);
            send({ type: "error", ...failure });
            emitTrace();
            send({ type: "done" });
            finish();
            return;
          }

          const data = await response.json();
          const choice = data.choices?.[0];
          const providerCalls: ProviderToolCall[] = choice?.message?.tool_calls ?? [];
          const content: string = choice?.message?.content || "";

          // No tools requested (or none allowed): this is the answer.
          if (providerCalls.length === 0) {
            answer = content;
            break;
          }

          // Record the assistant turn that requested the tools, so the
          // follow-up call has a coherent history.
          messages.push({ role: "assistant", content, tool_calls: providerCalls });

          for (const providerCall of providerCalls) {
            const name = providerCall.function?.name ?? "unknown";
            const args = parseToolArgs(providerCall.function?.arguments);
            const callId = providerCall.id ?? `${name}-${toolCount}`;
            const label = formatToolCall(name, args);

            const running: ChatToolCall = { id: callId, name, label, status: "running" };
            send({ type: "tool_call", call: running });

            const result = executeTool({ id: callId, name, args });
            toolCount += 1;
            result.sources.forEach((source) => sources.push(source));
            if (result.refused) refusals.push(`${name}: ${result.summary}`);

            const href =
              name === "navigate_to" &&
              result.output &&
              typeof result.output === "object" &&
              "href" in result.output
                ? String((result.output as { href: unknown }).href)
                : undefined;

            send({
              type: "tool_result",
              call: {
                ...running,
                status: "done",
                summary: result.summary,
                durationMs: result.durationMs,
                refused: result.refused,
                href,
              },
            });

            messages.push({
              role: "tool",
              tool_call_id: callId,
              name,
              content: JSON.stringify(result.output),
            });
          }
        }

        if (!answer) {
          answer = "I could not put together an answer for that. Try rephrasing, or reach out to Nikunj directly.";
        }

        // appendContextualLinks still runs, but tools already resolved most
        // navigation, so it now only fills gaps.
        const finalText = appendContextualLinks(message, answer);

        // Streamed in chunks so markdown paints progressively. The provider
        // response is already complete here; this is presentation pacing.
        const CHUNK = 24;
        for (let index = 0; index < finalText.length; index += CHUNK) {
          send({ type: "text_delta", text: finalText.slice(index, index + CHUNK) });
        }

        emitTrace();

        // Suggestions last: off the critical path entirely now.
        const elapsedMs = Date.now() - requestStartedAt;
        const remainingBudgetMs = CHAT_TOTAL_RESPONSE_BUDGET_MS - elapsedMs;
        const priorUserTexts = getPriorUserTexts(recentMessages, message);

        const followUpSuggestions =
          remainingBudgetMs >= 1_200
            ? await generateAISuggestions(
                message,
                answer,
                recentMessages,
                invokeUrl,
                headers,
                Math.min(CHAT_SUGGESTION_TIMEOUT_MS, remainingBudgetMs - 250),
                priorUserTexts
              )
            : buildFallbackSuggestions(message, answer, recentMessages, priorUserTexts);

        if (followUpSuggestions.length > 0) {
          send({ type: "suggestions", suggestions: followUpSuggestions });
        }

        send({ type: "done" });
        finish();
      } catch {
        console.error("AI response handling failed");
        send({
          type: "error",
          error: "Something went wrong while processing that message. Please retry.",
          code: "internal_error",
          retryable: true,
        });
        send({ type: "done" });
        finish();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...rateLimitHeaders,
      "Content-Type": CHAT_STREAM_CONTENT_TYPE,
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}


async function generateAISuggestions(
  currentMessage: string,
  aiResponse: string,
  recentMessages: Message[],
  invokeUrl: string,
  headers: Record<string, string>,
  timeoutMs: number,
  priorUserTexts: string[],
): Promise<string[]> {
  try {
    const usedCategories = Array.from(detectCategories(...recentMessages.map((m) => m.content), currentMessage));
    const currentFocusCategories = Array.from(detectCategories(currentMessage, aiResponse));
    const desiredCategories = Object.keys(categoryKeywords).filter(
      (c) => !usedCategories.includes(c)
    );
    const matchedProjects = findMatchingProjects(`${currentMessage}\n${aiResponse}`);
    const focusProjectNames = matchedProjects.map((project) => getProjectReference(project.title));
    const currentKeywords = new Set(
      normalizeText(`${currentMessage} ${aiResponse}`)
        .split(" ")
        .filter((token) => token.length > 3)
    );

    const suggestionMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: SUGGESTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Conversation so far (truncated to recent):\n${recentMessages
          .map((m) => `${m.sender === "user" ? "User" : "AI"}: ${m.content}`)
          .join("\n")}`,
      },
      { role: "assistant", content: aiResponse.slice(0, 4000) },
      {
        role: "user",
        content: `Generate ONLY a JSON array of ${TARGET_SUGGESTION_COUNT} conversational follow-up questions a real visitor would naturally ask next.

Latest user message: ${currentMessage}
Current focus categories: ${currentFocusCategories.join(", ") || "none"}
Projects currently in focus: ${focusProjectNames.join(", ") || "none"}
Recently covered categories: ${usedCategories.join(", ") || "none"}
Prefer branching into: ${desiredCategories.join(", ") || "reuse any with a fresh angle"}

Rules:
- Make the first 2 suggestions feel directly connected to the latest exchange.
- Avoid stiff, repetitive phrasing like repeating "Tell me about...".
- Prefer natural phrasings such as "How did...", "What was tricky about...", "Could you share...", or "Why did you...".
- If a project is in focus, include at least 1 suggestion about implementation details, architecture, or the repo.
- You may include 1 action-oriented prompt about contact, LinkedIn, GitHub, or resume if it fits.
- Keep every suggestion under ${MAX_SUGGESTION_LENGTH} characters.
- No more than 2 suggestions from the same category.`,
      },
    ];

    const suggestionResp = await postChatCompletion(
      invokeUrl,
      headers,
      {
        model: AI_MODEL,
        messages: suggestionMessages,
        temperature: 0.7,
        top_p: 0.9,
      },
      timeoutMs
    );

    if (!suggestionResp.ok) {
      return buildFallbackSuggestions(currentMessage, aiResponse, recentMessages, priorUserTexts);
    }

    const data = await suggestionResp.json();
    let raw = data.choices?.[0]?.message?.content?.trim() || "[]";
    
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    
    let parsed: unknown = [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = [];
        }
      }
    }

    if (!Array.isArray(parsed)) {
      return buildFallbackSuggestions(currentMessage, aiResponse, recentMessages, priorUserTexts);
    }

    const cleaned = parsed
      .filter((value: unknown): value is string => typeof value === "string")
      .map((question: string) => normalizeSuggestion(question))
      .filter(isSupportedSuggestion)
      .filter((question: string) => question.length > 0 && question.length <= MAX_SUGGESTION_LENGTH)
      .filter((s: string) => !priorUserTexts.includes(normalizeText(s)))
      .filter((s: string, i: number, arr: string[]) => arr.findIndex(t => t.toLowerCase() === s.toLowerCase()) === i)
      .sort((left, right) => scoreSuggestion(right, currentFocusCategories, currentKeywords, focusProjectNames)
        - scoreSuggestion(left, currentFocusCategories, currentKeywords, focusProjectNames));

    const catCount: Record<string, number> = {};
    const diversified: string[] = [];
    const getMaxPerCategory = (category: string) => (currentFocusCategories.includes(category) ? 2 : 1);

    for (const question of cleaned) {
      const cat = categorizeSuggestion(question);
      catCount[cat] = catCount[cat] || 0;
      if (catCount[cat] < getMaxPerCategory(cat)) {
        diversified.push(question);
        catCount[cat]++;
      }
      if (diversified.length >= TARGET_SUGGESTION_COUNT) break;
    }

    return [...diversified, ...buildFallbackSuggestions(currentMessage, aiResponse, recentMessages, priorUserTexts)]
      .filter((question, index, all) => all.findIndex((entry) => entry.toLowerCase() === question.toLowerCase()) === index)
      .slice(0, TARGET_SUGGESTION_COUNT);
  } catch (e) {
    if (!isAbortError(e)) {
      console.warn("Suggestion generation failed:", e);
    }
    const priorUserTexts = recentMessages
      .filter((message) => message.sender === "user")
      .map((message) => normalizeText(message.content));

    priorUserTexts.push(normalizeText(currentMessage));

    return buildFallbackSuggestions(currentMessage, aiResponse, recentMessages, priorUserTexts);
  }
}

function getDefaultSuggestions() {
  return [
    "Which project best shows your backend depth?",
    "How do you approach platform reliability?",
    "Which build shows end-to-end ownership?",
    "What's the best way to connect with you?"
  ];
}
