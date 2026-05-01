---
name: portfolio-resume-refresh
description: Refresh or create Nikunj Khitha's ATS-friendly LaTeX resume from the latest local portfolio data, existing resume files, and current resume best practices. Use when asked to update the resume from portfolio content or regenerate the base one-page resume.
---

# Portfolio Resume Refresh

Use this workflow to create or update the base resume from the latest portfolio information.

## Trigger Examples

- `$portfolio-resume-refresh`
- `Use the portfolio-resume-refresh skill.`
- `Refresh my base one-page LaTeX resume from my latest portfolio.`

Add `with subagents` when the user wants the full optimized multi-agent flow. Codex docs require explicit permission before spawning subagents.

## Inputs

- Default portfolio root: current repository.
- Default output: `Nikunj_Khitha_ATS_Resume_2026.tex`.
- Source of truth: local portfolio facts first; current resume best practices second.

## Workflow

1. Inspect the local repo for resume facts:
   - `src/data/portfolio.ts`
   - `public/llms.txt` and `public/llms-full.txt`
   - `src/lib/seo/site.ts`
   - `src/components/AboutSection.tsx`, `ContactSection.tsx`, `ExperienceSection.tsx`, `ProjectsSection.tsx`, `SkillsSection.tsx`
   - Existing resume files under `public/` and repository root
   - `.context/attachments/` when the user explicitly points to an attachment
2. If the user explicitly asks for subagents or parallel work, spawn:
   - `portfolio_resume_miner` for facts
   - `resume_practice_researcher` for current ATS and summary guidance
   - `resume_latex_writer` for drafting/updating the LaTeX resume
   - `final_resume_reviewer` only after a draft exists
3. Build a verified-facts map:
   - Identity and contact
   - Location
   - Education
   - Experience
   - Projects
   - Skills
   - Awards and public presentations
   - Metrics
   - Links
   - Contradictions and stale claims
4. Write or update the LaTeX resume:
   - Keep one page unless the user asks otherwise.
   - Use one column and standard headings.
   - Put the strongest recent work first.
   - Use quantified bullets with action, technical scope, and outcome.
   - Avoid unsupported claims.
   - Escape LaTeX special characters: `%`, `$`, `&`, `_`, `#`.
5. Validate:
   - Balanced `\begin{document}` / `\end{document}`
   - Balanced `itemize` environments
   - No unescaped `%`
   - No non-ASCII unless already needed
   - Mention if no TeX compiler is available.

## Output

Return:
- Changed file path.
- Brief summary of edits.
- Validation performed.
- Any missing data that would improve the resume.
