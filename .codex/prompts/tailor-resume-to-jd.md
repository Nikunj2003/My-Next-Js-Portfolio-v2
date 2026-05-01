---
description: Tailor Nikunj Khitha's resume to a job description using portfolio facts, JD keywords, company research, and ATS best practices
argument-hint: JD="<job description or URL>" [COMPANY=name] [ROLE=title] [OUTPUT=path]
---

Use the jd-tailored-resume skill.

Spawn the resume subagents:
- portfolio_resume_miner
- jd_keyword_analyst
- company_researcher
- resume_practice_researcher
- resume_latex_writer
- resume_score_auditor
- final_resume_reviewer

Job description:
$JD

Company:
$COMPANY

Role:
$ROLE

Output:
$OUTPUT

If no output is provided, create a company/role-specific `.tex` file under `.context/generated-resumes/`.

Requirements:
- Use latest local portfolio facts.
- Extract exact JD keywords and map them to supported experience.
- Research the company through current web sources when company or JD URL is available.
- Research current resume/ATS best practices when needed.
- Keep the resume one page unless the user explicitly says otherwise.
- Produce a score out of 100 and list remaining honest gaps.
- Cite JD/company/research sources used.
