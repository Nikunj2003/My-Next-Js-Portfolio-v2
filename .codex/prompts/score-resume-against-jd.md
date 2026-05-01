---
description: Score a resume against a JD without editing
argument-hint: JD="<job description or URL>" [RESUME=path] [COMPANY=name]
---

Use the resume-scorecard skill.

Do not edit files.

Resume:
$RESUME

Job description:
$JD

Company:
$COMPANY

If `RESUME` is empty, use `Nikunj_Khitha_ATS_Resume_2026.tex`.

Score the resume out of 100 across:
- ATS parse safety
- JD keyword alignment
- Evidence and metrics
- Recruiter readability
- Role positioning
- Truthfulness and source support

Return the highest-impact fixes first. If browsing is used for JD or company context, cite sources.
