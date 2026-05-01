---
name: portfolio-fact-gap-audit
description: Audit Nikunj Khitha's portfolio and resume for missing facts that weaken job applications, such as missing metrics, dates, links, certifications, project evidence, or stale/contradictory claims.
---

# Portfolio Fact Gap Audit

Use this skill when the user wants to improve the source material behind resumes and applications.

## Trigger Examples

- `$portfolio-fact-gap-audit`
- `Use the portfolio-fact-gap-audit skill.`
- `Find missing facts in my portfolio that would improve my resume.`

Add `with subagents` for the full optimized flow.

## Inputs

- Portfolio repo, default: current repository
- Optional resume path
- Optional target JD or job family

## Lightweight Flow

1. Scan portfolio data and current resume.
2. Identify gaps:
   - Missing or stale dates
   - Missing phone/location/contact consistency
   - Missing project metrics
   - Missing live demo links
   - Missing certifications or coursework
   - Missing proof for claimed tools
   - Contradictions between portfolio, resume, and SEO context
3. Rank gaps by impact on job applications.

## Full Subagent Flow

When explicitly invoked with `with subagents`, spawn:

- `portfolio_resume_miner`: source fact extraction
- `resume_score_auditor`: resume evidence and truthfulness risks
- `jd_keyword_analyst`: JD-specific missing evidence, if JD is supplied

## Rules

- Do not edit files unless explicitly asked.
- Do not invent missing facts; list what the user should provide.
- Include file paths and line references where possible.
