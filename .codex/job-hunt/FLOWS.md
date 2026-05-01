# Job Hunt Resume Flows

This package is designed for Nikunj Khitha's portfolio repository.

It follows the current Codex guidance:
- Custom agents live in `.codex/agents/`.
- Repo-discoverable skills live in `.agents/skills/`.
- Custom prompts are deprecated in favor of skills, but reusable prompt templates are kept in `.codex/prompts/` for copy/paste or manual migration to `~/.codex/prompts/`.

## Flow 1: Base Portfolio Resume Refresh

Use when the resume should reflect the latest portfolio data, not a specific job.

Prompt:

```text
Use the portfolio-resume-refresh skill. Spawn the resume subagents. Update Nikunj_Khitha_ATS_Resume_2026.tex from the latest portfolio facts and current ATS best practices. Keep it one page.
```

Agents:
- `portfolio_resume_miner`: extracts verified facts from the portfolio.
- `resume_practice_researcher`: checks current ATS and resume-summary guidance.
- `resume_latex_writer`: updates the LaTeX file.
- `final_resume_reviewer`: checks one-page risk, LaTeX issues, typos, and unsupported claims.

Outputs:
- Updated base LaTeX resume.
- Validation notes.
- Missing facts to add to the portfolio later.

## Flow 2: JD-Tailored Resume Rewrite

Use when applying to a specific company/role.

Prompt:

```text
Use the jd-tailored-resume skill. Spawn the resume subagents. Tailor Nikunj_Khitha_ATS_Resume_2026.tex for this JD:

<paste JD here>
```

Agents:
- `portfolio_resume_miner`: latest portfolio facts.
- `jd_keyword_analyst`: JD requirements, exact ATS keywords, and gaps.
- `company_researcher`: company/product/domain positioning from web research.
- `resume_practice_researcher`: current ATS best practices.
- `resume_latex_writer`: writes the tailored LaTeX resume.
- `resume_score_auditor`: scores against the JD.
- `final_resume_reviewer`: final quality gate.

Outputs:
- Tailored LaTeX resume.
- JD keyword map.
- Company positioning notes.
- Score out of 100.
- Remaining honest gaps.

## Flow 3: Scoring-Only Resume Audit

Use before editing, or when comparing the current resume against a JD.

Prompt:

```text
Use the resume-scorecard skill. Score Nikunj_Khitha_ATS_Resume_2026.tex against this JD, but do not edit files:

<paste JD here>
```

Outputs:
- ATS/JD score out of 100.
- Top fixes by impact.
- Missing keywords.
- Unsupported or weak claims.
- One-page and LaTeX risks.

## Flow 4: Portfolio Fact Gap Update

Use when the resume needs facts that are not yet present in the portfolio.

Prompt:

```text
Scan the portfolio for resume facts and identify missing data that would improve job applications. Do not edit the resume yet.
```

Typical missing facts:
- Exact promotion dates.
- Verified phone/location preference.
- Links to live demos.
- Certifications.
- Publications/blog posts.
- Quantified outcomes for projects.
- Tech stack evidence for specific companies.

## Flow 5: Job Application Packet

Use after the tailored resume is ready.

Prompt:

```text
Using the tailored resume and JD, draft a concise cover letter, LinkedIn outreach message, recruiter email, and 5 interview talking points. Keep claims consistent with the resume.
```

Outputs:
- Cover letter.
- Recruiter/referral message.
- LinkedIn connection note.
- Interview talking points.
- Follow-up email draft.

## Flow 6: Interview Story Bank

Use once for preparation across many applications.

Prompt:

```text
Build a STAR story bank from my portfolio and resume for backend, GenAI, platform, ownership, debugging, leadership, conflict, and failure questions.
```

Outputs:
- 8-12 STAR stories.
- Metrics and technologies per story.
- Which job families each story supports.

## Guardrails

- Never invent experience, dates, metrics, certifications, or education.
- Never add JD keywords unless they are supported by portfolio facts.
- Keep a master base resume and create tailored copies per company when needed.
- Preserve one-page constraints for early-career/general software engineering applications unless the user asks otherwise.
- Cite web sources for company research and current resume guidance.
- If local TeX compilation is unavailable, still validate LaTeX source structure and report the compile limitation.
