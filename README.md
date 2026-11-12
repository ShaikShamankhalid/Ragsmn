To run it: unzip, set GEMINI_API_KEY and ANTHROPIC_API_KEY in server/.env (copy from .env.example),
then run npm run install:all and npm run dev. Send me any errors you hit and I’ll fix them.

# RAGForge

RAGForge is an AI platform with two modes, switched by a **[ INFO ] [ WORK ]** selector at the top right.

- **INFO** is a general-purpose assistant powered by Google Gemini. It streams answers, remembers the conversation, and understands attached files.
- **WORK** is a chatbot generator. You describe a chatbot in plain language, and Claude writes a complete React + Express project for it. You can then test it, read the source, change it, and download it as a ZIP.

> Status: early version. See [ROADMAP.md](ROADMAP.md) for what is built and what is not.

---

## 1. Laptop requirements

| Item | Minimum |
|---|---|
| OS | Windows 10/11, macOS, or Linux |
| RAM | 4 GB (8 GB recommended) |
| Disk | About 1 GB free (mostly `node_modules`) |
| CPU | Any modern dual-core processor |
| Software | **Node.js 18 or newer** and npm, plus Git |
| Internet | Required (the AI models run on Google's and Anthropic's servers, not on your laptop) |

No GPU is needed. Check your versions with:

```bash
node -v
npm -v
git --version
```

## 2. API keys you need

| Key | Used for | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | INFO mode | https://aistudio.google.com/apikey |
| `ANTHROPIC_API_KEY` | WORK mode | https://console.anthropic.com |

You can use INFO without the Anthropic key, and WORK without the Gemini key. Both providers may charge for API usage depending on your plan.

## 3. Install and run

```bash
# 1. Get the code
git clone YOUR_GITHUB_REPOSITORY_URL
cd ragforge

# 2. Create your environment file (the server reads server/.env)
cp .env.example server/.env        # Windows (cmd): copy .env.example server\.env

# 3. Open server/.env in a text editor and paste your keys
#    GEMINI_API_KEY=...
#    ANTHROPIC_API_KEY=...

# 4. Install all dependencies
npm run install:all

# 5. Start the app
npm run dev
```

Then open **http://localhost:5173** in your browser.

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

Stop the app with `Ctrl + C`.

### Production build

```bash
npm run build
npm start        # serves the app at http://localhost:4000
```

### Environment variables (`server/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | none | Gemini key for INFO mode |
| `GEMINI_MODELS` | `gemini-2.5-flash,gemini-2.5-pro` | Models shown in the INFO model picker |
| `ANTHROPIC_API_KEY` | none | Claude key for WORK mode |
| `MODEL` | `claude-sonnet-4-6` | Claude model used by WORK mode |
| `PORT` | `4000` | Backend port |

Never commit `server/.env`. It is already listed in `.gitignore`.

## 4. How to use it

### INFO mode (default)
1. Type a question and press **Send**.
2. Optionally click **Attach** (or drag files onto the chat) to add files.
3. Choose a model from the dropdown.
4. Click **Stop** to cancel a response. Past chats appear in the left sidebar, and **×** deletes one.

**Inputs you can give**
- Text questions: general knowledge, coding and debugging, maths, explanations, writing, research help.
- Images (PNG, JPG, WEBP): "Explain this image", "Read the text in this screenshot", "Solve this problem".
- PDF files: "Summarize this", "Extract the key dates".
- Audio and video files (MP3, WAV, MP4, WEBM and similar): "Summarize this recording".
- Text-based files (TXT, CSV, JSON, Markdown).
- Follow-up questions, such as "Explain the second step". The earlier image or file stays in context.

Limits: up to 8 attachments and 15 MB total. DOCX, XLSX and PPTX are not supported yet.

**Output**
- The answer streams in word by word.
- Token counts (input and output) are shown under the chat, as reported by Gemini.
- Conversations are saved on disk in `server/data/`.

### WORK mode
1. Click **WORK**.
2. Describe the chatbot you want, for example:
   *"Create a Gym Trainer chatbot that builds weekly workout plans, explains exercises and tracks goals."*
3. Click **Generate chatbot**. Generation takes about one to two minutes.
4. Use the tabs:
   - **Test the chatbot**: chat with the generated chatbot's system prompt.
   - **Source code**: browse every generated file.
   - **Publish to GitHub**: copy-paste git commands.
5. Type a change in **Change this chatbot** and click **Regenerate with changes** to update it.
6. Click **Download ZIP** to get the full project.

**Output**
- A complete project: React (Vite) frontend, Node.js + Express backend, Claude integration, `package.json` files, `.env.example`, `.gitignore`, and a `README.md`.
- A static check report that lists missing files, unresolved imports, undeclared dependencies, and secret patterns.

### Running a generated project
```bash
unzip your-chatbot.zip
cd your-chatbot
cp .env.example .env      # add your API key
npm run install:all
npm run dev
```

## 5. Publish a generated chatbot to GitHub

```bash
git init
git add .
git commit -m "Initial chatbot application"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| "GEMINI_API_KEY is not set" | Add it to `server/.env`, then restart `npm run dev` |
| Port already in use | Change `PORT` in `server/.env` |
| `npm run install:all` fails | Update Node.js to version 18 or newer |
| Generation fails with a parse error | Click Generate again; model output occasionally needs a retry |
| Generated project has errors | Read the static check list, or use "Regenerate with changes" and paste the error |

## 7. Known limitations

- No user accounts or login. Run it locally only, and do not expose it to the internet.
- Data is stored in JSON files, not in a database.
- The WORK checks are static. Generated projects are **not** built or run inside RAGForge, so test each one yourself.
- The WORK "Test the chatbot" tab tests the generated system prompt, not the generated app itself.
- Not built yet: Markdown/code rendering in chat, voice input/output, DOCX/XLSX/PPTX support, RAG and knowledge bases, vector database, sandboxed execution, GitHub OAuth, analytics.

## 8. Project structure

```
ragforge/
├── client/          React (Vite) frontend: INFO chat and WORK workspace
├── server/          Express API: Gemini chat, project generator, ZIP export
│   ├── index.js     Routes for WORK mode
│   ├── info.js      Routes for INFO mode
│   └── generator.js Prompt, parser and static checks for generated projects
├── ROADMAP.md
└── .env.example
