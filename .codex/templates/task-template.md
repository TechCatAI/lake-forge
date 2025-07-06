# Task {{TASK_NUMBER}}: {{SHORT_TITLE}} - {{AGENT_NAME}}

**Agent:** `{{AGENT_NAME}}`
**Agent Persona Source:** `.codex/AGENTS.md`
**Prompt Source:** `.codex/prompts/{{AGENT_NAME}}.md`  
**Task ID:** `task-{{TASK_NUMBER}}`

---

## 🧠 Goal

{{GOAL OR DESIRED OUTCOME}}

- AS ALWAYS, Please reference the following sources for higher level context:
  - `.codex/PRD.md` for Product vision/scope and 
  - `.codex/ARCHITECTURE.md` for Technical implementation guidance.

---

## ✅ Requirements

{{MARKDOWN LISTS AND SUBLISTS OF TASKS REQUIRED TO PERFORM GOAL}}

- Once the primary task is complete and tested (if necessary):
  - “Pass control to the `task_logger` agent. Its job is to append a summary of the task to `.codex/TASK-LOG.json`.”
  - Refer to `.codex/prompts/task_logger.md` for post task-completion logging.

---

## 🔍 Technical Notes

{{MARKDOWN LIST OF ANY CONVENTIONS, BEST PRACTICES, OR IMPORTANT PROJECT RELATED DETAILS TO PASS ON TO DEVELOPER}}

---

## 📁 Output Files

{{MARKDOWN LIST OF ANY AND ALL FILES EXPECTED TO BE UPDATED OR ADDED TO REPO}}

---

## 📝 Prompt Notes

- Refer to `.codex/prompts/{{AGENT_NAME}}.md`, `.codex/PRD.md`, and `.codex/ARCHITECTURE.md` before starting

---

## ✅ Completion Criteria

{{MARKDOWN LIST OF TASK SUCCESS CRITERIA}}

---