---
name: application-packet
description: Create job-application collateral from Nikunj Khitha's tailored resume and a job description, including cover letter, recruiter email, LinkedIn note, referral ask, follow-up, and interview talking points. Use after a tailored resume exists or when asked for outreach material.
---

# Application Packet

Use this skill after a resume is tailored or when the user asks for job-application messages.

## Trigger Examples

- `$application-packet`
- `Use the application-packet skill for this JD.`
- `Create a cover letter, recruiter email, LinkedIn note, and interview talking points from my tailored resume.`

Add `with subagents` when the user wants the full optimized flow.

## Inputs

- Resume path, default: `Nikunj_Khitha_ATS_Resume_2026.tex`
- Job description text, URL, or attachment
- Optional company name and role title

## Lightweight Flow

1. Read the resume.
2. Read the JD.
3. Draft:
   - Cover letter, 180-250 words
   - Recruiter email
   - LinkedIn connection note
   - Referral ask
   - 3-day and 7-day follow-up messages
   - 5 interview talking points
4. Keep all claims consistent with the resume.

## Full Subagent Flow

When explicitly invoked with `with subagents`, spawn:

- `jd_keyword_analyst`: role priorities and keywords
- `company_researcher`: company context and positioning
- `portfolio_resume_miner`: verified profile facts
- `application_packet_writer`: final collateral drafting
- `final_resume_reviewer`: consistency check against resume/JD

## Rules

- Do not invent claims, personal connections, or availability.
- Keep tone direct, specific, and professional.
- Mention metrics only if present in the resume or portfolio facts.
- Cite sources if web research is used.
