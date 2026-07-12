# AI Portfolio — Chat with an AI Version of Me

A personal portfolio site that replaces the usual "About / Projects / Contact" pages with a **chat interface**. Visitors talk to an AI persona trained on my resume, projects, and skills — it answers in first person as if it *were* me. Ask it something outside my personal data (a tech concept, a coding problem, general trivia) and it transparently switches to a live web search instead of guessing, then cites its sources.

Under the hood, every message is first classified as **"personal"** or **"web"** by a lightweight LLM call, which routes it to either the persona system-prompt or a Google Search augmented prompt.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, `react-markdown`, `react-syntax-highlighter` |
| Backend | Java 17, Spring Boot 3.2 (Web + WebFlux), Gradle |
| AI | Claude (`anthropic/claude-sonnet-4-5`) via the [OpenRouter](https://openrouter.ai) API |
| Web search | Google Custom Search JSON API |
| HTTP client | Spring `WebClient` (reactive, non-blocking, 30s timeout) |
| Logging | SLF4J + Logback, rolling file appender |
| Fonts | Syne (display) + DM Sans (body), via Google Fonts |
| Boilerplate reduction | Lombok, Java `record` types for all DTOs |

No database — the app is entirely stateless on the backend; conversation history is held in React state and replayed with every request.

---

## How It Works

1. User sends a message from the chat UI.
2. **`ChatController`** (`POST /api/chat`) hands it to **`ChatService`**.
3. **`ClaudeService.classifyIntent()`** makes a cheap Claude call (16 max tokens) to label the message `personal` or `web`.
4. - **`personal`** → Claude answers directly using a system prompt built from `PersonaData` (bio, work history, projects, skills, strengths/weaknesses, education, availability, contact info).
   - **`web`** → **`GoogleSearchService`** fetches the top 4 Google results, formats them into the prompt, and Claude is instructed to rephrase them in plain language and cite sources. If search returns nothing, it silently falls back to persona/base knowledge.
5. The response (`reply`, `type`, `sources`) is returned to the frontend, which renders markdown and, for web answers, a "Sources from the web" card with clickable links.

Claude is called through **OpenRouter's OpenAI-compatible endpoint**, not the Anthropic API directly — see `anthropic.api.url` in config.

---

## Project Structure

```
ai-portfolio/
├── frontend/                          # React + Vite SPA
│   ├── index.html
│   ├── vite.config.js                 # dev server + /api proxy
│   └── src/
│       ├── App.jsx                    # layout, welcome message, persona fetch
│       ├── main.jsx
│       ├── components/
│       │   ├── Sidebar.jsx            # avatar, contact links, suggested questions
│       │   ├── MessageBubble.jsx      # markdown rendering + source citations
│       │   ├── TypingIndicator.jsx
│       │   └── ChatInput.jsx          # auto-resizing textarea + send button
│       ├── hooks/
│       │   └── useChat.js             # message state, send/clear logic
│       ├── services/
│       │   └── api.js                 # fetch wrappers for /api/persona, /api/chat
│       └── styles/
│           └── global.css             # CSS custom properties / theme
│
└── backend/                           # Spring Boot 3 app (Gradle)
    ├── build.gradle
    ├── settings.gradle
    ├── gradlew / gradlew.bat
    ├── config/
    │   └── local.properties           # gitignored — real API keys go here
    └── src/main/
        ├── java/com/portfolio/
        │   ├── PortfolioApplication.java
        │   ├── config/
        │   │   ├── CorsConfig.java        # allowed origins for /api/**
        │   │   └── WebClientConfig.java   # shared reactive WebClient bean
        │   ├── controller/
        │   │   └── ChatController.java    # /api/chat, /api/persona, /api/health
        │   ├── model/
        │   │   ├── PersonaData.java       # ⭐ all personal info + system prompt builder
        │   │   └── ChatModels.java        # request/response records
        │   └── service/
        │       ├── ChatService.java       # orchestrates intent → search → Claude
        │       ├── ClaudeService.java     # OpenRouter/Claude calls + intent classifier
        │       └── GoogleSearchService.java
        └── resources/
            ├── application.properties     # ⭐ base config
            └── logback-spring.xml
```

---

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- An [OpenRouter](https://openrouter.ai) API key (for Claude access)
- A [Google Custom Search](https://programmablesearchengine.google.com) API key + Search Engine ID

### 1. Configure secrets

Create `backend/config/local.properties` (already gitignored) with:

```properties
anthropic.api.key=sk-or-your-openrouter-key
google.search.api.key=your-google-api-key
```

`application.properties` imports this file automatically at startup (`spring.config.import=optional:file:./config/local.properties`) — **run the backend from the `backend/` directory** so the relative path resolves.

> ⚠️ The repo currently has a live Google API key and search engine ID hardcoded as defaults in `application.properties`, and a live OpenRouter key sitting in `backend/config/local.properties`. Move all secrets into the gitignored file only, and rotate these keys before pushing this repo anywhere public.

### 2. Run the backend

```bash
cd backend
./gradlew bootRun
# Listens on http://localhost:8081
```

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

> ⚠️ **Known config mismatch:** `vite.config.js` proxies `/api/*` to `http://localhost:8080`, but the backend's `server.port` is `8081`. Update one to match the other before the proxy will work.

### 4. Personalize it

Edit `backend/src/main/java/com/portfolio/model/PersonaData.java` and replace the work history, projects, tech stack, strengths/weaknesses, and education with your own — this is what gets baked into every Claude system prompt.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check → `{ "status": "ok" }` |
| GET | `/api/persona` | Public persona metadata (name, tagline, location, contact links) for the sidebar |
| POST | `/api/chat` | Main chat endpoint |

**`POST /api/chat`**
```json
// Request
{
  "message": "What projects have you built?",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hey! Ask me anything." }
  ]
}

// Response
{
  "reply": "...",
  "type": "personal | web | mixed",
  "sources": [{ "title": "...", "snippet": "...", "url": "..." }]
}
```

---

## Deployment

- **Backend:** `./gradlew build` produces a runnable jar under `backend/build/libs/` — deploy to any JVM host (Railway, Render, EC2, etc.).
- **Frontend:** `npm run build` outputs static assets to `frontend/dist/` — deploy to Vercel, Netlify, or any static host.
- Update `cors.allowed.origins` in `application.properties` to include your production frontend URL.
