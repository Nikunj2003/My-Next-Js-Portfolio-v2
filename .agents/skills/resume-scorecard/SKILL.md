---
name: resume-scorecard
description: Score Nikunj Khitha's resume against a job description, ATS parsing, keyword coverage, evidence strength, recruiter readability, and truthfulness. Use when asked to evaluate, score, compare, or audit the resume.
---

# Resume Scorecard

Use this skill to audit a resume before submitting it.

## Trigger Examples

- `$resume-scorecard`
- `Use the resume-scorecard skill.`
- `Score my resume against this JD but do not edit files: <paste JD>`

Add `with subagents` when the user wants JD analysis, company research, and resume audit split across specialists.

## Inputs

- Resume path, default: `Nikunj_Khitha_ATS_Resume_2026.tex`
- Optional job description text, URL, or attachment
- Optional target company and role

## Workflow

1. Read the resume source.
2. If a JD is provided:
   - Extract role title, must-have requirements, preferred requirements, exact keywords, and repeated phrases.
   - Research the company if a company name or JD URL is available and the user asked for job-fit scoring.
3. If the user explicitly asks for subagents or an optimized multi-agent flow, spawn:
   - `jd_keyword_analyst`: JD requirements and exact keywords
   - `company_researcher`: company context when company/JD URL is available
   - `resume_score_auditor`: scorecard and top fixes
   - `portfolio_resume_miner`: source support checks when truthfulness is in scope
4. Score:
   - ATS parse safety: 20
   - JD keyword alignment: 20
   - Evidence and metrics: 20
   - Recruiter readability: 15
   - Role positioning: 15
   - Truthfulness/source support: 10
5. Return:
   - Total score out of 100
   - Top fixes by impact
   - Missing or weak keywords
   - Unsupported claims
   - One-page/LaTeX risks
   - Recommended edits, but do not edit unless the user asks.

## Rules

- Do not invent experience or tools.
- Separate ATS issues from recruiter readability issues.
- Prefer actionable findings over generic resume advice.
- Cite web sources when browsing is used.
