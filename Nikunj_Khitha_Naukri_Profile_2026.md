# Nikunj Khitha — Naukri profile

Prepared on 11 September 2026 from `src/`, `work/`, `Nikunj.md`, and `Nikunj_Khitha_ATS_Resume_2026.tex`, with internet research into Naukri's candidate guidance and recruiter search tools.

**Recommended positioning: Applied AI / Generative AI Engineer building agents, AI products and backend systems with Python, TypeScript, Go and Java.** Your differentiator is combining MCP, RAG and LLM evaluation with delivery of complete workflows, including AI documentation automation with Quill as its TypeScript review app, and CodeNex.

Use the copy blocks below in the corresponding Naukri fields. Instructions, source notes, and fields marked **CONFIRM** are for you; do not paste them into your public profile. This document is a profile draft; no changes have been made to your Naukri account. Better matching and stronger evidence can improve relevant recruiter interest, but cannot guarantee calls.

**Start here:** [Headline](#2-resume-headline) · [Summary](#3-profile-summary) · [Key skills](#4-key-skills) · [Employment](#5-employment) · [IT skills](#6-it-skills) · [Projects](#7-projects) · [Work samples](#work-samples--personal-projects) · [Career preferences](#10-career-preferences-and-recruiter-contact-settings).

Follow-up verification: checked public link responses and extracted text from the local PDF resume. Results and remaining cross-profile fixes are recorded below.

## 1. What to fix first

| Priority | Your pasted profile | Recommended change |
|---|---|---|
| 1 | Resume headline is `.` | Replace it with the recommended headline below. |
| 2 | Employment is empty | Add all four roles, separating the ArmorCode internship from the subsequent engineer role. |
| 3 | Skills include duplicate Agentic AI and AWS Lambda entries | Deduplicate and lead with the AI skills supported by your work. |
| 4 | Summary starts with “Professional Summary” and contains an older business-function count | Paste the concise summary below. |
| 5 | IT skills and projects are empty | Add your actual technical experience and the selected projects below. |
| 6 | Professional links and work samples are empty | Add LinkedIn, GitHub, your portfolio, and your personal products as work samples. |
| 7 | Availability and compensation were not supplied | Complete notice period, salary, preferred locations, and career preferences accurately. |

This priority order is my assessment of your current gaps. Naukri recommends a relevant headline and summary, prioritised key skills, complete employment history, and the supporting IT skills, projects, education, and career-profile sections. Its guidance also makes clear that uploading a resume alone does not complete the profile. [Naukri: Polish Your Resume](https://www.naukri.com/blog/time-to-revisit-your-profile-on-naukri/)

## 2. Resume headline

### Recommended — use this first

```text
Applied AI Engineer at ArmorCode | Generative AI, AI Agents & RAG | Python, Go, TypeScript & Java | MCP, LLM Evaluation & Backend Engineering
```

This highlights your current role, programming stack, and strengths in AI platforms, evaluation and backend engineering. The recommended headline is **141 characters**, including spaces. Naukri's published headline guidance specifies a 250-character limit. [Naukri: Resume Headline Examples](https://www.naukri.com/blog/resume-headline-examples-for-naukri/amp/)

### Alternative — for a deliberate shift toward AI platform/backend openings

```text
Applied AI Engineer | AI Platform & Backend Engineering | Python, Go, TypeScript, Java, Spring Boot, Spring AI | MCP, RAG, LLM Gateways, Langfuse, AWS, Kubernetes
```

Use one headline at a time. Keep “Senior,” “Lead,” and “Architect” out of your designation unless they become your actual role. Your evidence already communicates ownership without those titles.

## 3. Profile summary

### Copy and paste

```text
Applied AI Engineer (SDE 1) at ArmorCode, building production agents, developer tools and backend systems with Python, TypeScript, Go and Java.

Delivered 10+ Model Context Protocol (MCP) servers with OAuth2/RBAC, built tenant-scoped Retrieval-Augmented Generation (RAG) over 1M+ entities in Neo4j and pgvector, and developed LLM evaluation with Langfuse, OpenTelemetry, Ragas and Jenkins CI gates. Co-built Slack-accessible agents and approval workflows.

Built AI documentation automation: Jira completion triggers an agent to create or update GitHub docs and open a PR; reviewers use Quill (Electron/React/TypeScript), and merged changes sync to Zendesk. Built CodeNex with Spring AI and Kubernetes previews. Earlier work includes Anya's Java agent framework and memory, plus Fantasy GPT with Python, LangGraph and SQL-RAG.

Skills: Generative AI, FastAPI, Spring Boot, PostgreSQL, Docker and AWS. Seeking Applied AI, Agentic AI, AI Product and AI Platform/Backend Engineer roles.
```

The summary is **983 characters**, including spaces and paragraph breaks, within a conservative 1,000-character drafting target. I could not verify the current summary cap from an accessible official page; use the live editor's counter if it differs. Do not paste the heading “Professional Summary.”

The opening makes Python, TypeScript, Go and Java visible immediately. The next paragraphs connect those skills to production AI infrastructure, documentation automation with Quill as the review step, and CodeNex. The final paragraph states supporting skills and target roles.

## 4. Key skills

### Recommended first 20, in order

Add these as individual skill tags. Use Naukri's closest standard autocomplete label when available.

1. Generative AI
2. Python
3. TypeScript
4. Agentic AI
5. Large Language Models (LLM)
6. Retrieval-Augmented Generation (RAG)
7. LangGraph
8. LangChain
9. Model Context Protocol (MCP)
10. LLM Evaluation
11. Prompt Engineering
12. FastAPI
13. AWS Bedrock
14. Spring AI
15. Java
16. Spring Boot
17. PostgreSQL
18. Neo4j
19. Langfuse
20. Docker

### Add next if the editor allows more relevant tags

```text
Go, React, Node.js, Kubernetes, Redis, pgvector, Knowledge Graphs, Ragas, OpenTelemetry, LiteLLM, SQL, AWS, Electron
```

This is a priority list, not a claim about Naukri's maximum number of tags. If a long label is unavailable, use its short form, such as `MCP`, `RAG`, or `LLM`; the summary already contains the expanded name. You do not need several near-identical tags for the same concept.

### Clean up the existing list

| Existing entry | Action |
|---|---|
| `Agentic AI` and `Agentic Ai` | Keep one `Agentic AI` tag. |
| `Langgraph` | Standardise to `LangGraph`. |
| `Crewai` | Use `CrewAI` only if space remains and you can discuss your implementation; it is lower priority than your evidenced LangGraph, Spring AI, MCP, and evaluation work. |
| `AWS Lambda` and `AWS Lambda Function` | Keep at most one if you have hands-on implementation experience. It is not a lead skill for this profile. |
| `Amazon Sqs` | Deprioritise; the reviewed sources do not establish a strong personal SQS implementation story. |
| `Microsoft Azure` | Keep as a secondary skill, supported by AIKO's Azure Speech SDK work. Do not relabel that as Azure OpenAI experience. |
| `Kafka`, `Microservices` | Valid backend keywords; keep in relevant employment descriptions or use when targeting backend roles. |

Naukri documents recruiter keyword search and filtering. My inference is to make the same verified role vocabulary easy to find across headline, skills, employment, and projects; this does not establish a particular keyword density or ranking formula. [Naukri: Recruiter Resdex](https://www.naukri.com/blog/recruiter-resdex/)

As a market-language check, Wipro's AI & Automation Engineer posting uses Python, GenAI, agents, LangChain, LangGraph, and RAG. It requires 8–15 years, so it is a vocabulary example, **not an experience-matched vacancy recommendation**. Do not add its other tools just to match it. [Wipro: AI & Automation Engineer](https://careers.wipro.com/job/AI-%26-Automation-Engineer/185848-en_US/)

## 5. Employment

Add roles in reverse chronological order. Use the official employer spelling and designation from your employment documents; the labels below reflect the supplied portfolio. Where an official designation is simply “SDE 1,” retain it and explain the Applied AI focus in the job description.

Your Naukri editor does not allow descriptions for previous employment. Paste the combined ArmorCode description below into the current full-time entry. It includes the relevant earlier ArmorCode work under an explicitly dated internship paragraph. Keep the internship's title and dates as a separate employment record wherever the editor allows those fields.

### ArmorCode — current role

| Field | Value |
|---|---|
| Company | ArmorCode |
| Designation | Applied AI Engineer (SDE 1), subject to official-title check |
| Current employment | Yes |
| Employment type | Full-time — confirm against your contract |
| Dates | December 2025 – Present |
| Location | Gurugram, Haryana, India |
| Current annual salary | **CONFIRM** actual annual CTC and requested fixed/variable breakdown |
| Notice period | **CONFIRM** official notice period |

**Job profile — copy and paste:**

```text
Build production AI systems and developer tools with Python, TypeScript and Go for ArmorCode's enterprise AppSec environment.

- Co-built Agentic Office OS with teammates, translating stakeholder requirements into Slack-accessible AI agents, MCP integrations and human-in-the-loop approval workflows; owned rollout, debugging and enablement.
- Delivered 10+ production MCP servers with OAuth2/RBAC, tool-level permissions and audit attribution. Validated 20/20 authorization checks across three permission tiers for a 23-tool integration.
- Built an OpenTelemetry/Langfuse LLM evaluation platform using golden datasets, deterministic checks, classification metrics, Ragas and human-validated LLM judges, integrated with Jenkins CI gates.
- Built tenant-scoped knowledge-graph RAG over 1M+ entities using Neo4j and pgvector, with retrieval evaluation across five query modes.
- Maintain company-wide model and MCP access through LiteLLM, including scoped API keys and spend budgets. Implemented model migration and AWS Bedrock prompt caching for costly automations.
- Built a Go codebase-search MCP service across eight product repositories and resolved output-schema and client-timeout failures through source-level debugging and regression verification.
- Built AI documentation automation triggered by completed Jira tickets: an agent creates or updates GitHub documentation and opens a PR, the team reviews and edits it through Quill (Electron/React/TypeScript), and merged changes sync to Zendesk. Built Quill as the workflow's review app with an embedded AI agent terminal, per-branch Git worktrees and permission-aware GitHub actions.

Earlier at ArmorCode — Software Development Intern (Applied AI), Jan-Nov 2025:
- Created Anya's initial Java agent framework and owned its short- and long-term memory layers. Set up Langfuse evaluation for agent accuracy and memory behavior.
- Migrated 2 of 6 sub-agents from LangChain4j to Spring AI, reimplementing memory and evaluation integrations.
- Owned integrations for 5+ security tools, including Black Duck, Snyk and Checkmarx, on a platform with 130+ connectors. Built AI-assisted scaffolding with template engines and AST parsing, reducing boilerplate setup time by 30%.

Technologies: Python, TypeScript, Go, Java, Spring Boot, Spring AI, LangChain4j, React, Electron, MCP, Langfuse, Ragas, OpenTelemetry, Neo4j, pgvector, PostgreSQL, LiteLLM, AWS, Jenkins, Jira, GitHub and Zendesk.
```

### ArmorCode — internship

| Field | Value |
|---|---|
| Designation | Software Development Intern (Applied AI) |
| Current employment | No |
| Employment type | Internship, using the closest accurate option in the editor |
| Dates | January 2025 – November 2025 |
| Location | Gurugram, Haryana, India |

The relevant internship achievements are included in the current ArmorCode description above. This previous-employment entry needs only the available company, designation, employment type and date fields.

### Xansr Media (AIKO) — internship

| Field | Value |
|---|---|
| Designation | Software Development Intern (GenAI Specialist) |
| Current employment | No |
| Employment type | Internship |
| Dates | June 2024 – December 2024 |
| Location | Remote |

**Job profile — copy and paste:**

```text
- Built Fantasy GPT with Python, LangGraph, SQL-RAG, backend APIs and DeepEval quality checks for multi-step sports queries.
- Developed Python ETL pipelines to collect sports data from multiple sources and ingest it into Microsoft SQL Server for retrieval workflows.
- Built Node.js and FastAPI microservices and automated delivery using Docker and GitHub Actions.
- Contributed to AIKO's Azure Speech SDK voice workflows, multilingual live commentary and profile-driven highlight generation for a product presented at IBC 2024.

Technologies: Python, LangGraph, RAG, DeepEval, FastAPI, Node.js, Microsoft SQL Server, Azure Speech SDK, Docker and GitHub Actions.
```

### Central Electricity Authority, Government of India — internship

| Field | Value |
|---|---|
| Designation | Software Development Intern |
| Current employment | No |
| Employment type | Internship |
| Dates | May 2023 – July 2023 |
| Location | New Delhi, India |

**Job profile — copy and paste:**

```text
- Integrated National Power Portal data into a renewable-energy dashboard covering 150+ power stations.
- Built a Java/PostgreSQL file-management system with role-based access control for 5,000+ files.
- Developed a MERN conference-room booking system to streamline internal scheduling.

Technologies: Java, PostgreSQL, React, Node.js, Express, MongoDB and role-based access control.
```

### Total experience: enter it carefully

Your first listed non-intern engineer role starts in December 2025: **approximately nine months as of 11 September 2026**, with the exact completed-month value depending on your joining day. The earlier roles are internships, including the January–November 2025 ArmorCode role.

For a field explicitly asking for full-time professional experience excluding internships, use the completed duration of the December 2025 onward role. If Naukri's live field instructions include internships or calculate total experience from the employment entries, follow those instructions and retain the internship labels. I could not verify a universal current Naukri counting rule. Do not describe the span since your first internship as “3+ years of full-time experience.”

## 6. IT skills

The screenshot shows **one skill per saved entry**, with separate fields for **Skill / software name**, **Software version**, **Last used**, and **Experience — Years / Months**. Only the skill name has a required-field asterisk in this screenshot; try leaving unknown optional fields empty instead of inventing values.

### Entries matching the form

Add the first 15 initially. React, Next.js and Electron are additional options for AI product and TypeScript roles. A dash below means **leave blank until known**, not a literal dash to type into the form.

| Skill / software name | Software version | Last used | Experience — Years | Experience — Months |
|---|---|---|---|---|
| Python | — | 2026 | 2 | 3 |
| TypeScript | 5.9.3* | 2026 | 1 | 9 |
| Go | — | 2026 | 1 | 9 |
| Java | — | 2026 | 2 | 0 |
| Spring Boot | — | 2026 | 1 | 9 |
| Spring AI | — | 2026 | 1 | 9 |
| LangGraph | — | 2024 | 0 | 7 |
| FastAPI | — | 2024 | 0 | 7 |
| Langfuse | — | 2026 | 1 | 9 |
| PostgreSQL | — | 2026 | 2 | 0 |
| Neo4j | — | 2026 | 1 | 9 |
| pgvector | — | 2026 | 1 | 9 |
| Docker | — | 2026 | 1 | 9 |
| AWS Bedrock | — | 2026 | 0 | 9 |
| Kubernetes | — | 2026 | 1 | 9 |
| React.js | 19.2.4* | 2026 | 2 | 0 |
| Next.js | 16.2.6* | 2026 | 1 | 9 |
| Electron | — | 2026 | 0 | 9 |

*Versions marked with an asterisk are resolved versions in this portfolio's [package-lock.json](package-lock.json). Enter them only if they reflect versions you personally worked with. They are not inferred versions for Quill, CodeNex, or your employer's systems. Other versions have not been established by the reviewed files. AWS Bedrock is a service; do not put a model name in the software-version field.

### How to enter these estimates

The table gives conservative starting values based on the dated projects and employment records reviewed through **September 2026**. Enter the listed year and month values only after checking them against your own work history. If a value is too high for your actual hands-on use, reduce it; if you used a skill before the documented project period, update it to the earlier verified month.

- **Last used:** the table uses 2026 for skills evidenced in your current role or 2026 products, and 2024 for LangGraph and FastAPI where the dated source evidence is Xansr Media. Change any value if you used that skill more recently.
- **Experience:** report hands-on time with that particular skill. Relevant internship and substantial project work can inform your skill-use history; this is separate from the employment-tenure question. Follow any more specific instruction shown by the live field.
- **Years / Months:** split the estimate into the two boxes. For example, 18 months is **1 year, 6 months**. The supplied values are approximate skill-use durations, not total employment tenure.
- Do not count concurrent projects twice for the same skill or assume continuous use since your first exposure. Different skills can have different durations, and TypeScript experience need not equal your SDE 1 tenure.
- If you do not know a version or duration and the editor accepts an empty field, save the supported skill name and complete the optional details later.

For TypeScript, the estimate uses Quill (the review app within documentation automation), CodeNex, Serenify and this portfolio. For Go, it uses the codebase-search MCP and AI gateway work. For Java/Spring AI, it uses Anya, the sub-agent migration and CodeNex. These are practical estimates from the available dates, not official HR records.

Add Redis, OpenTelemetry, Ragas or LiteLLM next if useful. Keep broad capabilities such as Generative AI, RAG and MCP in Key skills; use concrete languages, frameworks and software in this form.

## 7. Projects

Use Projects for the full employer-work catalog below: 11 ArmorCode entries, two Xansr Media entries and three Central Electricity Authority entries. Section 9 contains all six personal projects from the portfolio. This follows your chosen organisation of the profile. Related implementation work is grouped with its parent project: Quill belongs to documentation automation, execution tooling belongs to Office OS, and backend utilities belong to AppSec integration tooling. Employer case-study or portfolio links stay inside Details of project. Use actual project dates; an employment start date is not automatically a project start date. The source years below are context, not month-level dates to paste into mandatory fields.

### How these entries map to the screenshots

Each project below now has the fields shown in your Naukri form. Paste its first text block into **Details of project** and its second into **Role description**. The role descriptions are all below the visible **250-character** limit; each **Skills used** list is below **500 characters**.

- **Client:** for internal employer work, enter the employer followed by “(Internal)” or “(Internal product)”.
- **Project status:** select **In progress** if you still develop, maintain or extend the scope described. Select **Finished** for a completed contribution or release and enter its actual end month. A deployed project can still be in progress; do not pick Finished simply because it has shipped.
- **Worked from / Worked till:** dates marked † are provisional anchors from dated work records, not confirmed first coding days. Confirm before saving. A ticket's last update does not establish your project end date. Your screenshot requires Worked till when Finished is selected.
- **Project site:** the form labels are Onsite and Offsite. Use the option that matches where you performed the work relative to the project's site; do not infer it from cloud hosting or whether the application is online. Remote Xansr work supports Offsite. For ArmorCode, confirm whether you worked at its office or remotely.
- **Nature of employment:** use Full time for work undertaken in your full-time ArmorCode role. For Xansr Media and CEA projects, use the internship's actual working arrangement and keep the internship employment tag. ArmorCode internship contributions remain explicitly identified.
- **Team size:** leave blank until you know the actual project team size. Owning implementation does not establish a one-person project team. For the documentation system, count the overall project team, not only Quill's developer.
- **Role:** the dropdown choices are not visible in the screenshot. Choose Developer, Software Developer, or the closest equivalent **if offered**; put the precise contribution in Role description. Use your official title in the associated employment entry.
- **Project links:** each Details of project block includes its public links at the end. Paste the entire block into that field; no separate project URL field is needed.

The screenshot's preselected Finished, Offsite and Full time options do not establish those facts for all employer projects.

### Project 1 — LLM Evaluation Platform

| Field | Value |
|---|---|
| Project title | LLM Evaluation Platform |
| Tag with employment/education | Applied AI Engineer (SDE 1) — ArmorCode |
| Client | ArmorCode (Internal) |
| Project status | In progress if you still develop or extend evaluation coverage; Finished only for a completed scope |
| Worked from — year/month | 2026 / July † |
| Worked till — year/month | Actual completion month if Finished; ongoing if In progress |
| Project location | Gurugram, India |
| Project site | Onsite if performed at ArmorCode's office; Offsite if remote — confirm |
| Nature of employment | Full time |
| Team size | Leave blank until confirmed; include the actual evaluation project team |
| Role | Developer or closest equivalent available |
| Skills used | Python, LLM Evaluation, Langfuse, OpenTelemetry, Ragas, scikit-learn, Golden Datasets, LLM-as-a-Judge, Jenkins, CI/CD |

† July 2026 is anchored to [BTA-217](work/BTA/BTA-217.md), created 16 July 2026 for the original model-comparison framework. Confirm the start of the expanded platform scope you are describing; the records do not establish a finished date.

**Details of project — copy and paste:**

```text
Built an LLM evaluation framework on ArmorCode's Langfuse platform to measure prompt, model, agent, tool and retrieval quality. Created golden datasets, deterministic checks, classification metrics, Ragas retrieval scoring and LLM-as-a-judge evaluation validated against human labels. Integrated evaluation into Jenkins CI gates to assess accuracy, latency and cost before changes ship. Owned the evaluation framework; platform DevOps owned the underlying Langfuse deployment.

Case study: https://nikunj.codenex.dev/work/llm-evaluation-platform
```

**Role description — copy and paste (204/250 characters):**

```text
Designed the evaluation framework, curated golden datasets, implemented deterministic and LLM-based scoring, and integrated Jenkins quality gates. Platform DevOps owned the underlying Langfuse deployment.
```

### Project 2 — Governed MCP Tool Registry

| Field | Value |
|---|---|
| Project title | Governed MCP Tool Registry |
| Tag with employment/education | Applied AI Engineer (SDE 1) — ArmorCode; this company project includes earlier internship contributions |
| Client | ArmorCode (Internal) |
| Project status | In progress if you continue integrating and maintaining servers |
| Worked from — year/month | 2025 / November † |
| Worked till — year/month | Ongoing if In progress; actual end month if Finished |
| Project location | Gurugram, India |
| Project site | Onsite if performed at ArmorCode's office; Offsite if remote — confirm |
| Nature of employment | Full time for the current project assignment; retain the earlier internship distinction in employment |
| Team size | Leave blank until actual registry/integration team size is confirmed |
| Role | Developer or closest equivalent available |
| Skills used | Model Context Protocol (MCP), OAuth2, RBAC, LiteLLM, Go, API Integration, Tool Authorization, Audit Logging |

† November 2025 is a provisional delivered-server workstream anchor: [BTA-65](work/BTA/BTA-65.md) was created 4 November and [BTA-78](work/BTA/BTA-78.md) on 28 November. Earlier MCP client experiments do not by themselves establish the start of this server-registry project.

**Details of project — copy and paste:**

```text
Delivered 10+ production Model Context Protocol servers into a shared enterprise registry for agent tool access. Implemented OAuth2/RBAC, tool-level permission tiers, explicit denials and audit attribution. Validated 20/20 authorization checks across three access tiers in a 23-tool integration. Enabled internal tool distribution to business users and resolved a codebase-search failure caused by an output-schema defect and a client-timeout mismatch.

Case study: https://nikunj.codenex.dev/work/governed-mcp-registry
```

**Role description — copy and paste (181/250 characters):**

```text
Built and integrated MCP servers, implemented OAuth2/RBAC and tool-level permissions, validated authorization behavior, and maintained access governance and integration reliability.
```

### Project 3 — Knowledge Graph RAG

| Field | Value |
|---|---|
| Project title | Knowledge Graph RAG |
| Tag with employment/education | Applied AI Engineer (SDE 1) — ArmorCode; the initial POC was during the internship |
| Client | ArmorCode (Internal) |
| Project status | In progress if you continue ingestion, retrieval improvements or evaluation |
| Worked from — year/month | 2025 / September † |
| Worked till — year/month | Ongoing if In progress; actual end month if Finished |
| Project location | Gurugram, India |
| Project site | Onsite if performed at ArmorCode's office; Offsite if remote — confirm |
| Nature of employment | Full time for the current assignment; initial work was during the internship |
| Team size | Leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | Python, Retrieval-Augmented Generation (RAG), Knowledge Graphs, Neo4j, pgvector, PostgreSQL, ETL, Vector Search, Retrieval Evaluation |

† [BTA-35](work/BTA/BTA-35.md), the KG-RAG POC for RCA action items, was created 23 September 2025. This supports a September POC anchor, subject to confirmation of your actual start.

**Details of project — copy and paste:**

```text
Built tenant-scoped knowledge-graph RAG over 1M+ entities using Neo4j and pgvector. Connected product documentation, root-cause analyses and test knowledge to business agents through graph and vector retrieval. Implemented ingestion paths and evaluated retrieval accuracy, ranking quality and context precision across five query modes to ground answers in relevant, tenant-scoped information.

Case study: https://nikunj.codenex.dev/work/knowledge-graph-rag
```

**Role description — copy and paste (170/250 characters):**

```text
Built tenant-scoped graph and vector retrieval, developed ingestion pipelines, and evaluated retrieval accuracy, ranking quality and context precision across query modes.
```

### Project 4 — Fantasy GPT: Sports Intelligence with SQL-RAG

| Field | Value |
|---|---|
| Project title | Fantasy GPT: Sports Intelligence with SQL-RAG |
| Tag with employment/education | Your internship entry at Xansr Media (AIKO) |
| Client | Xansr Media (Internal product) |
| Project status | Finished for your completed internship contribution |
| Worked from — year/month | 2024 / actual project start month within June–December |
| Worked till — year/month | 2024 / actual project end month, no later than December for this internship contribution |
| Project location | Your actual city during the remote internship; leave blank if uncertain |
| Project site | Offsite — the internship is documented as remote |
| Nature of employment | Full time if the internship was full-time; otherwise select the actual arrangement |
| Team size | Leave blank until the product team size is confirmed |
| Role | Developer or closest equivalent available; the employment tag retains Internship |
| Skills used | Python, LangGraph, SQL-RAG, FastAPI, Microsoft SQL Server, ETL, DeepEval, Docker, AI Agents |

Use June–December 2024 only if you worked on Fantasy GPT throughout the internship. The employment dates establish the outer bounds, not the exact project months.

**Details of project — copy and paste:**

```text
Built Fantasy GPT, a sports intelligence system answering cricket questions through multi-step reasoning over live match data. Developed Python and FastAPI backend APIs and LangGraph workflows to plan and chain SQL-RAG queries against Microsoft SQL Server. Built Python ETL pipelines to collect sports data from multiple sources and keep the analytical store updated. Integrated an in-house fine-tuned model for domain-specific reasoning and added DeepEval quality checks to assess generated answers. Owned the retrieval and reasoning system, backend APIs, data pipelines and answer evaluation as a GenAI intern on the product team.

Case study: https://nikunj.codenex.dev/work/fantasy-gpt
```

**Role description — copy and paste (169/250 characters):**

```text
Built Python/FastAPI APIs, LangGraph reasoning workflows, SQL-RAG retrieval, sports-data ETL pipelines and DeepEval quality checks as a GenAI intern on the product team.
```

Use this entry to make your Xansr work visible even though Naukri does not provide a description field for that previous employment entry. The fine-tuned model was an in-house component; the description does not claim you personally trained it. The public case study reports 98% query resolution and answers under 30 seconds; the copy above omits those metrics until their evaluation conditions can be explained, consistent with the evidence notes below.

### Project 5 — AI Documentation Automation with Quill Review

| Field | Value |
|---|---|
| Project title | AI Documentation Automation with Quill Review |
| Tag with employment/education | Applied AI Engineer (SDE 1) — ArmorCode; the initial automation work was during the internship |
| Client | ArmorCode (Internal) |
| Project status | In progress if you continue developing or maintaining the workflow |
| Worked from — year/month | 2025 / July † for the overall documentation automation |
| Worked till — year/month | Ongoing if In progress; actual end month if Finished |
| Project location | Gurugram, India |
| Project site | Onsite if performed at ArmorCode's office; Offsite if remote — confirm |
| Nature of employment | Full time for the current assignment; initial work was during the internship |
| Team size | Actual team for the complete documentation workflow; leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | AI Agents, Python, TypeScript, React, Electron, Jira, GitHub, Zendesk, MCP, n8n, Git, Access Control |

† The work map dates the documentation workstream to July 2025; [BTA-6](work/BTA/BTA-6.md) was created 29 July 2025. Quill was added in 2026. The July anchor describes the broader automation, not the date all current stages or the Quill app existed.

**Details of project — copy and paste:**

```text
Built AI documentation automation that starts when a Jira ticket is completed. An agent gathers ticket and codebase context, creates or updates documentation in GitHub, and opens a pull request. Built Quill, the workflow's TypeScript/React/Electron review app, so the documentation team can inspect rendered changes, edit drafts and approve PRs using a WYSIWYG editor, an embedded agent terminal and isolated Git worktrees. Once the PR merges, the workflow syncs the documentation to Zendesk. Quill provides the human review step within the complete automation.

Case study: https://nikunj.codenex.dev/work/documentation-automation
Quill review app: https://nikunj.codenex.dev/work/quill
```

**Role description — copy and paste (162/250 characters):**

```text
Built the Jira-triggered documentation agent workflow, GitHub PR delivery, Quill review app in TypeScript/React/Electron, and Zendesk synchronization after merge.
```

### Project 6 — Agentic Office OS

| Field | Value |
|---|---|
| Project title | Agentic Office OS |
| Tag with employment/education | Applied AI Engineer (SDE 1) — ArmorCode |
| Client | ArmorCode (Internal) |
| Project status | In progress if you still develop or maintain this scope; otherwise Finished |
| Worked from — year/month | 2025–2026; confirm the actual start year and month |
| Worked till — year/month | Actual end month if Finished; ongoing if In progress |
| Project location | Gurugram, India |
| Project site | Onsite if performed at ArmorCode's office; Offsite if remote — confirm |
| Nature of employment | Full time for the current assignment; retain any earlier internship distinction |
| Team size | Actual project team size — leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | AI Agents, MCP, Slack, Human-in-the-Loop Workflows, Go, Gin, Task Queues, Observability |

Office OS is the umbrella platform. The evaluation, registry, retrieval, documentation and business-data entries describe specific components; do not add their durations together.

**Details of project — copy and paste:**

```text
Co-built ArmorCode's internal agent platform with teammates, translating stakeholder requirements into autonomous, human-triggered and human-in-the-loop workflows accessible through Slack. Connected agents to shared MCP tools, product knowledge and business data. Owned stakeholder discovery, rollout, debugging and enablement. Operationalized internal agent execution through a Go/Gin gateway with routing, load balancing, task queues and observability for scheduled and pull-request-triggered workflows.

Portfolio experience: https://nikunj.codenex.dev/#experience
```

**Role description — copy and paste (164/250 characters):**

```text
Co-built the internal agent platform, translated stakeholder needs into workflows, integrated shared tools and context, and owned rollout, debugging and enablement.
```

### Project 7 — Code Intelligence Gateway

| Field | Value |
|---|---|
| Project title | Code Intelligence Gateway |
| Tag with employment/education | Applied AI Engineer (SDE 1) — ArmorCode |
| Client | ArmorCode (Internal) |
| Project status | In progress if you still develop or maintain this scope; otherwise Finished |
| Worked from — year/month | 2026 / actual start month — confirm |
| Worked till — year/month | Actual end month if Finished; ongoing if In progress |
| Project location | Gurugram, India |
| Project site | Onsite if performed at ArmorCode's office; Offsite if remote — confirm |
| Nature of employment | Full time for the current assignment; retain any earlier internship distinction |
| Team size | Actual project team size — leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | Go, MCP, Docker, AWS ECS, AWS Fargate, Application Load Balancer, Vector Search, Git, Debugging |

**Details of project — copy and paste:**

```text
Built a Go code-search gateway over eight product repositories with authentication, request queueing, per-query session isolation and a read-only agent backed by a local vector index. Designed the production deployment and diagnosed shared-filesystem throughput throttling behind recurring restarts. Moved query data off the shared-volume hot path, made startup non-blocking and coordinated Git synchronization. Also resolved MCP output-schema and client-timeout failures. Platform DevOps implemented infrastructure provisioning against my deployment specification.

Case study: https://nikunj.codenex.dev/work/code-intelligence-gateway
```

**Role description — copy and paste (198/250 characters):**

```text
Designed the Go search service and deployment specification, implemented query isolation and indexing changes, and diagnosed storage and MCP failures. Platform DevOps provisioned the infrastructure.
```

### Project 8 — Enterprise LLM Gateway and Cost Optimization

| Field | Value |
|---|---|
| Project title | Enterprise LLM Gateway and Cost Optimization |
| Tag with employment/education | Applied AI Engineer (SDE 1) — ArmorCode |
| Client | ArmorCode (Internal) |
| Project status | In progress if you still develop or maintain this scope; otherwise Finished |
| Worked from — year/month | Actual start year/month during ArmorCode tenure — confirm |
| Worked till — year/month | Actual end month if Finished; ongoing if In progress |
| Project location | Gurugram, India |
| Project site | Onsite if performed at ArmorCode's office; Offsite if remote — confirm |
| Nature of employment | Full time for the current assignment; retain any earlier internship distinction |
| Team size | Actual project team size — leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | LiteLLM, LLM Gateways, AWS Bedrock, Prompt Caching, API Key Management, RBAC, Cost Analysis, MCP |

This is ArmorCode's enterprise LiteLLM work. The personal Go-based CodeNex AI API Proxy remains a separate Work sample. No dedicated public case study is established for this enterprise gateway.

**Details of project — copy and paste:**

```text
Maintain company-wide model and MCP access through LiteLLM, including the approved model catalog, scoped API keys, per-model access and spend budgets. Distribute permission-controlled internal MCP access to employee clients. Investigated a budget alert across more than 50,000 requests, traced the largest cost concentration to recurring automations and a historical backfill, and implemented model migration and AWS Bedrock prompt caching by separating system and user prompts.

Portfolio experience: https://nikunj.codenex.dev/#experience
```

**Role description — copy and paste (156/250 characters):**

```text
Maintain LiteLLM access governance, model configuration and spend budgets; investigate usage costs and implement model migration and Bedrock prompt caching.
```

### Project 9 — Sentinel Test Generation Agent

| Field | Value |
|---|---|
| Project title | Sentinel Test Generation Agent |
| Tag with employment/education | Applied AI Engineer (SDE 1) — ArmorCode |
| Client | ArmorCode (Internal) |
| Project status | In progress if you still develop or maintain this scope; otherwise Finished |
| Worked from — year/month | 2025–2026; confirm the actual start year and month |
| Worked till — year/month | Actual end month if Finished; ongoing if In progress |
| Project location | Gurugram, India |
| Project site | Onsite if performed at ArmorCode's office; Offsite if remote — confirm |
| Nature of employment | Full time for the current assignment; retain any earlier internship distinction |
| Team size | Actual project team size — leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | Python, AI Agents, MCP, Neo4j, n8n, Jira, AWS Bedrock, Test Generation, Tool Calling |

The public case study explicitly distinguishes delivered generation and upload from planned traceability enforcement and remediation. Do not describe those planned features as shipped.

**Details of project — copy and paste:**

```text
Built an agent that generates test cases from Jira tickets using code-graph context, historical root-cause analyses and the existing test corpus. Implemented parallel tool calls and uploads to the test-management system with folder handling and labels. Fixed parsing and priority-field integration defects and validated an end-to-end run jointly with a QA engineer. Designed a ticket-to-case traceability contract for downstream automation; enforcement of that contract remains planned.

Case study: https://nikunj.codenex.dev/work/sentinel-test-agent
```

**Role description — copy and paste (156/250 characters):**

```text
Built the test-generation agent, grounding tools and test-management integration; fixed data-contract defects and validated generated cases jointly with QA.
```

### Project 10 — Business Data Layer for Agents

| Field | Value |
|---|---|
| Project title | Business Data Layer for Agents |
| Tag with employment/education | Applied AI Engineer (SDE 1) — ArmorCode |
| Client | ArmorCode (Internal) |
| Project status | In progress if you still develop or maintain this scope; otherwise Finished |
| Worked from — year/month | 2026 / actual start month — confirm |
| Worked till — year/month | Actual end month if Finished; ongoing if In progress |
| Project location | Gurugram, India |
| Project site | Onsite if performed at ArmorCode's office; Offsite if remote — confirm |
| Nature of employment | Full time for the current assignment; retain any earlier internship distinction |
| Team size | Actual project team size — leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | Python, PostgreSQL, Apache Superset, AWS S3, FastAPI, ETL, MCP, Docker, Jenkins, Row-Level Security |

**Details of project — copy and paste:**

```text
Built a governed business-data platform consolidating four production environments and more than ten external sources into a central S3 lake, PostgreSQL analytics database and Apache Superset. Designed a 12-table serving schema, region-qualified tenant identities, scheduled ETL and row-level access control. Migrated 19 dashboards to parity with the previous reporting tool and exposed the modeled data through MCP so business agents and dashboards query the same governed sources.

Case study: https://nikunj.codenex.dev/work/bi-platform
```

**Role description — copy and paste (172/250 characters):**

```text
Owned architecture, schema design, ETL, tenant identity, access controls and the MCP interface; delivered the reporting migration and shared data layer for business agents.
```

### Project 11 — Anya Agent Framework and Memory

| Field | Value |
|---|---|
| Project title | Anya Agent Framework and Memory |
| Tag with employment/education | Applied AI Engineer (SDE 1) — ArmorCode; includes earlier internship work |
| Client | ArmorCode (Internal) |
| Project status | In progress if you still develop or maintain this scope; otherwise Finished |
| Worked from — year/month | 2025 / actual start month within January–November for the initial framework |
| Worked till — year/month | Actual end month if Finished; ongoing if In progress |
| Project location | Gurugram, India |
| Project site | Onsite if performed at ArmorCode's office; Offsite if remote — confirm |
| Nature of employment | Full time for the current assignment; retain any earlier internship distinction |
| Team size | Actual project team size — leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | Java, LangChain4j, Spring AI, Langfuse, Agent Memory, Graphiti, Knowledge Graphs, LLM Evaluation |

This entry spans the internship framework and later memory work. Confirm the later memory work belongs to the same project before combining its dates. The description preserves the phases.

**Details of project — copy and paste:**

```text
Created the initial Java framework for Anya, ArmorCode's platform agent, during my internship. Designed and owned short- and long-term memory and established Langfuse evaluation for agent accuracy and memory behavior. Migrated two of six sub-agents from LangChain4j to Spring AI, reimplementing memory and evaluation integrations. Later platform memory work used Graphiti temporal knowledge graphs to combine session context with tenant- and person-level recall.

Portfolio experience: https://nikunj.codenex.dev/#experience
```

**Role description — copy and paste (163/250 characters):**

```text
Built Anya's initial Java agent framework and memory, established evaluation, migrated two sub-agents to Spring AI, and delivered later temporal-graph memory work.
```

### Project 12 — AppSec Integrations and Backend Developer Tooling

| Field | Value |
|---|---|
| Project title | AppSec Integrations and Backend Developer Tooling |
| Tag with employment/education | Applied AI Engineer (SDE 1) — ArmorCode; contribution was during the January–November 2025 internship |
| Client | ArmorCode (Internal) |
| Project status | Finished for your completed internship contribution |
| Worked from — year/month | 2025 / actual start month within January–November |
| Worked till — year/month | 2025 / actual project end month, no later than November |
| Project location | Gurugram, India |
| Project site | Onsite if performed at ArmorCode's office; Offsite if remote — confirm |
| Nature of employment | Full time if the internship was full-time; otherwise your actual arrangement |
| Team size | Actual project team size — leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | Java, API Integration, AST Parsing, Template Engines, Resilience4j, PostgreSQL, MySQL, Redis, Kafka, Elasticsearch, MongoDB, LocalStack |

Grouped backend workstream from the internship. The platform's 130+ connectors are company scope; your documented ownership is 5+ tool integrations.

**Details of project — copy and paste:**

```text
Owned backend integrations for more than five security tools, including Black Duck, Snyk and Checkmarx, on ArmorCode's AppSec platform. Built AI-assisted integration scaffolding using template engines and AST parsing. Developed supporting backend service orchestration for MySQL, Elasticsearch, Redis, Kafka, MongoDB and LocalStack, and a reusable Resilience4j HTTP client with failure isolation, configurable backoff, timeouts and SSRF protection.

Portfolio experience: https://nikunj.codenex.dev/#experience
```

**Role description — copy and paste (157/250 characters):**

```text
Implemented security-tool integrations, automated integration scaffolding, built shared service orchestration and delivered a reusable resilient HTTP client.
```

### Project 13 — AIKO: Voice Sports Companion

| Field | Value |
|---|---|
| Project title | AIKO: Voice Sports Companion |
| Tag with employment/education | Your internship entry at Xansr Media (AIKO) |
| Client | Xansr Media (Internal product) |
| Project status | Finished for your completed internship contribution |
| Worked from — year/month | 2024 / actual project start month within June–December |
| Worked till — year/month | 2024 / actual project end month, no later than December |
| Project location | Your actual city during the remote internship — confirm |
| Project site | Offsite — remote internship |
| Nature of employment | Full time if the internship was full-time; otherwise your actual arrangement |
| Team size | Actual project team size — leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | Python, Node.js, FastAPI, Azure Speech SDK, Voice AI, Personalization, AI Agents, Docker, GitHub Actions |

**Details of project — copy and paste:**

```text
Contributed to AIKO, Xansr Media's personalized voice sports companion, as a GenAI intern. Worked on Azure Speech SDK speech-to-text and text-to-speech workflows, user personalization, live AI-generated commentary in more than 20 languages and profile-driven highlight generation. Helped connect live match context to conversational and catch-up experiences. Built backend microservices and containerized delivery workflows during the internship. The team product was presented at IBC 2024 in Amsterdam.

Case study: https://nikunj.codenex.dev/work/aiko
```

**Role description — copy and paste (144/250 characters):**

```text
Contributed to voice workflows, user personalization, profile-driven highlights and backend services as a GenAI intern on the AIKO product team.
```

### Project 14 — National Renewable Energy Dashboard

| Field | Value |
|---|---|
| Project title | National Renewable Energy Dashboard |
| Tag with employment/education | Your internship entry at Central Electricity Authority |
| Client | Central Electricity Authority (Internal) |
| Project status | Finished for your completed internship contribution |
| Worked from — year/month | 2023 / actual project start month within May–July |
| Worked till — year/month | 2023 / actual project end month, no later than July |
| Project location | New Delhi, India |
| Project site | Onsite if performed at CEA's office; Offsite if remote — confirm |
| Nature of employment | Full time if the internship was full-time; otherwise your actual arrangement |
| Team size | Actual project team size — leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | Data Integration, Data Validation, Reporting, Dashboard Development |

**Details of project — copy and paste:**

```text
Integrated National Power Portal data into a national renewable-energy dashboard covering more than 150 power stations during my internship at the Central Electricity Authority. Worked on data integration and reporting reliability for the public-sector dashboard.

Portfolio experience: https://nikunj.codenex.dev/#experience
```

**Role description — copy and paste (140/250 characters):**

```text
Integrated National Power Portal data into the renewable-energy dashboard and improved data reliability for reporting across power stations.
```

### Project 15 — Secure File Management System

| Field | Value |
|---|---|
| Project title | Secure File Management System |
| Tag with employment/education | Your internship entry at Central Electricity Authority |
| Client | Central Electricity Authority (Internal) |
| Project status | Finished for your completed internship contribution |
| Worked from — year/month | 2023 / actual project start month within May–July |
| Worked till — year/month | 2023 / actual project end month, no later than July |
| Project location | New Delhi, India |
| Project site | Onsite if performed at CEA's office; Offsite if remote — confirm |
| Nature of employment | Full time if the internship was full-time; otherwise your actual arrangement |
| Team size | Actual project team size — leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | Java, PostgreSQL, RBAC, File Management, Backend Development |

**Details of project — copy and paste:**

```text
Built a secure Java and PostgreSQL file-management system during my Central Electricity Authority internship. Implemented role-based access control and file organization and retrieval workflows for more than 5,000 files used in internal operations.

Portfolio experience: https://nikunj.codenex.dev/#experience
```

**Role description — copy and paste (153/250 characters):**

```text
Built the Java/PostgreSQL file-management system, implemented role-based access control and developed internal file organization and retrieval workflows.
```

### Project 16 — Conference Room Booking System

| Field | Value |
|---|---|
| Project title | Conference Room Booking System |
| Tag with employment/education | Your internship entry at Central Electricity Authority |
| Client | Central Electricity Authority (Internal) |
| Project status | Finished for your completed internship contribution |
| Worked from — year/month | 2023 / actual project start month within May–July |
| Worked till — year/month | 2023 / actual project end month, no later than July |
| Project location | New Delhi, India |
| Project site | Onsite if performed at CEA's office; Offsite if remote — confirm |
| Nature of employment | Full time if the internship was full-time; otherwise your actual arrangement |
| Team size | Actual project team size — leave blank until confirmed |
| Role | Developer or closest equivalent available |
| Skills used | MongoDB, Express.js, React, Node.js, MERN Stack, Full-Stack Development |

**Details of project — copy and paste:**

```text
Developed a MERN conference-room booking system during my Central Electricity Authority internship. Built the application to streamline internal room reservations and scheduling, reducing manual coordination and scheduling errors.

Portfolio experience: https://nikunj.codenex.dev/#experience
```

**Role description — copy and paste (124/250 characters):**

```text
Developed the MERN booking application and its reservation and scheduling workflows for internal conference-room management.
```

If the editor requires a choice that cannot be left blank, replace the conditional guidance with your actual value before saving. In particular, project dates, team size and dropdown roles cannot be determined exactly from these screenshots alone.

## 8. Education

| Field | Value |
|---|---|
| Qualification | B.Tech / B.E. |
| Specialisation | Computer Science and Engineering (CSE) |
| Institution | The NorthCap University, Gurugram — select the matching listed institution |
| Course type | Full Time |
| Start year | 2021 |
| Passing year | 2025 |
| Month-level dates, if needed | August 2021 – June 2025 |
| Grade / CGPA | **CONFIRM** from your transcript |

Your existing degree entry is substantially correct. Add Class XII and Class X only using actual board, school, year and marks. No postgraduate degree or doctorate is established by the supplied records.

## 9. Accomplishments, online profiles and work samples

### Online profiles

| Label | URL | Description to paste if requested |
|---|---|---|
| LinkedIn | https://www.linkedin.com/in/nikunj-khitha/ | Applied AI engineering experience, career history and professional updates. |
| GitHub | https://github.com/Nikunj2003 | AI products and backend projects using TypeScript, Python, Go and Java, including CodeNex and an AI API gateway. |
| Portfolio | https://nikunj.codenex.dev/ | Applied AI case studies covering agents, MCP, RAG, evaluation and TypeScript product development with React and Electron. |

### Work samples — personal projects

Use this section for all six personal projects listed in the portfolio. Employer projects and their supporting links are in Section 7. The portfolio website itself remains under Online profiles.

#### Work sample 1 — CodeNex: AI Builder

| Field | Value |
|---|---|
| Title | CodeNex: AI Builder |
| URL | https://www.codenex.dev/ |

**Description — copy and paste:**

```text
Built an AI application builder with React and TypeScript that turns natural-language prompts into React applications. Designed a Spring Boot/Spring AI backend with streamed generation, persistent workspaces and isolated Kubernetes preview environments. Implemented platform capabilities including RBAC, token quotas, autoscaling and subscription billing. Owned the backend, streaming architecture and preview infrastructure.

GitHub: https://github.com/Nikunj2003/Codenex-backend-v1
```

#### Work sample 2 — CodeNex AI API Proxy

| Field | Value |
|---|---|
| Title | CodeNex AI API Proxy |
| URL | https://github.com/Nikunj2003/codenex-ai-api-proxy |

**Description — copy and paste:**

```text
Built an OpenAI-compatible AI gateway in Go and Gin to route model traffic through one API. Implemented provider abstraction, multi-account load balancing, health-aware fallbacks, streaming responses, Redis-backed caching and operational controls. Designed the gateway for reliable access to multiple model providers.
```

#### Work sample 3 — Serenify

| Field | Value |
|---|---|
| Title | Serenify |
| URL | https://serenify.codenex.dev/ |

**Description — copy and paste:**

```text
Built an open-source AI wellness product with React, TypeScript, Supabase and Gemini. Combined empathetic chat, mood tracking, journaling, guided sessions, crisis-help flows and pgvector-backed personalization. Owned product design, frontend experience and AI workflows, with attention to privacy-aware analytics.

GitHub: https://github.com/Nikunj2003/Serenify
```

#### Work sample 4 — Resume Fit — CodeNex

| Field | Value |
|---|---|
| Title | Resume Fit — CodeNex |
| URL | https://github.com/Nikunj2003/Resume-Fit-Codenex |

**Description — copy and paste:**

```text
Built an AI resume analysis and improvement tool using React, TypeScript, Gemini AI, Vercel AI SDK and Recharts. Implemented ATS-style scoring, keyword extraction, guided refinements and visual feedback for iterative resume improvement. Owned product UX, AI workflow design and frontend implementation.
```

#### Work sample 5 — CodeNex Images

| Field | Value |
|---|---|
| Title | CodeNex Images |
| URL | https://github.com/Nikunj2003/codenex-images |

**Description — copy and paste:**

```text
Built an AI image generation and editing workspace using React, TypeScript, Vite, Gemini, Auth0, Node.js and MongoDB. Designed the creation and editing flows, integrated authentication and model interactions, and implemented the full-stack product.
```

#### Work sample 6 — LLaMa MCP Streamlit

| Field | Value |
|---|---|
| Title | LLaMa MCP Streamlit |
| URL | https://github.com/Nikunj2003/LLaMa-MCP-Streamlit |

**Description — copy and paste:**

```text
Built an interactive Python and Streamlit assistant connecting NVIDIA NIM-hosted LLaMA 3.3 70B to Model Context Protocol tools. Implemented the interface and tool integration to demonstrate real-time external tool execution through an LLM assistant.
```

### Public link verification

The recorded checks below cover a subset of the links used across Projects, Work samples and Online profiles. Newly added links are sourced from the local portfolio; this expansion did not repeat availability checks.

These links come from the supplied portfolio. Public availability checks on 11 September 2026 produced the following results:

| Link | Check result |
|---|---|
| Portfolio home | HTTP 200; page text retrieved. |
| LLM Evaluation Platform case study | HTTP 200; response identifies the expected case-study route. |
| Governed MCP Tool Registry case study | HTTP 200; response identifies the expected case-study route. |
| Knowledge Graph RAG case study | HTTP 200; response identifies the expected case-study route. |
| Quill case study | HTTP 200 without authentication. |
| CodeNex live site | HTTP 200; the web tool retrieved the page title but no readable application body. |
| CodeNex backend repository | HTTP 200 without authentication. |
| CodeNex AI API Proxy repository | HTTP 200; repository page text retrieved. |
| GitHub profile | HTTP 200; profile page text retrieved. |
| LinkedIn profile | HTTP 999 to the automated request; browser verification remains necessary. This response does not establish that the profile is missing. |

HTTP checks confirm that the endpoints respond; they do not verify application sign-in, generation flows, page rendering, or every linked asset. No Naukri account access was used.

### Cross-profile consistency fixes

The public portfolio's About section places your current Applied AI Engineer title next to January 2025 onward. Its detailed history correctly separates the January–November 2025 internship and December 2025 onward engineer role. The local [About component](src/components/AboutSection.tsx) deliberately combines the current title with total ArmorCode tenure. To avoid a recruiter interpreting the company tenure as engineer-role tenure, the suggested display is:

```text
Applied AI Engineer (SDE 1)
ArmorCode | Dec 2025 - Present
Previously: Software Development Intern | Jan 2025 - Nov 2025
```

This is a recommended portfolio edit; this task changes only the Naukri guide. [Public portfolio](https://nikunj.codenex.dev/)

Your public GitHub profile also links to `nikunj.tech` and expands MCP as “Model Control Protocol” in a featured-project description. Standardise the portfolio link to `https://nikunj.codenex.dev/` and use **Model Context Protocol** when next updating that profile. The Naukri copy already uses these forms. [GitHub profile](https://github.com/Nikunj2003)

### Award

If the editor provides an awards/achievements field, use:

```text
AI Ninja Award — ArmorCode
First-ever recipient of ArmorCode's AI Ninja Award, presented at a company-wide global forum.
```

Award date: **CONFIRM**. If there is no awards field, append this short sentence to the current job description:

```text
Received ArmorCode's AI Ninja Award as its first-ever recipient.
```

Do not put the award in Certifications. No verified certifications, patents, research publications, or personally delivered public presentations were identified in the reviewed materials. Leave those categories empty unless you have the corresponding record and link. AIKO being presented at IBC 2024 does not by itself establish that you were the presenter.

## 10. Career preferences and recruiter contact settings

These are recommended choices, not verified current Naukri dropdown labels. Select the closest accurate option in the live editor.

| Setting | Recommended value or action |
|---|---|
| Current location | Gurugram / Gurgaon, Haryana, India |
| Primary desired role | Applied AI Engineer / Generative AI Engineer |
| Additional desired roles | Agentic AI Engineer, LLM Engineer, AI Product Engineer, AI Platform Engineer, Backend Engineer — AI Systems |
| Additional role to search | Forward Deployed AI Engineer; your internal stakeholder delivery supports the direction, while external customer deployment experience should be described accurately |
| Department / function | Engineering — Software & QA, or the available AI engineering equivalent |
| Role category | AI/ML or software development, according to the live taxonomy and selected role |
| Current employer industry | Software Product / enterprise cybersecurity software, using the closest available category |
| Desired employment | Permanent, full-time, unless your preferences differ |
| Preferred locations | **CONFIRM**; Gurugram/Delhi NCR is a sensible starting point only if you want to work there |
| Relocation / remote | **CONFIRM**; add Bengaluru, Hyderabad, Pune, other cities or remote only if acceptable to you |
| Current annual CTC | **CONFIRM** actual value |
| Expected annual CTC | **CONFIRM** your target; no salary estimate has been inferred |
| Notice period | **CONFIRM** contractual duration and whether you are currently serving it |
| Email | njkhitha2003@gmail.com — verify in Naukri |
| Phone | +91 9540234616 — from the LaTeX resume; verify that it remains your recruiter contact number |
| Recruiter visibility and communication | Check that your profile is searchable and desired recruiter communications are enabled in your account settings |

Availability is material: Naukri documents recruiter searches for notice period, including candidates already serving notice. Its recruiter screening tools also expose experience, salary, location, skills and current company. Accurate structured fields therefore matter alongside good prose. [Naukri: Notice Period Search](https://recruiterzone.naukri.com/hire-faster-with-notice-period-search/), [Naukri: Applicant Insights](https://recruiterzone.naukri.com/introducing-applicant-insights-now-you-can-screen-better-candidates-faster/)

## 11. Resume upload and ongoing use

Your pasted profile lists `Nikunj.pdf`, uploaded 11 September 2026, with a 2 MB upload limit and PDF/DOC/DOCX/RTF support. Those details come from the interface text you supplied. A recent upload date does not establish that its contents match the current LaTeX source.

Suggested descriptive filename when you next export the aligned resume:

```text
Nikunj_Khitha_Applied_AI_Engineer_Resume.pdf
```

Before replacing the upload, check that the PDF has selectable text, readable type, working professional links, and the same employer names, titles and dates used here. Review parsed fields after upload. Neither a filename nor a third-party “ATS score” is evidence of a guaranteed search boost. This task did not regenerate the PDF or inspect the file already uploaded to Naukri.

### Local PDF comparison completed

The local [Nikunj_Resume.pdf](public/Nikunj_Resume.pdf) is **one page, 39,321 bytes**, comfortably below the supplied 2 MB limit. macOS PDFKit extracted the name, contact information, summary, skills, employment, projects and education. The extraction preserves the separate ArmorCode role dates and agrees with the main content of the LaTeX source. This confirms readable embedded text in that extractor, not Naukri parsing success or visual layout quality.

Before exporting a Naukri-aligned version, reconcile these content differences:

- The local PDF includes 20+ business functions, nine evaluation surfaces, and the broader cost/outage counts discussed in the evidence notes. The Naukri draft deliberately avoids the unreconciled counts.
- The PDF places the AI proxy and later Graphiti memory work in the internship section. Confirm the actual delivery dates before carrying that grouping into Naukri.
- The CEA internship is omitted from the one-page PDF but supported by the longer portfolio. Keeping it in Naukri's fuller employment history is appropriate; the shorter resume need not reproduce every entry.
- Contact details and education dates agree with this guide. The uploaded `Nikunj.pdf` remains uninspected and should not be assumed identical to the local file.

The PDF extraction emitted a CoreGraphics diagnostic but completed and returned all sections. No visual rendering or annotation-link audit was performed.

For the first two weeks, use the recommended headline consistently, complete the missing fields, review relevant job alerts, and apply selectively to roles aligned with your experience. Log in regularly, respond promptly, and update facts when they change. Naukri advises keeping profile information updated to appear more regularly in search results; its cited guidance does not establish a magic time of day, a daily punctuation-edit trick, or a guaranteed lift. [Naukri: Communication and Profile Updates](https://www.naukri.com/blog/greater-control-over-communication-from-naukri-com/)

Track outcomes using whichever activity metrics your account exposes:

| Week | Search appearances | Profile views / recruiter actions | Relevant recruiter contacts | Interviews | Profile changes |
|---|---|---|---|---|---|
| Baseline | | | | | Existing profile |
| Week 1 | | | | | Completed profile |
| Week 2 | | | | | |

Treat changes as directional evidence; this is not a controlled experiment. If visibility is low, check searchability, role/skill alignment and structured filters. If views increase but relevant contacts do not, review the opening summary, employment evidence, experience level and availability. If contacts are mainly unrelated backend roles, give the AI terms more prominence before adding more broad technologies.

## 12. Evidence notes and final checks

These notes explain the wording choices and are **not public profile content**.

| Topic | What the sources establish | Decision in this draft |
|---|---|---|
| Business-function count | Pasted Naukri summary says 8+; current `Nikunj.md`, `portfolio.ts` and LaTeX say 20+. The reviewed records do not supply an enumerated, reconciled list. | Use “across business teams.” Add 20+ later if you can explain precisely what is counted and align all documents. |
| MCP scale | Public-facing sources say 10+ delivered production servers; `WORK-MAP.md` lists a 14-server registry. | Use 10+ delivered; registry size is not automatically the number personally built. |
| Evaluation ownership | Portfolio and work map describe a delivered framework; BTA-217 still says In Progress with a narrower original scope. | Use the delivered framework described by the richer sources, retain the DevOps ownership boundary, and avoid the unqualified claim that every change is gated. |
| Evaluation scope | Current portfolio says nine surfaces; the work map enumerates six broader integration surfaces. | Describe the evaluated categories without a numeric total. |
| RAG scale | `Nikunj.md`, portfolio and case study agree on 1M+ entities. | Retain 1M+ **entities**; do not turn this into document count, users or queries. |
| Authorization tests | BTA-281 records 20/20 checks across three access tiers for a 23-tool integration. | Retain, explicitly scoped to that integration rather than the entire registry. |
| Cost incident | BTA-226 supports two workflows accounting for 57% of spend; newer prose broadens this to 50,000+ requests and 10+ automations. It describes approximately 95% savings as an unshipped rewrite estimate. | Describe the shipped model migration and caching without a savings percentage or unreconciled request count. |
| MCP outage | BTA-304 verifies schema/timeout debugging and the fix; its recorded sample is 46 calls, and explicit follow-ups name two other connectors. Broader prose says 100+ failures and 14 exposed connectors. | Retain the debugging story without those broader counts. |
| Internship project timing | The LaTeX groups some gateway/memory work under the internship, while broader profile narratives place related work later. | Include only the consistently attributed Anya, migration and integration work in the dated internship paragraph within the current ArmorCode description. |
| Earlier outcome percentages | Portfolio claims include 98% query resolution, 40% API improvement and 42% faster deployment, but the reviewed profile material does not provide benchmark definitions. | Omit these from the Xansr copy; use them later only with a clear baseline, test set and measurement explanation. The 30% ArmorCode scaffolding claim is retained as a consistently stated portfolio claim, not independently audited. |
| Employment tenure | Internship and full-time roles have separate dates. | Preserve the split; do not inflate full-time experience. |
| Credentials and skill durations | No verified certification metadata, marks, exact project months, or per-tool durations identified. | Leave these for factual completion. |

### Local source trail

- [Portfolio data](src/data/portfolio.ts): identity, employment, skills, projects and award.
- [Case studies](src/data/case-studies.ts): architecture, ownership boundaries, project years and public work-sample paths.
- [Long-form profile](Nikunj.md): career narrative, contact links, education and experience.
- [LaTeX resume](Nikunj_Khitha_ATS_Resume_2026.tex): resume positioning, dates and contact details.
- [Work map](work/WORK-MAP.md): implementation context, ownership distinctions and documentation gaps.
- [BTA-217](work/BTA/BTA-217.md): original evaluation scope and recorded status.
- [BTA-226](work/BTA/BTA-226.md): implemented model migration/caching versus projected rewrite savings.
- [BTA-281](work/BTA/BTA-281.md): permission checks and audit attribution.
- [BTA-304](work/BTA/BTA-304.md): MCP protocol diagnosis, deployment and follow-ups.

Internet research was conducted on 11 September 2026. Several Naukri pages returned HTTP 403 on direct opening; the cited guidance was available through search-indexed excerpts. Older official guidance is used for documented profile/search behaviour, not to assert the exact current UI, undisclosed ranking weights or guaranteed outcomes. Live field limits and dropdown choices take precedence.

### Before saving in Naukri

- [ ] Replace `.` with the recommended headline and paste the summary.
- [ ] Add all employment entries with correct titles and internship labels.
- [ ] Paste the combined ArmorCode description into the current full-time entry, including the dated Jan-Nov 2025 internship paragraph.
- [ ] Fill actual salary, notice period, preferred locations and recruiter contact details.
- [ ] Deduplicate skill tags and enter only truthful IT-skill durations.
- [ ] Fill actual project months/status and add the selected work samples.
- [ ] Verify degree details and any optional grades or credentials.
- [ ] Align the uploaded PDF with the employment dates and claims used here.
- [ ] Preview the saved profile and check for truncation, parsing errors and inaccessible links.
