# Job Hunt Scenario Coverage

## Covered Now

1. Base one-page ATS resume from portfolio facts.
2. JD-tailored one-page ATS resume.
3. Resume scorecard against a JD.
4. Company-aware resume positioning through web research.
5. Current ATS and resume-summary best-practice checks.
6. Final LaTeX and one-page quality gate.
7. Application packet: cover letter, recruiter email, LinkedIn note, referral ask.
8. Interview story bank from portfolio/resume facts.
9. Portfolio fact-gap audit for missing metrics, dates, certifications, and links.

## Skill Entrypoints

- `$portfolio-resume-refresh with subagents`
- `$jd-tailored-resume with subagents`
- `$resume-scorecard with subagents`
- `$application-packet with subagents`
- `$interview-story-bank with subagents`
- `$portfolio-fact-gap-audit with subagents`

## Recommended Future Flows

1. `job-tracker-update`: Maintain a `.context/job-tracker.md` table with company, role, JD link, resume version, score, status, follow-up date, and notes.
2. `resume-versioning`: Save tailored resumes under `.context/generated-resumes/<company>-<role>.tex` so the base resume stays clean.
3. `linkedin-profile-sync`: Compare the resume with LinkedIn headline/about/experience and suggest profile updates.
4. `github-project-proof`: For each target job, map resume projects to GitHub repositories, README quality, screenshots, and demo links.
5. `job-tracker-update`: Record each tailored resume score, outreach status, follow-up date, and interview notes.

## Scenario Guardrails

- Keep the base resume general and truthful.
- Keep tailored resumes company-specific and saved separately.
- Do not add a tool, framework, certification, or metric just because it appears in the JD.
- Prefer strengthening existing bullets over adding unsupported skills.
- Use web research for company-specific positioning because company products, hiring priorities, and tech stacks change.
- Use fresh resume best-practice research when changing structure, summary format, ATS handling, or PDF/LaTeX assumptions.
