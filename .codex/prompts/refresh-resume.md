---
description: Refresh Nikunj Khitha's base ATS resume from latest portfolio data
argument-hint: [OUTPUT=path] [ONE_PAGE=true]
---

Use the portfolio-resume-refresh skill.

Spawn the resume subagents:
- portfolio_resume_miner
- resume_practice_researcher
- resume_latex_writer
- final_resume_reviewer

Refresh the base resume from the latest local portfolio facts and current ATS best practices.

Defaults:
- Output path: `Nikunj_Khitha_ATS_Resume_2026.tex`
- One page: true

If `OUTPUT` is provided, write there instead.

Validate LaTeX structure, special-character escaping, one-page risk, and source support. Report changed files and any missing data.
