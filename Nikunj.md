# Nikunj Khitha

**Applied AI Engineer at ArmorCode | Agent Systems, MCP Tool Governance & LLM Evaluation | Agents shipped to 8+ business functions · 9 of 14 production MCP servers · Python, Go, TypeScript, Spring AI**

Gurugram, Haryana, India

## Contact

[njkhitha2003@gmail.com](mailto:njkhitha2003@gmail.com) · [LinkedIn](https://www.linkedin.com/in/nikunj-khitha/) · [GitHub](https://github.com/Nikunj2003) · [Portfolio](https://nikunj.codenex.dev/)

## Top Skills

Applied AI Engineering · AI Agents · Model Context Protocol (MCP) · LLM Evaluation · RAG

## About

Applied AI Engineer at ArmorCode. I work on the part of AI that starts after the demo: giving agents real tools, real memory, and a way to prove they still work tomorrow.

Most of what I do is measurement. I built ArmorCode's OpenTelemetry-based LLM evaluation platform on Langfuse, which scores 9 AI surfaces — prompts, models, agents, skills, MCP tool calls, and retrieval — against golden datasets, using deterministic checks, scikit-learn classification metrics, Ragas RAG scores, and LLM-as-a-judge graders validated against human labels at Cohen's kappa >= 0.7, enforced as Jenkins CI gates. Every prompt change and model swap now ships on measured accuracy, latency, and cost instead of assertion. The evaluation framework is mine; the Langfuse deployment underneath it is owned by platform DevOps.

I also deliver the tool and context layer those agents run on: 9 of the 14 production MCP servers in our shared enterprise tool registry, with OAuth2/RBAC, tool-level permission tiers, and audit attribution under multi-tenant AppSec constraints where a single authorization slip would leak another customer's vulnerability data. I am the sole maintainer of company-wide model and MCP access on a LiteLLM gateway — scoped API keys, per-model spend budgets, and RBAC-gated distribution to every team's Claude Desktop. Retrieval comes from a tenant-scoped Knowledge Graph RAG layer over 1M+ entities in Neo4j and pgvector.

Day to day this is embedded delivery. I co-build Agentic Office OS with teammates, working with an external business consultant, executives, and teams across QA, Documentation, Technical Support, Customer Success, Sales, Product, and the Office of the CEO to turn ambiguous requirements into agents, skills, MCP integrations, and approval workflows — then staying on through rollout, debugging, enablement, and iteration. Earlier, as an intern, I created the initial Java framework for Anya, ArmorCode's platform agent, and designed and owned its short- and long-term memory layers.

I like the failure modes most. I restored our codebase-search MCP service after 46 consecutive queries returned zero content, isolating a Go output-schema defect and a client timeout-tier mismatch by reading SDK and host internals, then shipped the fix with a negative-control test and flagged two other connectors carrying the same misconfiguration. On the cost side, I traced 57% of gateway spend across 6,372 requests to two automations and fixed it with a model migration and prompt caching — while naming the deterministic rewrite that would have saved a further ~95%.

Also: Quill, an Electron documentation review app that keeps AI-drafted docs reviewable; and CodeNex, a public Spring AI product with streaming generation and Kubernetes preview environments.

I am targeting Applied AI Engineer, Forward Deployed AI Engineer, Agentic AI Engineer, AI Product Engineer, LLM/AI Engineer, and Software Engineer (Applied AI) roles.

**Selected stack:** Python, TypeScript, Go, Java, Spring Boot, Spring AI, Node.js, FastAPI, React, Electron, MCP, Langfuse, Ragas, OpenTelemetry, LangGraph, Neo4j, pgvector, Redis, LiteLLM, Docker, Kubernetes, Jenkins, and AWS.

## Experience

### ArmorCode

#### Associate Software Engineer (Applied AI)

**Dec 2025 - Present · Gurugram, Haryana, India**

##### Agent Quality: Evaluation Infrastructure

- Built ArmorCode's **OpenTelemetry-based LLM evaluation platform on Langfuse**, scoring **9 AI surfaces** — prompts, models, agents, skills, MCP tool calls, and retrieval — against golden datasets, so prompt changes and model swaps ship on measured accuracy, latency, and cost rather than assertion. Deterministic format checks run free on every case; scikit-learn precision/recall/F1 with a minority-class recall floor gates classification workflows; Ragas scores faithfulness and answer relevancy on RAG; and LLM-as-a-judge graders are validated against held-out human labels at **Cohen's kappa >= 0.7** before they are allowed to gate anything. Prompts are versioned and A/B compared on a shared dataset before promotion, multi-step agent runs are traced end to end and scored on task outcome, and the whole suite runs as Jenkins CI gates. The evaluation framework is mine; the Langfuse deployment underneath it is owned by platform DevOps.

##### Agentic Office OS — Shared Internal Platform

The umbrella platform the rest of my work plugs into: fully autonomous, human-triggered, and human-in-the-loop agents and sub-agents, serving the PM, QA, Documentation, Dev, TSE, Customer Success, Sales, and Office-of-the-CEO teams, reachable by the whole org through Slack.

- Co-built Agentic Office OS with teammates, partnering with an external business consultant, executive leadership, managers, and teams across **8+ business functions** to translate ambiguous operational needs into agents, skills, MCP integrations, and approval workflows — then owning discovery, rollout, debugging, enablement, and iteration. This is embedded delivery across internal business functions.
- Wired the connectors below into those agents as their shared tool and context layer — knowledge-graph RAG, the codebase-search MCP, the business-data layer, and the wider MCP registry — so each team's agents answer from the same grounded sources.

##### Agent Tooling: Governed MCP Registry

- Delivered **9 of the 14 production MCP servers** in ArmorCode's shared enterprise tool registry, under multi-tenant AppSec constraints where a single authorization slip leaks another customer's vulnerability data — implementing OAuth2/RBAC, tool-level permission tiers, explicit denial behavior, and audit attribution. Validated one 23-tool integration across three permission tiers with **20/20 authorization checks passing**.
- Sole maintainer of company-wide model and MCP access on a **LiteLLM gateway**: I own the approved model catalog configuration, issue scoped API keys with per-model access and spend budgets for individual agents, automations, and team POCs, and maintain RBAC-gated distribution of internal MCP servers out to employees' Claude Desktop via an `.mcpb` proxy.
- Cut recurring LLM spend after a budget alert by tracing **57%** of gateway cost across **6,372 requests** to two automations, root-causing it to a bulk historical backfill rather than the model itself, then migrating models and splitting system/user prompts to enable Bedrock prompt caching — while documenting that a deterministic regex/JS rewrite of those binary classification tasks would have saved a further **~95%**.

##### Agent Context: Retrieval and Code Intelligence

- Built ArmorCode's tenant-scoped **knowledge-graph RAG** layer over **1M+ entities** — RCAs, test cases, and product documentation — in Neo4j and pgvector, giving Office OS agents grounded product knowledge without cross-tenant leakage. Retrieval is scored on recall@k, MRR, and context precision across five query modes, with a documented mode-per-tool policy.
- Removed most CS and support escalations to engineering by building a **codebase-search MCP service in Go** over **8 product repositories**: an authenticated gateway with request queueing and per-query session isolation, fronting a read-only OpenCode agent that loops against a daily-reindexed local vector index, with **8 specialized agents** and **7 domain skills** for documentation generation, feature-flag cataloging, and tenant-configuration discovery. Only the question and the snippets the agent read ever leave the container.
- Restored that service on two client surfaces after **46 consecutive queries returned zero content**, isolating two independent causes by reading SDK and host internals: a Go output-schema defect that made schema-aware clients discard every answer while a third surface kept working, and a query deadline sized for a longer client timeout tier. Shipped the fix with an isolated reproduction and a negative-control test, verified build/vet/test across nine packages, and flagged latent exposure on two other connectors carrying the same misconfiguration.
- Replaced AWS QuickSight with a self-hosted **enterprise business-data layer**, consolidating **4 production AWS accounts** plus **10+ SaaS sources** — Salesforce, Zendesk, Pendo, Chorus, Vitally, Greenhouse, Loom — into a central S3 lake via cross-account replication, then into a PostgreSQL analytics database and Apache Superset with a **12-table star schema**, Jenkins-scheduled ETL, row-level RBAC, and **19 dashboards** at QuickSight parity. Exposed over MCP, it became the data source behind the TSE, CS, Sales, and Office-of-the-CEO agents.

##### Agent Memory, Execution & Developer Workflows

- Shipped the platform agent memory layer using **Graphiti** temporal knowledge graphs, combining session-scoped context with tenant- and person-level long-term recall for multi-step reasoning workflows.
- Shipped **Quill**, an Electron/React/TypeScript GitHub PR review tool pairing a WYSIWYG documentation editor with an embedded AI agent terminal, per-branch Git worktrees, permission-aware GitHub delivery, tests, and release automation, keeping AI-drafted documentation reviewable rather than blind-published. Quill is an internal release; the documentation-synchronization workflow runs in production.
- Operationalized internal agent execution behind a Go/Gin gateway with request routing, load balancing, task queueing, and observability, running agent workflows on both schedules and pull-request triggers. Designed an OpenAI-compatible LLM proxy in Go serving Gemini CLI, Codex, and Claude Code with provider abstraction, multi-account load balancing, health-aware fallbacks, streaming, and Redis-backed caching.

#### Software Development Intern (Applied AI)

**Jan 2025 - Nov 2025 · Gurugram, Haryana, India**

- Created the initial Java framework for **Anya**, ArmorCode's platform agent; designed and owned its short- and long-term memory layers; established Langfuse evaluation for agent accuracy and memory behavior; and helped migrate **2 of 6** sub-agents from LangChain4j to Spring AI, reimplementing memory and evaluation integrations for the new architecture.
- Owned backend integrations for 5+ security tools, including Black Duck, Snyk, and Checkmarx, on an AppSec platform with 130+ connectors.
- Created AI-assisted integration scaffolding with template engines and AST parsing, reducing boilerplate setup time by 30%.
- Built shared backend service orchestration for MySQL, Elasticsearch, Redis, Kafka, MongoDB, and LocalStack.
- Shipped a reusable Resilience4j HTTP client with failure isolation, configurable backoff, timeout handling, and SSRF protection.

### Xansr Media (AIKO)

#### Software Development Intern (GenAI Specialist)

**Jun 2024 - Dec 2024 · Remote**

- Built Node.js and FastAPI microservices, improving API performance by 40% and reducing deployment time by 42% with Docker and GitHub Actions.
- Engineered Fantasy GPT with RAG, LangGraph, backend APIs, agents, sports-data ETL, and DeepEval quality checks, resolving 98% of complex sports queries.
- Built Python ETL pipelines that collected sports data from multiple sources and ingested it into Microsoft SQL Server for SQL-RAG workflows.
- Contributed to AIKO voice and personalization workflows using Azure Speech SDK, multilingual live commentary, and profile-driven highlight generation for a product presented at IBC 2024.

### Central Electricity Authority, Government of India

#### Software Development Intern

**May 2023 - Jul 2023 · New Delhi, India**

- Integrated National Power Portal data into a renewable-energy dashboard covering 150+ power stations and improved reporting accuracy by 30%.
- Built a secure Java/PostgreSQL file-management system with role-based access control that improved retrieval efficiency by 25% across 5,000+ files.
- Developed a MERN conference-room booking system that cut booking time by 60% and reduced scheduling errors by 40%.

## Selected Projects

### CodeNex: AI Builder

**Full-Stack AI SaaS · Java, Spring Boot, Spring AI, React, TypeScript, SSE, Kubernetes, MinIO, Stripe**

Built a distributed AI code-generation product that turns natural-language prompts into React applications. I designed the backend, streaming architecture, persistent workspaces, Kubernetes preview environments, RBAC, quotas, autoscaling, and subscription foundations.

[Live product](https://www.codenex.dev/) · [GitHub](https://github.com/Nikunj2003/Codenex-backend-v1)

### CodeNex AI API Proxy

**AI Gateway & Infrastructure · Go, Gin, Redis, PostgreSQL, React**

Built an OpenAI-compatible gateway with provider abstraction, multi-account load balancing, health-aware fallbacks, streaming, Redis-backed caching, and operational controls.

[GitHub](https://github.com/Nikunj2003/codenex-ai-api-proxy)

### Serenify

**Full-Stack AI Product · React, TypeScript, Supabase, pgvector, Gemini AI**

Built an open-source AI wellness product with empathetic chat, mood tracking, journaling, guided sessions, crisis-help flows, privacy-aware analytics, and pgvector-backed personalization.

[Live product](https://serenify.codenex.dev/) · [GitHub](https://github.com/Nikunj2003/Serenify)

## Featured Recommendations

1. **CodeNex live product** — lead proof of full-stack AI product engineering.
2. **CodeNex repository** — inspectable backend and platform implementation.
3. **Governed MCP Platform case study** — authorization, ownership boundaries, and production validation.
4. **AI Tooling Reliability case study** — protocol debugging, negative controls, and deployment remediation.
5. **Anya or Agentic Office OS case study** — memory/evaluation architecture or embedded internal delivery.
6. **Quill & Documentation Lifecycle case study** — developer-product and human-review workflow proof.

## Skills

1. Applied AI Engineering
2. AI Agents / Agentic Systems
3. Model Context Protocol (MCP)
4. LLM Evaluation / Langfuse / Ragas
5. RAG / GraphRAG / Knowledge Graphs
6. Python
7. Agent Memory
8. Go / Gin
9. TypeScript / Node.js
10. Spring AI / Java
11. AI Product Engineering
12. Neo4j / PostgreSQL / pgvector / Redis
13. AI Tooling Reliability / Observability
14. OAuth2 / RBAC / Tool Authorization
15. Docker / Kubernetes / AWS / CI/CD

## Honors & Awards

**AI Ninja Award — ArmorCode**  
First recipient of the award, and the youngest award recipient at the company.

## Education

**The NorthCap University**  
Bachelor of Technology in Computer Science Engineering  
Aug 2021 - Jun 2025
