# Job Hunt Skill Instructions

This file explains how to use the job-hunt skills and subagents in this repository.

## Core Rule

Skills are the entrypoints. Subagents are the specialists.

Use a skill by name:

```text
$jd-tailored-resume
```

Use the full optimized version by adding explicit subagent permission:

```text
$jd-tailored-resume with subagents
```

Codex docs require explicit user permission before spawning subagents, so `with subagents` is intentional.

## Directory Layout

- `.agents/skills/`: repo-discoverable skill entrypoints.
- `.codex/agents/`: project-scoped custom subagents.
- `.codex/config.toml`: subagent thread/depth settings.
- `.codex/job-hunt/`: flow documentation and operating instructions.

## Recommended End-to-End Job Application Flow

1. Refresh the base resume:

```text
$portfolio-resume-refresh with subagents
```

2. Score the current resume against the JD:

```text
$resume-scorecard with subagents

<paste JD>
```

3. Tailor the resume:

```text
$jd-tailored-resume with subagents

<paste JD>
```

4. Create application collateral:

```text
$application-packet with subagents

<paste JD>
```

5. Prepare for interviews:

```text
$interview-story-bank with subagents

<paste JD or company name>
```

6. Improve source material when gaps appear:

```text
$portfolio-fact-gap-audit with subagents
```

## Flow 1: Portfolio Resume Refresh

Trigger:

```text
$portfolio-resume-refresh with subagents
```

Use when:

- The portfolio data changed.
- The base resume is stale.
- You want a clean general-purpose one-page ATS resume.

Inputs:

- Portfolio repo, default current repo.
- Existing resume files, if present.
- Optional attachment, if the user provides one.

Subagents:

- `portfolio_resume_miner`: extracts verified resume facts from portfolio files.
- `resume_practice_researcher`: checks current ATS and resume best practices.
- `resume_latex_writer`: updates the LaTeX resume.
- `final_resume_reviewer`: checks one-page risk, syntax, typos, and unsupported claims.

Output:

- Updated base resume, default `Nikunj_Khitha_ATS_Resume_2026.tex`.
- Validation notes.
- Missing facts that would improve the resume.

## Flow 2: JD-Tailored Resume

Trigger:

```text
$jd-tailored-resume with subagents

<paste JD>
```

Use when:

- Applying to a specific job.
- A company or role requires different positioning.
- The JD has important keywords not emphasized in the base resume.

Inputs:

- JD text, URL, or attachment.
- Optional company name.
- Optional role title.
- Optional output path.

Subagents:

- `portfolio_resume_miner`: latest verified portfolio facts.
- `jd_keyword_analyst`: must-have requirements, exact JD keywords, and gaps.
- `company_researcher`: company/product/domain context from web research.
- `resume_practice_researcher`: current ATS guidance.
- `resume_latex_writer`: tailored LaTeX rewrite.
- `resume_score_auditor`: score against the JD.
- `final_resume_reviewer`: final quality gate.

Output:

- Tailored one-page ATS resume.
- Keyword map.
- Company positioning notes.
- Score out of 100.
- Remaining honest gaps.

Rules:

- Mirror exact JD language only when supported by verified facts.
- Do not invent tools, certifications, experience, metrics, or education.
- Save company-specific variants separately when needed.

## Flow 3: Resume Scorecard

Trigger:

```text
$resume-scorecard with subagents

<paste JD>
```

Use when:

- You want feedback before editing.
- You want to compare the base resume with a JD.
- You want a risk report before submitting.

Score:

- ATS parse safety: 20
- JD keyword alignment: 20
- Evidence and metrics: 20
- Recruiter readability: 15
- Role positioning: 15
- Truthfulness and source support: 10

Subagents:

- `jd_keyword_analyst`: extracts JD requirements and keywords.
- `company_researcher`: researches company context when available.
- `resume_score_auditor`: produces the scorecard.
- `portfolio_resume_miner`: checks source support when needed.

Output:

- Score out of 100.
- Top fixes by impact.
- Missing or weak keywords.
- Unsupported claims.
- One-page and LaTeX risks.

## Flow 4: Application Packet

Trigger:

```text
$application-packet with subagents

<paste JD>
```

Use when:

- The tailored resume is ready.
- You need outreach or application collateral.

Subagents:

- `jd_keyword_analyst`: role priorities.
- `company_researcher`: company context.
- `portfolio_resume_miner`: verified profile facts.
- `application_packet_writer`: drafts collateral.
- `final_resume_reviewer`: checks consistency.

Output:

- Cover letter.
- Recruiter email.
- LinkedIn connection note.
- Referral ask.
- Follow-up messages.
- Interview talking points.

Rules:

- Keep claims consistent with the resume.
- Keep messages concise and ready to send.
- Do not invent relationships, availability, salary, or visa details.

## Flow 5: Interview Story Bank

Trigger:

```text
$interview-story-bank with subagents
```

Optional:

```text
$interview-story-bank with subagents

<paste JD or company name>
```

Use when:

- Preparing for interviews.
- Building reusable STAR stories.
- Mapping resume achievements to behavioral and technical questions.

Subagents:

- `portfolio_resume_miner`: verified facts.
- `jd_keyword_analyst`: role themes if JD is supplied.
- `company_researcher`: company-specific interview angles if available.
- `interview_story_builder`: drafts STAR stories.
- `final_resume_reviewer`: checks unsupported claims.

Output:

- 8-12 STAR stories.
- Technologies and metrics per story.
- Best-fit interview questions.
- Weak stories that need more detail.

## Flow 6: Portfolio Fact Gap Audit

Trigger:

```text
$portfolio-fact-gap-audit with subagents
```

Use when:

- Tailored resume scoring exposes missing evidence.
- Portfolio claims are stale or inconsistent.
- Projects need better metrics, links, or proof.

Subagents:

- `portfolio_resume_miner`: source fact extraction.
- `resume_score_auditor`: evidence and truthfulness risks.
- `jd_keyword_analyst`: JD-specific missing evidence when a JD is provided.

Output:

- Missing project metrics.
- Missing live/demo links.
- Missing dates or contact consistency.
- Missing certifications/coursework.
- Weak proof for claimed tools.
- Contradictions between portfolio, resume, and SEO context.

## Guardrails

- Never invent facts.
- Prefer verified portfolio facts over generic resume language.
- Cite web sources for JD/company/current ATS research.
- Keep the base resume general.
- Keep tailored resumes job-specific.
- Use one-page resumes unless explicitly asked otherwise.
- If no TeX compiler is installed, validate source structure and report the limitation.
