---
name: resume-scorecard
description: Score Nikunj Khitha's resume against a job description, ATS parsing, keyword coverage, evidence strength, recruiter readability, and truthfulness. Use when asked to evaluate, score, compare, or audit the resume.
---

# Resume Scorecard

Use this skill to audit a resume before submitting it.

## Inputs

- Resume path, default: `Nikunj_Khitha_ATS_Resume_2026.tex`
- Optional job description text, URL, or attachment
- Optional target company and role

## Workflow

1. Read the resume source.
2. If a JD is provided:
   - Extract role title, must-have requirements, preferred requirements, exact keywords, and repeated phrases.
   - Research the company if a company name or JD URL is available and the user asked for job-fit scoring.
3. Score:
   - ATS parse safety: 20
   - JD keyword alignment: 20
   - Evidence and metrics: 20
   - Recruiter readability: 15
   - Role positioning: 15
   - Truthfulness/source support: 10
4. Return:
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
