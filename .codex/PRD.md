# Product Requirements Document (PRD)

## Project Name
TechCat Studio (`techcat-studio`)

## Product Overview
TechCat Studio is an AI-native developer workspace designed to streamline and automate the early and ongoing phases of building software powered by AI agents. It enables developers to define project structure, generate and manage `.codex/` infrastructure files (PRD, TASKS, AGENTS, etc.), and convert user feedback into actionable work.

The tool helps solo builders, indie hackers, and AI-native developers bring structure to project chaos — acting as a launchpad and living system of record for AI-assisted development.

---

## Core Objectives

1. Scaffold infrastructure files using Codex agents from natural language input.
2. Orchestrate multi-agent workflows to generate, refine, and track project documentation and tasks.
3. Use markdown files as the canonical source of truth, optimized for version control and LLM context.
4. Offer a structured UI to manage projects, trigger document workflows, and process feedback.
5. Automate a feedback-to-task pipeline that appends actionable items to `.codex/PROPOSED-TASKS.md`.

---

## Target Users

- AI-native developers
- Solo founders and indie hackers
- Technical product teams and internal tools developers
- Codex / CrewAI / LLMOps enthusiasts

---

## Core Features (MVP)

### 1. UI Framework & Navigation

- Next.js + Tailwind-based SPA with App Router
- Sidebar navigation across key sections:
  - `Dashboard`, `Projects`, `Documents`, `Generate`, `Feedback`, `Settings`

### 2. Project Management

- View and manage all projects in the `Projects` page
- New Project form with:
  - Project name
  - High-level goals
  - Tech stack
- On creation, auto-generates:
  - `.codex/PRD.md`, `.codex/TASK-LOG.json`, `.codex/AGENTS.md`, `.codex/ARCHITECTURE.md`

### 3. Document Generation

- `Generate` page with inputs for:
  - Project selection
  - File type to generate
  - Natural language description of desired output
- Agent-assisted generation of `.md` files (editable, previewable, downloadable)

### 4. Document Management

- `Documents` page for browsing/editing all markdown outputs
- Inline actions: edit, download, regenerate, view diff (future)
- File metadata: author, last modified, size

### 5. Dashboard

- KPI Cards: Total Projects, Generated Files, Feedback Received, Tasks Completed
- Recent Activity log (e.g. file generation, task creation)
- Quick Actions: “New Project”, “Generate Documentation”, “Submit Feedback”

### 6. Feedback System

- `Feedback` page to capture structured or freeform feedback
- Sends entries to Airtable (MVP) → PostgreSQL later
- Optionally parsed by `feedback_interpreter` to propose new tasks

### 7. Task Logging & Tracking

- Completed actions are logged to `.codex/TASK-LOG.json` by `task_logger` agent
- `planner` or other agents can write to `.codex/PROPOSED-TASKS.md`
- Visual dashboard of Active, In-Progress, and Completed tasks (Phase 2+)

---

## Tech Stack (MVP)

| Layer     | Technology                     |
|-----------|--------------------------------|
| Frontend  | Next.js (App Router), React, Tailwind, ShadCN UI |
| Backend   | OpenAI API (via Codex GUI), FastAPI (optional) |
| Storage   | Local `.md` files, Airtable (feedback MVP), PostgreSQL (v2) |
| Infra     | GitHub, Azure App Service, Docker, Vercel (alt option) |

---

## Stretch Goals (Post-MVP)

- GitHub integration: commit `.codex/` files directly
- CrewAI orchestration support
- `.prompt/` template manager with version control
- Agent visualizer and trace debugger
- AI-powered diff viewer with semantic change summaries
- Real-time feedback inbox and alerts
- Team collaboration and file locking

---

## Success Criteria

- Can bootstrap a new project with properly scaffolded `.codex/` directory
- Documents are editable and versioned via the UI
- Users can submit feedback and view it in-app
- Feedback can trigger actionable task generation

---

## Known Constraints

- No user auth or multi-user accounts in v1
- GitHub integration not yet implemented
- Feedback pipeline is partially manual in MVP
- LLM prompt latency may impact response speed

---

## Future Value Propositions (Paid Tiers)

| Feature | Description |
|--------|-------------|
| Prompt Manager | Reuse prompt templates across agents or projects |
| File Diff Viewer | “What changed and why?” powered by LLM |
| Project Metrics | Live stats on progress, usage, task activity |
| Agent History Viewer | See past outputs, revert or fork generations |
| AI QA Agent | Scan `.codex/` files for gaps or hallucinations |
| GitHub Sync | One-click push/pull to connected repo |
| Agent Builder UI | Drag-and-drop to configure agent pipelines |
| Team Mode | Commenting, file locking, workspace permissions |
| Feedback Inbox AI | Prioritize and cluster feedback into task groups |
| Agentic Roadmapping | Suggest next steps based on task logs and docs |

---

### Pricing Structure (Preview)

- **Free Tier**
  - One project
  - Basic file generation
  - Local-only usage

- **Pro Tier**
  - Multi-project support
  - Feedback → task conversion
  - File diff + prompt history tools

- **Team Tier**
  - Collaboration features
  - GitHub sync + CI workflows
  - Agent orchestration pipelines
