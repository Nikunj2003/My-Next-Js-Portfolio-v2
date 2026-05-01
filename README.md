<div align="center">

# 🌐 Nikunj Khitha - Full-Stack GenAI Engineer Portfolio

Production-grade portfolio for a full-stack GenAI engineer focused on GraphRAG, LightRAG, AI automation, AI gateways, backend systems, and product-grade applications built with TypeScript/Node.js, Go/Gin, Java/Spring, and Python/FastAPI.

Built with **Next.js**, the site combines a polished interactive experience with a recruiter-friendly showcase of enterprise GenAI systems, end-to-end engineering, automation, and product development.

<!-- ![Homepage Screenshot](public/static/home.png) -->

</div>

---

## ✨ Feature Highlights

### 1. 🤖 AI Twin Chatbot Integration
Interactive AI chatbot (`src/components/AITwinChat.tsx`) integrated into the portfolio:
- Floating widget positioned at the bottom-right corner.
- Context-aware responses regarding professional background, skills, and projects.
- Provides a seamless, immediate conversational experience for visitors.

### 2. 🖱️ Fluid Cursor & Canvas Effects
- Custom fluid cursor (`src/components/FluidCursor.tsx`) tracking mouse movement.
- Trailing canvas effect for an engaging interactive micro-interaction.
- Handled via custom hooks (`src/hooks/useFluidCursor`) ensuring highly optimized rendering.

### 3. 🧊 Consistent Glassmorphism & Translucent Design
- Site-wide glassmorphism aesthetic tailored for both light and dark modes.
- Refined warm beige hue for neutral color variables in light mode, complementing brand colors and logos.
- Translucent panels, subtle borders, and backdrop blurs on cards and sidebars.

### 4. 🎬 Advanced Cross-Device Animations
Leveraging **Framer Motion** for highly performant animations:
- 3D Card tilt effects on hover (`src/components/Card3D.tsx`)
- Scroll-triggered reveal animations optimized across mobile, tablet, laptop, and PC hardware.
- Smooth page structure with micro-interaction refinements on project cards and contact sections.

### 5. 🎨 Theming & Refined Colors
- Adaptive Dark / Light themes via `next-themes`.
- Carefully harmonized palettes aligned with personal branding aesthetics.
- Tailwind CSS (v4) for utility-first styling with high performance and Radix UI primitives.

### 6. 💼 Modular Section Architecture
- Reusable modular components: Hero, About, Experience, Projects, Skills, Contact.
- Built via React Server / Client Components, prioritizing maintainability and separation of logic.
- Contact form now posts to a live Next.js API route with server-side validation and Resend-backed inbox delivery.

---

## 🖥️ Technology Stack

- **Next.js (v16)** – App Router, hybrid rendering
- **TypeScript** – Strong type safety & maintainability
- **Tailwind CSS (v4)** – Future-ready, highly optimized utility styling
- **Framer Motion** – Declarative React animations
- **Radix UI components / Shadcn UI** – Accessible unstyled UI primitives
- **Lucide React** – Consistent iconography
- **Zod** – Runtime validation for chat and contact flows
- **Embla Carousel / Recharts** – Specialized UI elements

---

## 🔐 Environment Variables
Create a `.env.local` to securely store keys for the AI Chatbot and Resend-backed contact form.

```bash
# Example environment variables 
# -----------------------------
# Contact / Resend
RESEND_API_KEY=re_your_resend_api_key
CONTACT_EMAIL_FROM="Nikunj Portfolio <contact@portfolio.codenex.dev>"
CONTACT_EMAIL_TO=njkhitha2003@gmail.com,info.portfolio.nikunj@gmail.com

# -----------------------------
# LLM / AI Provider
LLM_API_KEY=your-llm-api-key
LLM_BASE_URL=https://integrate.api.nvidia.com/v1/chat/completions
AI_MODEL=openai/gpt-oss-20b
```

> Never commit real credentials. Configure them in your hosting provider's dashboard (e.g. Vercel) for production.

`CONTACT_EMAIL_TO` supports a comma-separated list if you want contact form emails delivered to multiple inboxes.

To send from a custom address like `contact@portfolio.codenex.dev`, verify that domain/subdomain inside Resend and add the SPF/DKIM DNS records Resend provides.

---

## 🛠️ Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Dev Server
```bash
npm run dev
```
Visit: http://localhost:3000

---

## 🧪 Testing & Linting
```bash
# Run the linter
npm run lint

# Run the unit tests
npm test

# Build for production
npm run build
```

---

## 🤖 Codex Job Hunt Toolkit

This repo includes Codex skills and subagents for resume and job-search workflows:

- `$portfolio-resume-refresh with subagents` refreshes the base one-page ATS LaTeX resume from the latest portfolio facts.
- `$jd-tailored-resume with subagents` rewrites the resume for a specific job description using portfolio facts, JD keywords, company research, and ATS best practices.
- `$resume-scorecard with subagents` scores the resume against a JD without editing.
- `$application-packet with subagents` creates cover letters, recruiter messages, LinkedIn notes, referral asks, and follow-ups.
- `$interview-story-bank with subagents` builds STAR interview stories from verified portfolio and resume facts.
- `$portfolio-fact-gap-audit with subagents` finds missing metrics, links, dates, and evidence that would improve applications.

Detailed instructions live in `.codex/job-hunt/INSTRUCTIONS.md`.

---

## 🧱 Project Structure (Excerpt)
```
src/
	app/            # App Router pages, global layouts, styles
	components/     # Modular UI segments (Hero, Skills, Projects, AITwinChat, etc.)
		ui/           # Reusable atomic base UI components (Shadcn/Radix based)
	hooks/          # Custom hooks (e.g., useFluidCursor)
```

---

## 📄 License
See LICENSE for details.

---

<div align="center">Made with passion & TypeScript ⚡</div>
