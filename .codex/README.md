# Codex Job Hunt Toolkit

This `.codex` folder contains project-scoped Codex setup for Nikunj Khitha's resume and job-search workflows.

## What Is Here

- `.codex/config.toml`: subagent concurrency settings.
- `.codex/agents/`: specialized custom agents for portfolio mining, JD analysis, company research, resume writing, scoring, and final review.
- `.codex/job-hunt/FLOWS.md`: recommended workflows and guardrails.
- `.codex/job-hunt/SCENARIOS.md`: job-hunt scenarios covered by this setup.
- `.agents/skills/`: skill entrypoints for each reusable workflow.

## Important Docs Note

OpenAI's current Codex docs say custom prompts are deprecated in favor of skills. They also say repo-discoverable skills live under `.agents/skills`, not `.codex`.

For that reason, the reusable workflows are checked into:

- `.agents/skills/portfolio-resume-refresh/`
- `.agents/skills/jd-tailored-resume/`
- `.agents/skills/resume-scorecard/`
- `.agents/skills/application-packet/`
- `.agents/skills/interview-story-bank/`
- `.agents/skills/portfolio-fact-gap-audit/`

The entrypoint is the skill. Add `with subagents` when you want the full multi-agent version, because Codex only spawns subagents when explicitly asked.

## Fast Commands To Ask Codex

Base resume:

```text
$portfolio-resume-refresh with subagents
```

JD-tailored resume:

```text
$jd-tailored-resume with subagents

<paste JD>
```

Score only:

```text
$resume-scorecard with subagents

<paste JD>
```

Application packet:

```text
$application-packet with subagents

<paste JD>
```

Interview prep:

```text
$interview-story-bank with subagents
```

Portfolio fact gaps:

```text
$portfolio-fact-gap-audit with subagents
```
