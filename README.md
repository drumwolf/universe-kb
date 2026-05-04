# universe-kb

A RAG (Retrieval-Augmented Generation) app for storing and querying fictional universe lore. Modeled on Claude Projects — upload documents, then ask questions about them in a chat interface backed by hybrid search and Claude.

## Stack

- **Next.js** — app framework
- **PostgreSQL** — stores documents, chunks, conversations, and messages
- **Voyage AI** — generates embeddings for semantic search
- **pgvector** — vector similarity search
- **Claude (Anthropic)** — answers questions using retrieved context

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Design Decisions

### Chunking strategy (`lib/chunk.ts`)

Documents are split into chunks before embedding. The chunking strategy matters because retrieval quality depends on chunks being the right size and capturing complete thoughts — a query can only retrieve what's in a single chunk.

**What we tried first:** The initial implementation split on blank lines and merged short paragraphs until they hit a minimum length. This accidentally produced page-sized chunks because PDF conversion inserted `-- X of Y --` page markers surrounded by blank lines, making each page a single chunk. Page boundaries are layout artifacts, not semantic boundaries — a page break can fall mid-sentence or mid-argument.

**What we do now:** Recursive splitting with overlap.

1. Strip PDF artifacts (`-- X of Y --` markers, single-newline line-wrap artifacts)
2. Split the full document on paragraph breaks
3. Any paragraph still over 800 characters gets subdivided at sentence boundaries
4. Pieces are greedily merged into chunks up to 800 characters
5. Each chunk overlaps the next by ~150 characters, so thoughts near a boundary appear in both chunks rather than being lost

**Why overlap matters:** Without it, a query about something that happens to fall at a chunk boundary might match neither chunk cleanly. Overlap is a cheap way to hedge against arbitrary split points.

**Key parameters:**
- `CHUNK_SIZE = 800` — roughly 120–150 words, a good unit for retrieval
- `CHUNK_OVERLAP = 150` — ~18% overlap, standard for RAG pipelines
- `MIN_CHUNK_SIZE = 50` — filters out near-empty chunks that would produce low-signal embeddings

**Known limitation:** The sentence splitter uses `.!?` as boundary signals, which breaks on abbreviations (`Mr.`, `U.S.A.`) and decimals. This only triggers on paragraphs over 800 characters, which is rare in narrative prose, so it's deferred.
