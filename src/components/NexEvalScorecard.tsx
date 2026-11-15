import evalResult from "@/data/nex-eval.json";

type Measured = {
  measured: true;
  date: string;
  model: string;
  goldenHash: string;
  total: number;
  passed: number;
  byCategory: Record<string, { total: number; passed: number }>;
  failures: string[];
};
type EvalFile = { measured: false } | Measured;

const CATEGORY_LABELS: Record<string, string> = {
  answerable: "Answers from the record",
  "not-measured": "Says “not measured”",
  "off-topic": "Declines off-topic",
  identity: "Never claims to be Nikunj",
  adversarial: "Holds up to injection",
  navigation: "Takes you to the right place",
};

/**
 * Nex's own eval, the proof of method: a golden question set run against the
 * live agent (`npm run eval:nex`), scored by deterministic checks. Shows only
 * what the last run measured, with the date, model and failures; before a run
 * it says so instead of showing a number.
 */
export function NexEvalScorecard() {
  const result = evalResult as EvalFile;
  return (
    <div data-guide-target="nex-eval" className="mt-8 rounded-2xl border border-foreground/10 glass-subtle p-5 text-left">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Nex&apos;s own eval</p>
      {!result.measured ? (
        <p className="mt-2 text-sm text-muted-foreground">Not measured yet. The golden set exists; no run has been published.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-foreground/85">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {result.passed}/{result.total}
            </span>{" "}
            golden questions passed
          </p>
          <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            {Object.entries(result.byCategory).map(([category, score]) => (
              <li key={category} className="flex justify-between gap-3">
                <span>{CATEGORY_LABELS[category] ?? category}</span>
                <span className="tabular-nums text-foreground/80">
                  {score.passed}/{score.total}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[10.5px] text-muted-foreground/70">
            Snapshot from {result.date}, {result.model}
            {result.failures.length > 0 ? ` · failed: ${result.failures.join(", ")}` : " · no failures"}
          </p>
        </>
      )}
    </div>
  );
}
