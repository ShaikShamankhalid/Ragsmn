# RAGForge roadmap and honest status

Legend: DONE = written and syntax-checked; UNTESTED = written but never run against live services; TODO = not started.

## Phase 1 – Foundation
- INFO / WORK selector (default INFO): UNTESTED
- Express API, JSON-file storage: UNTESTED
- Authentication, PostgreSQL, migrations, roles, rate limiting: TODO (INFO currently has no user accounts; do not expose publicly)

## Phase 2 – INFO mode
- Gemini streaming chat (@google/genai), retry before first output, model selector, context, history, delete: UNTESTED
- Attachments: images, PDF, audio, video (inline, 15 MB total), text/CSV/JSON (decoded as text): UNTESTED
- Token usage as reported by Gemini: UNTESTED
- Markdown rendering, code highlighting, copy/regenerate, feedback, voice in/out, DOCX/XLSX/PPTX extraction, upload progress: TODO

## Phase 3-4 – Tokenizer, embeddings, vector DB, RAG, knowledge bases, memory: TODO
## Phase 5 – WORK mode: single-shot generation with static checks, source viewer, ZIP: UNTESTED. Multi-provider, analytics, in-app editor: TODO
## Phase 6 – Sandboxed execution (Docker runner, build/test logs, auto-repair, live preview of generated app): TODO
## Phase 7 – GitHub OAuth, versioning: TODO (push instructions only)
## Phase 8 – Security hardening, analytics, Docker Compose, tests: TODO
