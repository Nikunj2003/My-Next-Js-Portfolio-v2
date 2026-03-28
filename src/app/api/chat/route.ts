import { NextResponse } from "next/server";
import { AI_MODEL, SYSTEM_PROMPT, SUGGESTION_SYSTEM_PROMPT } from "@/lib/ai-config";
import { CHAT_MEMORY_WINDOW, appendContextualLinks, findMatchingProjects, normalizeText } from "@/lib/ai-twin";

interface Message {
  content: string;
  sender: "user" | "ai";
}

interface ChatRequest {
  message: string;
  conversationHistory?: Message[];
}

interface ChatCompletionMessageParam {
  role: "system" | "user" | "assistant";
  content: string;
}

const RATE_LIMIT = 39;
const WINDOW_MS = 60_000;
const TARGET_SUGGESTION_COUNT = 4;
const MAX_SUGGESTION_LENGTH = 44;

const requestStore = new Map<string, { count: number; resetAt: number }>();

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

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const firstIp = forwardedFor.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip") || "";
  const ip = firstIp || realIp || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return `${ip}-${userAgent}`;
}

function checkRateLimit(request: Request): {
  limited: boolean;
  remaining: number;
  retryAfter: number;
} {
  const clientKey = getClientKey(request);
  const now = Date.now();
  const entry = requestStore.get(clientKey);

  if (!entry || now >= entry.resetAt) {
    requestStore.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, remaining: RATE_LIMIT - 1, retryAfter: 0 };
  }

  const nextCount = entry.count + 1;
  entry.count = nextCount;

  const limited = nextCount > RATE_LIMIT;
  const remaining = limited ? 0 : RATE_LIMIT - nextCount;
  const retryAfter = limited ? Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) : 0;

  return { limited, remaining, retryAfter };
}

export async function POST(request: Request) {
  const rateLimitResult = checkRateLimit(request);
  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(RATE_LIMIT),
    "X-RateLimit-Remaining": String(rateLimitResult.remaining),
  };

  if (rateLimitResult.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute before trying again." },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(rateLimitResult.retryAfter),
        },
      }
    );
  }

  try {
    const body: ChatRequest = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      console.warn("LLM API key not configured, returning fallback response");
      return handleFallbackResponse(message);
    }

    const invokeUrl = process.env.LLM_BASE_URL || "https://integrate.api.nvidia.com/v1/chat/completions";
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    };

    const recentMessages = conversationHistory.slice(-CHAT_MEMORY_WINDOW);

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    recentMessages.forEach((msg) => {
      messages.push({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      });
    });

    messages.push({ role: "user", content: message });

    // 1. Generate primary AI response
    const response = await fetch(invokeUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        top_p: 0.7,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("LLM API error:", await response.text());
      return handleFallbackResponse(message);
    }

    const responseData = await response.json();
    let aiResponse = responseData.choices?.[0]?.message?.content || "";

    if (!aiResponse) {
      aiResponse = "I apologize, but I'm having trouble responding right now. Please try asking your question again.";
    }

    // 2. Generate Follow-up suggestions
    const followUpSuggestions = await generateAISuggestions(
      message,
      aiResponse,
      recentMessages,
      invokeUrl,
      headers
    );

    return NextResponse.json({
      response: appendContextualLinks(message, aiResponse),
      suggestions: followUpSuggestions.length > 0 ? followUpSuggestions : undefined,
    });

  } catch (error: unknown) {
    console.error("AI Response Error:", error);
    return handleFallbackResponse("fallback");
  }
}

async function generateAISuggestions(
  currentMessage: string,
  aiResponse: string,
  recentMessages: Message[],
  invokeUrl: string,
  headers: Record<string, string>
): Promise<string[]> {
  try {
    const priorUserTexts = recentMessages
      .filter((m) => m.sender === "user")
      .map((m) => normalizeText(m.content));

    priorUserTexts.push(normalizeText(currentMessage));

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

    const suggestionResp = await fetch(invokeUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: AI_MODEL,
        messages: suggestionMessages,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

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
    console.warn("Suggestion generation failed:", e);
    const priorUserTexts = recentMessages
      .filter((message) => message.sender === "user")
      .map((message) => normalizeText(message.content));

    priorUserTexts.push(normalizeText(currentMessage));

    return buildFallbackSuggestions(currentMessage, aiResponse, recentMessages, priorUserTexts);
  }
}

function getDefaultSuggestions() {
  return [
    "What GenAI work are you doing right now?",
    "Which project should I open first?",
    "Could you share a standout repo?",
    "What's the best way to connect with you?"
  ];
}

function handleFallbackResponse(message: string) {
  const lowercaseMsg = message.toLowerCase();

  if (lowercaseMsg.includes("contact") || lowercaseMsg.includes("email")) {
    return NextResponse.json({
      response: appendContextualLinks(
        message,
        `# Contact Nikunj Khitha\n\nYou can connect with Nikunj through various channels:\n\n## 📧 **Email**\n[njkhitha2003@gmail.com](mailto:njkhitha2003@gmail.com)\n\n## 💼 **LinkedIn**\n[Connect on LinkedIn](https://www.linkedin.com/in/nikunj-khitha)\n\n## 🐙 **GitHub**\n[View Projects on GitHub](https://github.com/Nikunj2003)\n\n---\n\n> **Currently:** Associate Engineer (Platform & GenAI) at ArmorCode\n> \n> Feel free to reach out for collaborations, job opportunities, or tech discussions!`
      ),
      suggestions: ["Which project should I open first?", "Could you share a standout repo?"]
    });
  }

  if (lowercaseMsg.includes("experience") || lowercaseMsg.includes("work")) {
    return NextResponse.json({
      response: appendContextualLinks(
        message,
        `# Nikunj's Professional Experience\n\n## 🚀 **Associate Engineer at ArmorCode**\n*Jan 2025 - Present*\n- Architected "Nexus", a hybrid GraphRAG engine.\n- Contributed to "Anya" an autonomous security agent.\n- Developed MCP servers in n8n/Go/Python.\n\n## 🤖 **SDE Intern at Xansr Media (Aiko)**\n*Jun 2024 - Dec 2024*\n- Built scalable backend for AIKO voice assistant with 96% accuracy.\n- Engineered ETL pipelines with Azure AI.\n- Developed Fantasy GPT (LangGraph + SQL RAG).\n\n> Would you like to know more about a specific role?`
      ),
      suggestions: ["What impact are you driving at ArmorCode?", "Which project best shows your strengths?"]
    });
  }

  return NextResponse.json({
    response: appendContextualLinks(
      message,
      `# Welcome! I'm the AI Twin for Nikunj Khitha\n\nI'm currently running in an offline or limited capacity, but I can still tell you about Nikunj!\n\n## What would you like to know?\n\n- **Current Role**: Associate Engineer (Platform & GenAI) at ArmorCode\n- **Tech Stack**: GraphRAG, LangGraph, Python, MS+Java, TypeScript\n- **Experience**: Built multi-agent platforms and unified AI gateways\n\n> Ask me about Nikunj's projects, experience, or contact information!`
    ),
    suggestions: ["What GenAI work are you doing right now?", "Could you share a standout repo?"]
  });
}
