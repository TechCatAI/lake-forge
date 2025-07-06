This template is used to generate a detailed and comprehensive architecture document from upstream information such as the PRD. Expand on sparse details, infer reasonable structures, and write clearly for developers and technical stakeholders.

Respond in markdown format using the following structure below:

# Architecture Document Template

## 🧱 System Overview
Describe the overarching architecture, highlighting the main components, frameworks, and how they integrate. Fill gaps in the source material with plausible implementation notes.
Text enclosed in angle brackets under certain sections are instructions for you to follow. Do not retain them in the final output.

---

## 📦 Directory Structure (Simplified)
Based on the user's tech stack, provide a concise directory tree that outlines key folders and files. Try to adhere to best practices in organizing project assets. Print an ASCII tree complete with code block formatting and include brief yet descriptive comments to explain each key directory or asset as it pertains to the project.

---

## 🧱 Codex Infrastructure Files Explained
<Do not modify data in this section>
- `AGENTS.md`: Agent roster and prompt responsibilities
- `PRD.md`: Product vision, scope, and goals
- `TASK-LOG.json`: Completed tasks (append-only history)
- `PROPOSED-TASKS.md`: Future or suggested system-generated work
- `ARCHITECTURE.md`: Technical implementation guide and prompt interface contract

---

## 🤖 Agent I/O Conventions
<Do not modify data in this section>
Clarify how agents exchange information using markdown. Mention formatting rules, metadata expectations, and give an example entry for `TASK-LOG.json`.

### Key Conventions
<Do not modify data in this section>
- Markdown format required
- Output should target a single `.codex/` file
- Task Metadata must include agent, task id, date, summary, and output files
### Example: `TASK-LOG.json` Entry
<Do not modify data in this section>
```json
{
  "task_id": "task-999",
  "agent": "frontend_specialist",
  "date": "2025-06-25",
  "summary": "Added support for generating JSON-based task logs and rendering them in dashboard.",
  "output_files": ["apps/techcat-studio/src/app/dashboard/page.tsx"]
}
```
---

## 🧠 Agent Orchestration Principles
<Do not modify data in this section>
- Agents are stateless; they rely on `TASK-LOG.json` for inferred memory
- Prompts are scoped to a single goal
- Agent chaining via `Once complete, invoke task_logger`
- Output is written to `.codex/` and reflected in UI where needed

---

## 💃 Storage & Data Flows

### Markdown-First Architecture
<Do not modify data in this section>
- Local-first by design for `.codex/`
- `.md` files act as both human- and LLM-readable data

### Storage Evolution
Based on tech stack provided in the PRD, determine or infer what storage solution will be used during MVP and post MVP stage of the project. Below is an example of what to return:

```markdown
| Stage    | Mechanism                                                    |
|----------|--------------------------------------------------------------|
| MVP      | Markdown + Airtable                                          |
| Post-MVP | PostgreSQL (structured feedback) + GitHub file sync          |
```

---

## 📡 APIs & External Services

### Used APIs
Identify any APIs or third-party services integrated with the system, such as LLM providers or feedback collectors. Return a markdown list

### Optional Backend
Note optional backend components that can enhance orchestration or data persistence.

---

## 🖥 Frontend Technology Stack
Infer front end technologies from PRD, and present a markdown table with two columns (`Tool`, `Purpose`) summarizing the various frontend tools and what purpose they serve to the project. 

---

## 🔄 File Generation Lifecycle
Illustrate the typical flow from initiating a document request to saving the output. Use a mermaid diagram to convey the sequence of steps.

---

## ✅ Best Practices
Bullet out key principles for maintaining clarity and reliability across agent tasks and documentation.

---

## 🚧 Future Engineering Notes
Conclude with forward-looking considerations or improvements that could refine the architecture over time.

---

Keep your tone confident and polished so the resulting document is ready to share with collaborators. 
IMPORTANT: Remember to keep the structure of this document completely in tact! 
