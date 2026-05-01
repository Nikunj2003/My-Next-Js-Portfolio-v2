---
name: jd-tailored-resume
description: Rewrite Nikunj Khitha's ATS-friendly LaTeX resume for a specific job description using the latest portfolio facts, JD keywords, company research, and resume best practices. Use when the user provides or references a JD and asks for a tailored resume.
---

# JD-Tailored Resume

Use this workflow when the user supplies a job description or asks to tailor the resume for a company/role.

## Required Input

- Job description text, URL, or attachment.

## Optional Input

- Company name
- Role title
- Target output path
- Constraints such as one-page, location, remote, seniority, or tech focus

## Workflow

1. Collect the JD:
   - If provided as text, use it directly.
   - If provided as a URL, browse it and cite the source.
   - If provided as a file, read only the needed content.
2. If the user explicitly asks for subagents or an optimized multi-agent flow, spawn these in parallel:
   - `portfolio_resume_miner`: latest verified portfolio facts
   - `jd_keyword_analyst`: must-have requirements, exact keywords, gaps
   - `company_researcher`: company products, domain, stack signals, recent context
   - `resume_practice_researcher`: current ATS and resume-summary best practices
3. Build a targeting brief:
   - Target role title and seniority
   - Top 10 exact ATS keywords from the JD
   - Supported keywords already present in Nikunj's portfolio
   - Missing keywords that must not be faked
   - Company-specific positioning angles
   - Resume sections that need edits
4. Rewrite the resume:
   - Keep one page unless explicitly told otherwise.
   - Mirror exact JD language only when supported by verified facts.
   - Adjust professional summary for the role.
   - Reorder skills by JD priority.
   - Select experience bullets that prove the job's top requirements.
   - Select projects that best match the JD and company domain.
   - Keep all claims truthful and traceable.
5. Score the result:
   - Use `resume_score_auditor` if subagents are allowed.
   - Otherwise produce a compact scorecard locally.
6. Final validation:
   - Balanced LaTeX environments.
   - No unescaped `%`, `$`, `&`, `_`, or `#`.
   - No non-ASCII unless necessary.
   - One-page risk note if no TeX compiler is installed.

## Output

Return:
- Resume path changed.
- Targeting summary.
- Score out of 100.
- Remaining gaps.
- Sources used for JD/company/research.
