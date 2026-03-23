import { NextResponse } from "next/server";
import { AI_MODEL, SYSTEM_PROMPT, SUGGESTION_SYSTEM_PROMPT } from "@/lib/ai-config";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
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

const requestStore = new Map<string, { count: number; resetAt: number }>();

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

    const recentMessages = conversationHistory.slice(-10);

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
      response: aiResponse,
      suggestions: followUpSuggestions.length > 0 ? followUpSuggestions : undefined,
    });

  } catch (error: any) {
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
      .map((m) => m.content.toLowerCase());
    
    priorUserTexts.push(currentMessage.toLowerCase());

    const categoryKeywords: Record<string, RegExp> = {
      experience: /(experience|role|intern|work|company|job|position|impact|responsibilit)/i,
      skills: /(skill|stack|technology|tech|framework|language|tool)/i,
      projects: /(project|build|develop|app|application|platform|system|tool)/i,
      achievements: /(achieve|award|won|improv|result|reduced|increase|coverage|accuracy|milestone)/i,
      contact: /(contact|reach|email|linkedin|connect|collaborate|hire)/i,
      career_goals: /(goal|future|plan|aspiration|next|aim)/i,
    };

    const detectCategoriesFromConversation = (): Set<string> => {
      const s = new Set<string>();
      const corpus = [...recentMessages.map((m) => m.content), currentMessage].join("\n");
      for (const [cat, rx] of Object.entries(categoryKeywords)) {
        if (rx.test(corpus)) s.add(cat);
      }
      return s;
    };

    const usedCategories = Array.from(detectCategoriesFromConversation());
    const desiredCategories = Object.keys(categoryKeywords).filter(
      (c) => !usedCategories.includes(c)
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
        content: `Generate ONLY a JSON array of 3-6 diverse follow-up questions now. Ensure topical diversity. Recently covered categories (avoid over-repeating): ${usedCategories.join(",") || "none"}. Prefer including some of: ${desiredCategories.join(",") || "(reuse any with new angle)"}. Remember: no more than 2 in the same category.`,
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

    if (!suggestionResp.ok) return getDefaultSuggestions();

    const data = await suggestionResp.json();
    let raw = data.choices?.[0]?.message?.content?.trim() || "[]";
    
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    
    let parsed: any = [];
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

    if (!Array.isArray(parsed)) return getDefaultSuggestions();

    const cleaned = parsed
      .filter((v: any) => typeof v === "string")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && s.length <= 120)
      .filter((s: string) => !priorUserTexts.includes(s.toLowerCase()))
      .filter((s: string, i: number, arr: string[]) => arr.findIndex(t => t.toLowerCase() === s.toLowerCase()) === i)
      .slice(0, 6);

    // Post-process for category diversity
    const categorize = (q: string): string => {
      for (const [cat, rx] of Object.entries(categoryKeywords)) {
        if (rx.test(q)) return cat;
      }
      return "other";
    };

    const maxPerCategory = 1; // strict: only one per category to enforce breadth
    const catCount: Record<string, number> = {};
    const diversified: string[] = [];
    for (const q of cleaned) {
      const cat = categorize(q);
      catCount[cat] = catCount[cat] || 0;
      if (catCount[cat] < maxPerCategory) {
        diversified.push(q);
        catCount[cat]++;
      }
      if (diversified.length >= 6) break;
    }

    // Fallback library for missing categories
    const fallbackByCategory: Record<string, string[]> = {
      experience: ["What recent impact has Nikunj made in his current role?"],
      skills: ["Which technical skills does Nikunj use most day to day?"],
      projects: ["Which project best showcases Nikunj's problem-solving?"],
      achievements: ["Can you highlight one of Nikunj's standout achievements?"],
      contact: ["What's the best way to connect with Nikunj for collaboration?"],
      career_goals: ["What future goals is Nikunj focusing on next?"],
    };

    if (diversified.length < 3) {
      // Add fallbacks from unused categories
      for (const cat of Object.keys(fallbackByCategory)) {
        if (diversified.length >= 6) break;
        if (!diversified.some((q) => categorize(q) === cat)) {
          const fb = fallbackByCategory[cat][0];
          if (fb) diversified.push(fb);
        }
      }
    }

    return diversified.slice(0, 6);
  } catch (e) {
    console.warn("Suggestion generation failed:", e);
    return getDefaultSuggestions();
  }
}

function getDefaultSuggestions() {
  return [
    "Tell me about your GraphRAG architecture.",
    "What did you build at ArmorCode?",
    "Can you share more on Serenify's tech stack?",
    "How can I contact Nikunj for opportunities?"
  ];
}

function handleFallbackResponse(message: string) {
  const lowercaseMsg = message.toLowerCase();

  if (lowercaseMsg.includes("contact") || lowercaseMsg.includes("email")) {
    return NextResponse.json({
      response: `# Contact Nikunj Khitha\n\nYou can connect with Nikunj through various channels:\n\n## 📧 **Email**\n[njkhitha2003@gmail.com](mailto:njkhitha2003@gmail.com)\n\n## 💼 **LinkedIn**\n[Connect on LinkedIn](https://www.linkedin.com/in/nikunj-khitha)\n\n## 🐙 **GitHub**\n[View Projects on GitHub](https://github.com/Nikunj2003)\n\n---\n\n> **Currently:** Associate Engineer (Platform & GenAI) at ArmorCode\n> \n> Feel free to reach out for collaborations, job opportunities, or tech discussions!`,
      suggestions: ["What projects have you worked on?", "Tell me about your tech skills."]
    });
  }

  if (lowercaseMsg.includes("experience") || lowercaseMsg.includes("work")) {
    return NextResponse.json({
      response: `# Nikunj's Professional Experience\n\n## 🚀 **Associate Engineer at ArmorCode**\n*Jan 2025 - Present*\n- Architected "Nexus", a hybrid GraphRAG engine.\n- Contributed to "Anya" an autonomous security agent.\n- Developed MCP servers in n8n/Go/Python.\n\n## 🤖 **SDE Intern at Xansr Media (Aiko)**\n*Jun 2024 - Dec 2024*\n- Built scalable backend for AIKO voice assistant with 96% accuracy.\n- Engineered ETL pipelines with Azure AI.\n- Developed Fantasy GPT (LangGraph + SQL RAG).\n\n> Would you like to know more about a specific role?`,
      suggestions: ["What was your role in CodeNex?", "What skills do you actively use?"]
    });
  }

  return NextResponse.json({
    response: `# Welcome! I'm the AI Twin for Nikunj Khitha\n\nI'm currently running in an offline or limited capacity, but I can still tell you about Nikunj!\n\n## What would you like to know?\n\n- **Current Role**: Associate Engineer (Platform & GenAI) at ArmorCode\n- **Tech Stack**: GraphRAG, LangGraph, Python, MS+Java, TypeScript\n- **Experience**: Built multi-agent platforms and unified AI gateways\n\n> Ask me about Nikunj's projects, experience, or contact information!`,
    suggestions: ["Tell me about your work at ArmorCode.", "How can I contact Nikunj?"]
  });
}
