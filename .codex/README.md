# Codex Job Hunt Toolkit

This `.codex` folder contains project-scoped Codex setup for Nikunj Khitha's resume and job-search workflows.

## What Is Here

- `.codex/config.toml`: subagent concurrency settings.
- `.codex/agents/`: specialized custom agents for portfolio mining, JD analysis, company research, resume writing, scoring, and final review.
- `.codex/job-hunt/FLOWS.md`: recommended workflows and guardrails.
- `.codex/job-hunt/SCENARIOS.md`: job-hunt scenarios covered by this setup.
- `.codex/prompts/`: reusable prompt templates.

## Important Docs Note

OpenAI's current Codex docs say custom prompts are deprecated in favor of skills. They also say repo-discoverable skills live under `.agents/skills`, not `.codex`.

For that reason, the actual reusable skills are also checked into:

- `.agents/skills/portfolio-resume-refresh/`
- `.agents/skills/jd-tailored-resume/`
- `.agents/skills/resume-scorecard/`

The `.codex/prompts/` files are kept as portable prompt templates. If you want them as slash commands in a local Codex install, copy them to `~/.codex/prompts/` and restart Codex.

## Fast Commands To Ask Codex

Base resume:

```text
Use the portfolio-resume-refresh skill. Spawn the resume subagents. Update my base one-page LaTeX resume from the latest portfolio facts.
```

JD-tailored resume:

```text
Use the jd-tailored-resume skill. Spawn the resume subagents. Tailor my resume to this JD:

<paste JD>
```

Score only:

```text
Use the resume-scorecard skill. Score my resume against this JD but do not edit files:

<paste JD>
```
