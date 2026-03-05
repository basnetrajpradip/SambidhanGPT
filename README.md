# SambidhanGPT

**AI-Powered Legal Document Q&A with PDF Citation Highlighting**

SambidhanGPT is a RAG (Retrieval-Augmented Generation) system that lets users upload Nepali legal PDF documents — such as the Constitution of Nepal 2072 or the Civil Code — and ask natural language questions. Every answer is grounded strictly in the uploaded document, and the exact source passage is highlighted in the embedded PDF viewer.

> **Core principle:** Answers are generated only from the uploaded document. The system never fabricates legal content from model memory.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                FRONTEND (React + Vite + shadcn/ui)              │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────────┐   │
│  │  PDF Viewer  │  │  Chat Interface │  │   Clause Sidebar  │   │
│  │ (react-pdf + │  │ (Q&A + Multi-   │  │  (Auto-extracted  │   │
│  │  highlights) │  │  turn context)  │  │  legal clauses)   │   │
│  └──────────────┘  └─────────────────┘  └───────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST API (axios)
┌──────────────────────────────▼──────────────────────────────────┐
│                     BACKEND (Express.js + TS)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      LangChain Layer                       │ │
│  │  Document Ingestion → Chunking → Embedding → Store         │ │
│  │  Query → Embed → Retrieve → Compress → Gemini 2.5 Flash    │ │
│  │  → Answer + Citation Metadata                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      Drizzle ORM                           │ │
│  │  Schema → Migrations → Type-safe queries                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│               DATA LAYER (PostgreSQL + pgvector)                │
│    documents  |  chunks (VECTOR 3072)  |  conversations         │
│    clauses    |  suggestions           |                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer         | Technology                               |
| ------------- | ---------------------------------------- |
| LLM           | `gemini-2.5-flash` (Google AI Studio)    |
| Embeddings    | `gemini-embedding-001` — 3072 dimensions |
| RAG Framework | LangChain (Node.js)                      |
| Vector Store  | pgvector (PostgreSQL extension)          |
| ORM           | Drizzle ORM + drizzle-kit                |
| Backend       | Express.js (TypeScript)                  |
| Frontend      | React + Vite + shadcn/ui + Tailwind CSS  |
| Database      | PostgreSQL                               |
| PDF Parsing   | pdfjs-dist                               |
| PDF Viewer    | react-pdf                                |
| File Upload   | multer                                   |
| HTTP Client   | axios                                    |

---

## Key Features

- **PDF upload & ingestion** — drag-and-drop upload, automatic chunking (500 tokens / 50 overlap), embedding via `gemini-embedding-001`, and storage in pgvector
- **Natural language Q&A** — multi-turn conversation grounded in the document; never answers from model memory
- **Citation highlighting** — every answer includes `page_number`, `char_offset_start`, and `char_offset_end` so the exact source passage lights up in the PDF viewer
- **Clause extraction** — auto-detects indemnity, termination, liability, payment terms, jurisdiction, amendment, definitions, and penalty clauses
- **Suggested questions** — 5–7 document-specific questions generated after upload to guide exploration

---

## Project Structure

```
sambidhan-gpt/
├── backend/                  # Express.js + TypeScript + Drizzle ORM
│   ├── agents/               # IngestionAgent, RAGAgent, ClauseAgent, SuggestionAgent, CitationAgent
│   ├── api/
│   │   ├── controllers/      # document-controller.ts, chat-controller.ts
│   │   ├── routes/           # document-route.ts, chat-route.ts
│   │   └── services/         # ingestion, retrieval, generation, clause, suggestion services
│   ├── configs/              # DB config, multer upload config
│   ├── db/
│   │   ├── schema/           # Drizzle table definitions (source of truth)
│   │   └── migrations/       # Auto-generated SQL migrations
│   ├── llm/
│   │   ├── chains/           # LangChain RAG, clause, and suggestion chains
│   │   ├── prompts/          # All Gemini prompts (never inlined in controllers)
│   │   └── utils/            # Token counting, chunk compression
│   ├── uploads/pdfs/         # Uploaded PDFs (gitignored)
│   └── utils/                # Logger, response helper, chunk helper
│
└── frontend/                 # React + Vite + shadcn/ui + Tailwind CSS
    └── src/
        ├── components/
        │   ├── PDFViewer/        # react-pdf + highlight annotations
        │   ├── ChatInterface/    # Q&A + multi-turn conversation
        │   ├── ClauseSidebar/    # Auto-extracted legal clauses
        │   └── SuggestionChips/ # Clickable auto-generated questions
        ├── pages/                # HomePage, DocumentPage
        └── services/             # API client, citation agent
```

---

## API Endpoints

| Method | Endpoint                         | Description                                           |
| ------ | -------------------------------- | ----------------------------------------------------- |
| POST   | `/api/documents/upload`          | Upload PDF → triggers ingestion, clauses, suggestions |
| GET    | `/api/documents/:id/clauses`     | Return extracted legal clauses                        |
| GET    | `/api/documents/:id/suggestions` | Return suggested questions                            |
| POST   | `/api/chat`                      | Submit question → answer + citations                  |
| GET    | `/api/conversations/:docId`      | Fetch conversation history                            |
| GET    | `/documents/:id/file`            | Fetch uploaded pdf file                               |

---

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL with the **pgvector** extension enabled
- A [Google AI Studio](https://aistudio.google.com) API key for `gemini-2.5-flash` and `gemini-embedding-001`

### 1. Enable pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Clone & install dependencies

```bash
git clone https://github.com/your-org/SambidhanGPT.git
cd SambidhanGPT

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Configure environment variables

**Backend** — copy and fill in `backend/.env.example`:

```env
GEMINI_API_KEY=            # Google AI Studio API key
DATABASE_URL=              # postgresql://user:pass@host:5432/sambidhan
PORT=3001
CHUNK_SIZE=500             # Tokens per chunk
CHUNK_OVERLAP=50           # Overlap between chunks
TOP_K=5                    # Number of chunks retrieved per query
MAX_CONVERSATION_TURNS=10  # Max turns injected into prompt
EMBEDDING_DIMENSIONS=3072  # Must match gemini-embedding-001 output
```

```bash
cp backend/.env.example backend/.env
# then edit backend/.env with your values
```

**Frontend** — copy and fill in `frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:3001   # Backend base URL
```

```bash
cp frontend/.env.example frontend/.env
# update VITE_API_BASE_URL if your backend runs on a different port
```

### 4. Run database migrations

```bash
cd backend
npx drizzle-kit migrate
```

### 5. Start the development servers

```bash
# Backend (from /backend)
npm run dev

# Frontend (from /frontend — in a separate terminal)
npm run dev
```

The frontend is available at `http://localhost:5173` and the backend API at `http://localhost:3001`.

---

## Drizzle ORM Quick Reference

```bash
# Generate a new migration after schema changes
npx drizzle-kit generate

# Apply pending migrations
npx drizzle-kit migrate

# Open visual DB browser (dev only)
npx drizzle-kit studio
```
