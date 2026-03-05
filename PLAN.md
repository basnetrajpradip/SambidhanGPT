# PLAN.md — SambidhanGPT

> AI-Powered Legal Document Question Answering System with Citation Highlighting
> Model: Gemini 2.5 Flash | Stack: React · Vite · shadcn/ui · Tailwind · Express.js · LangChain · Drizzle ORM · pgvector · PostgreSQL

---

## Project Overview

SambidhanGPT is a web-based RAG (Retrieval-Augmented Generation) system that lets users upload Nepali legal PDF documents (e.g., Constitution of Nepal 2072, Civil Code) and ask natural language questions. Every answer is grounded in the actual document and the exact source passage is highlighted in the embedded PDF viewer.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                FRONTEND (React + Vite + shadcn/ui)              │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────────┐  │
│  │  PDF Viewer  │  │  Chat Interface │  │   Clause Sidebar  │  │
│  │ (react-pdf + │  │ (Q&A + Multi-   │  │  (Auto-extracted  │  │
│  │  highlights) │  │  turn context)  │  │  legal clauses)   │  │
│  └──────────────┘  └─────────────────┘  └───────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST API (axios)
┌──────────────────────────────▼──────────────────────────────────┐
│                     BACKEND (Express.js + TS)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      LangChain Layer                       │ │
│  │  Document Ingestion → Chunking → Embedding → Store         │ │
│  │  Query → Embed → Retrieve → Compress → Gemini 2.5 Flash → │ │
│  │  Answer + Citation Metadata                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      Drizzle ORM                           │ │
│  │  Schema → Migrations → Type-safe queries                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│               DATA LAYER (PostgreSQL + pgvector)                │
│    documents | chunks (VECTOR 3072) | conversations             │
│    clauses | suggestions                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer         | Technology                                                   |
| ------------- | ------------------------------------------------------------ |
| LLM           | `gemini-2.5-flash` (Google AI Studio — free, no credit card) |
| Embeddings    | `gemini-embedding-001` — 3072 dimensions                     |
| RAG Framework | LangChain (Node.js)                                          |
| Vector Store  | pgvector (PostgreSQL extension)                              |
| ORM           | Drizzle ORM + drizzle-kit                                    |
| Backend       | Express.js (TypeScript)                                      |
| Frontend      | React + Vite + shadcn/ui + Tailwind CSS                      |
| Database      | PostgreSQL                                                   |
| PDF Parsing   | pdfjs-dist                                                   |
| PDF Viewer    | react-pdf                                                    |
| File Upload   | multer                                                       |
| HTTP Client   | axios                                                        |

---

## Development Phases

### Phase 1 — Requirements & Design (Week 1–2)

- [ ] Set up monorepo: `/frontend`, `/backend`
- [ ] Initialize backend: Express + TypeScript + Drizzle ORM
- [ ] Initialize frontend: Vite + React + shadcn/ui + Tailwind
- [ ] Configure PostgreSQL locally with pgvector extension enabled
- [ ] Write Drizzle schema files (`db/schema/*.ts`) and generate initial migration
- [ ] Set up `.env` with `GEMINI_API_KEY`, `DATABASE_URL`
- [ ] Confirm `AGENTS.md` is in repo root and up to date

### Phase 2 — Backend & RAG Pipeline (Week 3–6)

- [ ] `POST /api/documents/upload` — multer PDF upload → IngestionAgent
- [ ] IngestionAgent: `pdfjs-dist` text extraction → LangChain chunking (500 tokens / 50 overlap)
- [ ] Store `char_offset_start` + `char_offset_end` per chunk — critical for citation highlighting
- [ ] Embed chunks via `gemini-embedding-001` (`output_dimensionality: 3072`) → store in pgvector
- [ ] `POST /api/chat` — RAGAgent: embed query → cosine search → compress → Gemini 2.5 Flash → `{ answer, citations[] }`
- [ ] ClauseAgent: spread-sampled chunks → Gemini → extract + store clause types
- [ ] SuggestionAgent: spread-sampled chunks → Gemini → 5–7 suggested questions stored
- [ ] `GET /api/documents/:id/clauses` — return extracted clauses
- [ ] `GET /api/documents/:id/suggestions` — return suggested questions
- [ ] `GET /api/conversations/:docId` — return conversation history
- [ ] Multi-turn conversation: inject last `MAX_CONVERSATION_TURNS` messages into prompt

### Phase 3 — Frontend & Integration (Week 7–9)

- [ ] File upload page — drag-and-drop PDF, upload progress (shadcn components)
- [ ] PDF viewer (`react-pdf`) with highlight annotation layer driven by citation metadata
- [ ] Chat interface — message history, streaming-style response display
- [ ] Suggestion chips rendered after upload (clickable → pre-fills chat input)
- [ ] Clause sidebar — categorized clauses, click to navigate PDF to clause page
- [ ] Citation panel — source list per answer, click highlights PDF region

### Phase 4 — Testing, Refinement & Docs (Week 10–12)

- [ ] Unit tests: chunking, embedding pipeline, citation offset accuracy
- [ ] Integration tests: full RAG pipeline with `Constitution_of_Nepal_2072.pdf`
- [ ] Performance test: query response < 5s under normal load
- [ ] Security: per-user document isolation, uploads not publicly accessible
- [ ] Mobile responsiveness pass (Tailwind breakpoints)
- [ ] Final project report and documentation

---

## Drizzle Schema

### `db/schema/documents.ts`

```ts
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
})
```

### `db/schema/chunks.ts`

```ts
export const chunks = pgTable('chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  pageNumber: integer('page_number'),
  charOffsetStart: integer('char_offset_start'),
  charOffsetEnd: integer('char_offset_end'),
  embedding: vector('embedding', { dimensions: 3072 }), // gemini-embedding-001
})
```

### `db/schema/conversations.ts`

```ts
export const roleEnum = pgEnum('role', ['user', 'assistant'])

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  content: text('content').notNull(),
  citations: jsonb('citations'),
  createdAt: timestamp('created_at').defaultNow(),
})
```

### `db/schema/clauses.ts`

```ts
export const clauseTypeEnum = pgEnum('clause_type', [
  'indemnity',
  'termination',
  'liability',
  'payment_terms',
  'jurisdiction',
  'amendment',
  'definitions',
  'penalties',
])

export const clauses = pgTable('clauses', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  type: clauseTypeEnum('type').notNull(),
  title: text('title'),
  excerpt: text('excerpt').notNull(),
  pageNumber: integer('page_number'),
})
```

### `db/schema/suggestions.ts`

```ts
export const suggestions = pgTable('suggestions', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
})
```

---

## Drizzle CLI Commands

```bash
# After any schema change — generate SQL migration
npx drizzle-kit generate

# Apply pending migrations to DB
npx drizzle-kit migrate

# Visual DB browser (dev only)
npx drizzle-kit studio

# Push schema directly without migration files (local dev only, NEVER in production)
npx drizzle-kit push
```

---

## Key API Endpoints

| Method | Endpoint                         | Agent Triggered                                | Description                             |
| ------ | -------------------------------- | ---------------------------------------------- | --------------------------------------- |
| POST   | `/api/documents/upload`          | IngestionAgent → ClauseAgent + SuggestionAgent | Upload PDF, trigger full ingestion      |
| GET    | `/api/documents/:id/clauses`     | —                                              | Return extracted legal clauses          |
| GET    | `/api/documents/:id/suggestions` | —                                              | Return suggested questions              |
| POST   | `/api/chat`                      | RAGAgent                                       | Submit question, get answer + citations |
| GET    | `/api/conversations/:docId`      | —                                              | Fetch conversation history              |

---

## Gemini 2.5 Flash Prompt Strategy

All prompts live in `llm/prompts/*.ts`. Never inline prompts in controllers.

**Q&A System Prompt:**

```
You are SambidhanGPT, a legal document assistant specialized in Nepali law.
Answer ONLY based on the provided document context. If the answer is not
in the context, say so clearly. Cite relevant clause or article numbers.
Do not hallucinate legal provisions.

Return JSON: { "answer": "...", "citations": [{ "chunk_id": "...", "page": N, "excerpt": "..." }] }
```

**Gemini API Config:**

```ts
{
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0,          // Q&A: determinism over creativity
    maxOutputTokens: 1500,
  }
}
```

---

## Non-Functional Requirements

| Requirement              | Target                                       |
| ------------------------ | -------------------------------------------- |
| Query response time      | < 5 seconds (p95)                            |
| PDF ingestion (10 pages) | < 30 seconds                                 |
| Chunk size               | 500 tokens, 50-token overlap                 |
| Top-k retrieval          | k = 5 chunks                                 |
| Embedding dimensions     | 3072 (gemini-embedding-001)                  |
| Supported file types     | PDF only (v1)                                |
| Security                 | Per-document isolation, no cross-user access |
| Mobile support           | Responsive (Tailwind breakpoints)            |

---

## Milestones

| Week | Milestone                                                             |
| ---- | --------------------------------------------------------------------- |
| 2    | Drizzle schema finalized, migrations generated, dev environment ready |
| 4    | Document ingestion + embedding pipeline working end-to-end            |
| 6    | Full RAG Q&A with citations working via Postman/API tests             |
| 8    | PDF viewer with highlight annotations integrated                      |
| 9    | Clause extraction + suggested questions working in UI                 |
| 10   | System tested with `Constitution_of_Nepal_2072.pdf`                   |
| 12   | Final submission with documentation                                   |
