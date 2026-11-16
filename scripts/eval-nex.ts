/**
 * Runs Nex's golden set against a running local server and, only if every
 * case completed, writes the result to src/data/nex-eval.json.
 *
 *   npm run dev            # in another terminal
 *   npm run eval:nex       # or: ... scripts/eval-nex.ts --base http://localhost:3000
 *
 * Local only: it refuses non-localhost targets so it never spends a deployed
 * site's chat budget. Sequential and paced (20 a minute, under the route's
 * per-client limit), honouring Retry-After. A rate limit, server error or
 * timeout marks the case "errored" (not "failed"), and nothing is written.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { caseStudies } from "@/data/case-studies";
import { createChatEventParser, CHAT_ENDPOINT, type ChatStreamEvent } from "@/lib/chat-contract";
import { hashText, scoreCase, summarise, type CaseScore, type GoldenCase, type Observed } from "@/lib/nex/eval-score";

const GOLDEN_PATH = "evals/nex/golden.json";
const OUT_PATH = "src/data/nex-eval.json";
const PACE_MS = 3000;
const TIMEOUT_MS = 90_000;

const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1]! : "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error(`Refusing ${base}: the eval only runs against a local server.`);
  process.exit(1);
}

const goldenText = readFileSync(GOLDEN_PATH, "utf8");
const golden = JSON.parse(goldenText) as GoldenCase[];
const slugs = new Set(caseStudies.map((study) => study.slug));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function ask(question: string): Promise<Observed & { model?: string }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(base + CHAT_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: question, conversationHistory: [] }),
        signal: controller.signal,
      });
      if (response.status === 429 || response.status === 503) {
        const wait = Number(response.headers.get("retry-after") ?? "20") * 1000;
        await sleep(Math.min(wait, 70_000));
        continue;
      }
      if (!response.ok || !response.body) return { text: "", tools: [], error: `HTTP ${response.status}` };
      let text = "";
      const tools: Observed["tools"] = [];
      let error: string | undefined;
      let model: string | undefined;
      const parser = createChatEventParser();
      const handle = (event: ChatStreamEvent) => {
        if (event.type === "text_delta") text += event.text;
        if (event.type === "text_replace") text = event.text;
        if (event.type === "tool_result") tools.push({ name: event.call.name, refused: Boolean(event.call.refused) });
        if (event.type === "trace") model = event.trace.model;
        if (event.type === "error") error = `${event.code}: ${event.error}`;
      };
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true })).forEach(handle);
      }
      parser.flush().forEach(handle);
      return { text, tools, error, model };
    } catch (failure) {
      return { text: "", tools: [], error: failure instanceof Error ? failure.message : String(failure) };
    } finally {
      clearTimeout(timer);
    }
  }
  return { text: "", tools: [], error: "rate limited" };
}

const scores: CaseScore[] = [];
let model = "unknown";
for (const item of golden) {
  const observed = await ask(item.question);
  if (observed.model) model = observed.model;
  const score = scoreCase(item, observed, slugs);
  scores.push(score);
  console.log(`${score.status.padEnd(8)} ${item.id.padEnd(20)} ${score.reasons.join("; ")}`);
  await sleep(PACE_MS);
}

const summary = summarise(golden, scores, { date: new Date().toISOString().slice(0, 10), model, goldenHash: hashText(goldenText) });
if (!summary) {
  console.error(`\nNot written: ${scores.filter((s) => s.status === "errored").length} case(s) errored. Fix the server or wait out the limit, then rerun.`);
  process.exit(1);
}
writeFileSync(OUT_PATH, JSON.stringify(summary, null, 2) + "\n");
console.log(`\n${summary.passed}/${summary.total} passed. Written to ${OUT_PATH}.`);
