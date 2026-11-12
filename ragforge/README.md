# RAGForge

Describe a chatbot in plain language. RAGForge asks Claude to write a complete React + Express chatbot project, runs static checks on it, lets you test the chatbot's behavior, view the source, regenerate with changes, and download a GitHub-ready ZIP.

## Setup (Node.js 18+)

    cp .env.example server/.env     # then edit server/.env and set ANTHROPIC_API_KEY
    npm run install:all
    npm run dev                     # UI http://localhost:5173, API http://localhost:4000

Production: `npm run build && npm start` (the API serves the built client on port 4000).

## Notes
- Projects are stored as JSON files in `server/data/` (no database needed). Replace `load`/`save` in `server/index.js` with MongoDB for multi-user persistence.
- The in-app check is static (imports, dependencies, required files, secrets). It does not install, build or run the generated project.
- The live preview exercises the generated chatbot's system prompt through the RAGForge server; it is not the generated app running on its own.
- Generated RAG is a keyword/TF-IDF retriever over `server/knowledge/`; no vector DB is provisioned.
- Generated code can contain bugs. Review it before deploying.
