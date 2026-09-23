# How the RAG Model Was Built

This document explains how the Retrieval-Augmented Generation (RAG) pipeline in the
AI-Portfolio backend was designed and implemented. It's the mechanism that lets the
"AI twin" chat answer questions about the portfolio owner using only the relevant
slices of their persona data, instead of stuffing the entire résumé into every prompt.

---

## 1. What "RAG" means here

RAG = **Retrieve** the most relevant facts, then **Augment** the LLM prompt with them
so the model **Generates** a grounded answer.

In this project the pipeline is deliberately lightweight:

- **Knowledge base** → hardcoded persona facts in `PersonaData.java`
- **Retriever** → an in-memory **Apache Lucene** index using **BM25** keyword ranking
  (`PersonaRetrievalService.java`)
- **Generator** → an OpenAI-compatible chat completion call
  (`ClaudeService.java` — see the note on naming below)
- **Orchestrator** → `ChatService.java`, which classifies intent, retrieves context,
  and calls the model

There is **no vector database and no embedding model**. Retrieval is lexical (BM25),
which is a good fit for a small, well-worded corpus and keeps the app dependency-free
of any embedding API.

> **Naming note:** The classes are named `ClaudeService` / `AnthropicRequest`, but
> `application.properties` currently points the client at Google Gemini's
> OpenAI-compatible endpoint (`gemini-flash-lite-latest`). The request/response shape
> is OpenAI-style (`choices[].message.content`), so any OpenAI-compatible provider can
> be swapped in via config without touching code.

---

## 2. The knowledge base — `PersonaData.java`

All portfolio knowledge lives as plain Java constants (bio, work history, projects,
tech stack, LeetCode stats, strengths, weaknesses, education, availability, contact,
and a personal-life guidance block).

The key RAG step is `PersonaData.chunks()`, which converts those fields into a list of
small, self-contained **chunks** — the unit of retrieval:

```java
public record Chunk(String id, String category, String text) {}
```

Each chunk gets:
- an **id** (e.g. `bio`, `work-0`, `project-1`, `tech-stack`, `contact`)
- a **category** (human-readable label used when formatting the prompt)
- the **text** to be indexed and potentially injected into the prompt

Chunking one fact per unit is what makes retrieval meaningful: a question about
"databases" can pull only the `tech-stack` chunk rather than the whole profile.

`PersonaData.corePrompt()` holds the fixed identity/style instructions (speak in first
person, be concise, always answer coding questions in Java, etc.). This is *always*
prepended, independent of retrieval.

---

## 3. The retriever — `PersonaRetrievalService.java`

This is the heart of the RAG implementation. It's a Spring `@Service` that builds its
index once at startup and answers queries at request time.

### 3.1 Index construction (`@PostConstruct buildIndex()`)

On application startup:

1. `PersonaData.chunks()` is pulled and cached in a `Map<String, Chunk>` keyed by id
   (so a matched document can be mapped back to its original chunk).
2. A Lucene index is created in a **`ByteBuffersDirectory`** — a purely in-memory index,
   so nothing is written to disk and the index is rebuilt fresh on every boot.
3. Each chunk becomes a Lucene `Document` with three fields:
   - `id` → `StringField` (stored, not tokenized — used as a lookup key)
   - `category` → `StringField` (stored)
   - `text` → `TextField` (tokenized and analyzed — this is what gets searched)
4. A `StandardAnalyzer` tokenizes/normalizes the text (lowercasing, splitting, stop-word
   handling), and an `IndexSearcher` is opened over the finished index.

Lucene's default similarity is **BM25**, so ranking is BM25 out of the box — no extra
configuration needed.

### 3.2 Query time (`retrieve(query, topK)`)

For each incoming question:

1. Blank/null queries short-circuit to an empty list.
2. The query is escaped (`QueryParser.escape`) to neutralize Lucene's special characters,
   then parsed against the `text` field.
3. `searcher.search(query, topK)` returns the top-K scoring documents.
4. Each hit's stored `id` is used to look the original `Chunk` back up from the map.
5. If parsing or search throws, it's logged and an **empty list** is returned (fail-safe,
   never crash the chat).

`ChatService` calls this with `topK = 5`.

### 3.3 Fallback and prompt formatting

- **`defaultChunks()`** — when retrieval finds nothing above zero score (e.g. a bare
  "hi"), the service returns the `bio` + `contact` chunks so the model still has
  something generic to answer with.
- **`formatForPrompt(chunks)`** — turns the chosen chunks into a prompt-ready block:

  ```
  === RELEVANT CONTEXT ABOUT ME ===
  [About] Name: ... Role: ...
  [Tech Stack] Languages: ...
  ```

  Grouping by category gives the LLM clean, labeled context to ground its answer in.

---

## 4. The orchestrator — `ChatService.handleChat()`

This ties retrieval and generation together. For each request:

1. **Classify intent** — `claudeService.classifyIntent(message)` asks the LLM to label
   the message `"personal"` or `"web"` (returns one word). This decides which knowledge
   source to use.
2. **Build context:**
   - `"web"` → call `GoogleSearchService` and format search results as the context block
     (this branch is *not* the persona RAG path).
   - `"personal"` (default) → **the RAG path**: `retrieve(message, 5)`, fall back to
     `defaultChunks()` if empty, then `formatForPrompt(...)`.
3. **Generate** — `claudeService.chat(message, history, contextBlock)` sends the system
   prompt + retrieved context + conversation history + the user message to the model.
4. **Tag response type** — `personal`, `web`, or `mixed` (web intent but no results) and
   return a `ChatResponse` with any sources.

So the persona RAG is what powers every "personal" question; the web-search branch is a
separate, parallel augmentation strategy for general-knowledge questions.

---

## 5. The generator — `ClaudeService.java`

- `buildSystemPrompt(contextBlock)` prepends `PersonaData.corePrompt()` (identity/style)
  to the retrieved context. If the block is web-search results, it appends an
  instruction to cite sources.
- `buildMessageHistory(...)` assembles `[system, ...history, user]` messages.
- `post(...)` sends an OpenAI-style chat completion request via Spring's reactive
  `WebClient` (Bearer auth, JSON body) and reads `choices[].message.content`.
- Errors are caught and turned into a friendly "having trouble connecting" message so the
  UI never sees a raw stack trace.
- `@PostConstruct validateConfig()` fails fast at startup if the API key is missing.

---

## 6. Request flow end-to-end

```
User message
   │
   ▼
ChatController  POST /api/chat
   │
   ▼
ChatService.handleChat()
   │
   ├─ classifyIntent() ── "web" ──► GoogleSearchService.search() ──► format results
   │                                                                     │
   └─ "personal" ──► PersonaRetrievalService.retrieve(msg, 5)            │
                          │  (BM25 over Lucene in-memory index)          │
                          ├─ empty? ──► defaultChunks()                  │
                          └─ formatForPrompt()                           │
                                        │                                │
                                        ▼                                ▼
                              ClaudeService.chat(message, history, contextBlock)
                                        │
                                        ▼
                              OpenAI-compatible LLM (Gemini via config)
                                        │
                                        ▼
                              ChatResponse { reply, type, sources }
```

---

## 7. Dependencies that make it work

From `backend/build.gradle`:

```gradle
implementation 'org.apache.lucene:lucene-core:9.12.3'
implementation 'org.apache.lucene:lucene-queryparser:9.12.3'
implementation 'org.apache.lucene:lucene-analysis-common:9.12.3'
```

- `lucene-core` — the index, documents, BM25 similarity, searcher
- `lucene-queryparser` — parses the raw question into a Lucene `Query`
- `lucene-analysis-common` — `StandardAnalyzer` for tokenization

Plus Spring Boot WebFlux (`WebClient`) for the LLM HTTP calls.

---

## 8. Design choices & trade-offs

- **Lexical (BM25) over vector search** — the corpus is tiny and hand-written, so keyword
  ranking is accurate, instant, and needs no embedding model or vector DB. The trade-off
  is no semantic matching: a question worded with no overlapping keywords may miss, which
  is exactly why `defaultChunks()` exists as a safety net.
- **In-memory index rebuilt at startup** — persona data is static and small, so there's no
  reason to persist the index; a fresh `ByteBuffersDirectory` every boot keeps deployment
  stateless.
- **One fact per chunk** — maximizes retrieval precision and keeps injected context short,
  which lowers token usage and reduces the chance of the model wandering off-topic.
- **Retrieval failures degrade gracefully** — every failure path returns an empty list or
  a friendly message rather than erroring the request.

---

## 9. How to extend it

- **Add knowledge** → edit the constants in `PersonaData.java` and, if you add a new field,
  add a corresponding `Chunk` in `PersonaData.chunks()`. Do not edit the retriever.
- **Tune recall** → change the `topK` passed in `ChatService` (currently `5`).
- **Change the model/provider** → edit `anthropic.api.url` and `anthropic.model` in
  `application.properties`; any OpenAI-compatible endpoint works.
- **Go semantic** → swap the Lucene retriever for an embedding + vector-store retriever
  behind the same `retrieve()` / `formatForPrompt()` interface; the rest of the pipeline
  wouldn't need to change.
