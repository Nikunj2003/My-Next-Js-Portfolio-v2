# Job Hunt Resume Flows

This package is designed for Nikunj Khitha's portfolio repository.

It follows the current Codex guidance:
- Custom agents live in `.codex/agents/`.
- Repo-discoverable skills live in `.agents/skills/`.
- Custom prompts are deprecated in favor of skills, so skills are the only workflow entrypoints.
- Subagents are spawned only when explicitly requested, so use `with subagents` for the full optimized version.

## Flow 1: Base Portfolio Resume Refresh

Use when the resume should reflect the latest portfolio data, not a specific job.

Skill trigger:

```text
$portfolio-resume-refresh with subagents
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

Skill trigger:

```text
$jd-tailored-resume with subagents

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

Skill trigger:

```text
$resume-scorecard with subagents

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

Skill trigger:

```text
$portfolio-fact-gap-audit with subagents
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

Skill trigger:

```text
$application-packet with subagents

<paste JD here>
```

Outputs:
- Cover letter.
- Recruiter/referral message.
- LinkedIn connection note.
- Interview talking points.
- Follow-up email draft.

Agents:
- `jd_keyword_analyst`: role priorities and language.
- `company_researcher`: company/product context.
- `portfolio_resume_miner`: verified facts.
- `application_packet_writer`: drafts collateral.
- `final_resume_reviewer`: checks consistency.

## Flow 6: Interview Story Bank

Use once for preparation across many applications.

Skill trigger:

```text
$interview-story-bank with subagents
```

Outputs:
- 8-12 STAR stories.
- Metrics and technologies per story.
- Which job families each story supports.

Agents:
- `portfolio_resume_miner`: verified facts.
- `jd_keyword_analyst`: target role themes when a JD is supplied.
- `company_researcher`: company-specific interview angles when available.
- `interview_story_builder`: drafts STAR stories.
- `final_resume_reviewer`: checks unsupported claims.

## Guardrails

- Never invent experience, dates, metrics, certifications, or education.
- Never add JD keywords unless they are supported by portfolio facts.
- Keep a master base resume and create tailored copies per company when needed.
- Preserve one-page constraints for early-career/general software engineering applications unless the user asks otherwise.
- Cite web sources for company research and current resume guidance.
- If local TeX compilation is unavailable, still validate LaTeX source structure and report the compile limitation.
