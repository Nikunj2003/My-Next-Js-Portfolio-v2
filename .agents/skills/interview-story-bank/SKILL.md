---
name: interview-story-bank
description: Build or refresh Nikunj Khitha's interview STAR story bank from portfolio and resume facts for backend, GenAI, platform, ownership, debugging, leadership, conflict, and failure questions.
---

# Interview Story Bank

Use this skill to prepare reusable interview stories from verified portfolio/resume facts.

## Trigger Examples

- `$interview-story-bank`
- `Use the interview-story-bank skill.`
- `Build STAR stories from my portfolio and resume.`

Add `with subagents` for the full optimized flow.

## Inputs

- Portfolio repo, default: current repository
- Resume path, default: `Nikunj_Khitha_ATS_Resume_2026.tex`
- Optional target company/JD

## Lightweight Flow

1. Read the resume and portfolio facts.
2. Build 8-12 STAR stories across:
   - Backend systems
   - GenAI/RAG
   - Platform/gateway work
   - Automation
   - Debugging/incident handling
   - Ownership
   - Conflict/collaboration
   - Failure/learning
3. For each story, include situation, task, action, result, technologies, metrics, and likely interview questions.

## Full Subagent Flow

When explicitly invoked with `with subagents`, spawn:

- `portfolio_resume_miner`: verified facts and metrics
- `jd_keyword_analyst`: target role themes, if JD is provided
- `company_researcher`: company-specific interview angles, if company/JD is provided
- `interview_story_builder`: STAR story drafting
- `final_resume_reviewer`: checks unsupported claims

## Rules

- Do not fabricate adversity, leadership, metrics, or outcomes.
- Prefer specific engineering decisions over vague teamwork language.
- Keep each story concise enough to answer in 90-120 seconds.
