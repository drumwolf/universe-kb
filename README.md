# universe-kb

A RAG (Retrieval-Augmented Generation) app for storing and querying fictional universe lore. Upload documents, ask questions in natural language, and get answers grounded strictly in what you uploaded — no hallucinated general knowledge.

Modeled on Claude Projects. Built as a learning vehicle for agentic AI architecture. Developed using an AI-assisted workflow with Claude Code.

**Live demo:** https://universe-kb.vercel.app

**Two modes:**
- **Q&A** — strict grounding; Claude only states facts explicitly present in the documents
- **Generate** — creative mode; Claude uses the documents as a foundation but can speculate, infer, and expand beyond what's written

## Stack

- **Next.js 16** (App Router) — framework
- **PostgreSQL 15 + pgvector** — stores documents, chunks, embeddings, conversations, and messages
- **Voyage AI** (`voyage-3`) — generates 1024-dimensional embeddings for semantic search
- **Claude Sonnet** (`claude-sonnet-4-5`) — agentic chat loop
- **Claude Haiku** (`claude-haiku-4-5-20251001`) — auto-titling
- **Vercel AI SDK v6** — streaming, tool use, UI state

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Required environment variables** (`.env.local`):

```
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=
DATABASE_URL=postgresql://user@localhost/universe_kb
```

---

## How it works

### What makes it agentic

Most RAG implementations are one-shot: the server calls a search function, stuffs the results into a prompt, sends it to Claude, and returns the answer. Claude never makes a decision — the code does.

This app is different. Claude receives the user's message and a set of tools, then autonomously decides:

- Which tool to call (`listDocuments`, `getDocument`, or `searchLore`)
- What arguments to pass
- Whether the result is sufficient or whether to call another tool
- When it has enough context to answer

That multi-step reasoning loop — reason → act → observe → reason again — is the ReAct (Reason + Act) pattern. It's implemented via Vercel AI SDK's `streamText` with `stopWhen: stepCountIs(5)`:

```ts
const result = streamText({
  model: chatModel,
  tools: { listDocuments, getDocument, searchLore },
  stopWhen: stepCountIs(5),
  ...
})
```

The stop condition exists for three reasons: an uncapped loop is a real infinite-loop risk, every step costs tokens, and each tool call adds a round trip of latency the user is waiting on.

### The three tools

Claude decides which tool to call based on two sources of guidance: the system prompt (high-level strategy) and each tool's `description` field (per-tool contract). There is no `if/else` logic controlling tool selection — only natural language instructions that Claude interprets at runtime.

| Tool | When Claude uses it |
|---|---|
| `listDocuments` | Surveying what source material exists before searching |
| `getDocument` | Reading a full document by ID when a targeted search isn't specific enough |
| `searchLore` | Finding specific facts via hybrid search |

### Hybrid search

`searchLore` combines two retrieval strategies rather than using one alone:

**Vector search** converts the query into an embedding and finds chunks whose embeddings are geometrically closest. It catches semantic similarity — "gunslinger" and "outlaw" can match even if neither word appears in the query. But it can dilute results for proper nouns and specific terminology.

**Full-text search** tokenizes and stems words, then matches on exact terms. It's precise for names and places — "Sheriff Callahan" matches exactly. But it misses synonyms and paraphrasing.

Each weakness is the other's strength. Combining them gives both semantic breadth and lexical precision, which matters especially for a lore app where character names and place names are first-class queries.

### Reciprocal Rank Fusion (RRF)

Naively merging two ranked lists doesn't work because the scores aren't comparable — a vector similarity score and a `ts_rank` score are measured in different units. RRF sidesteps this by discarding raw scores and fusing only by **rank position**:

```sql
(1.0 / (60 + v_rank) + 1.0 / (60 + k_rank)) AS rrf_score
```

The constant `60` is a smoothing factor from the original RRF paper. It dampens the dominance of top-ranked results so that a chunk ranked 2nd in both lists can beat a chunk ranked 1st in only one. Chunks appearing in both result sets naturally score higher — which is exactly the behavior you want.

### Vector index (HNSW)

Embedding search requires finding the closest vector out of all stored chunks. The brute-force approach scans every row — fine at small scale, slow as the knowledge base grows.

pgvector's HNSW (Hierarchical Navigable Small World) index solves this with a graph structure that lets search navigate toward the closest match without checking every node — similar to how a highway system lets you skip large distances before switching to local roads. It's approximate (it may occasionally miss the single closest match) but orders of magnitude faster than exhaustive search in practice.

The index is created in migration 001 on `chunks.embedding` using cosine distance, which is what makes `embedding <=> $1::vector` fast.

### Citations

Every chunk returned by `searchLore` or `getDocument` is tracked and surfaced to the user as citations at the end of each response. This turns the app from a black box into a transparent research tool — users can verify any claim against the source document, and authors can trace which document established a given fact before revising or building on it.

---

## Design decisions

### Prompt caching

The system prompt is marked for caching with Anthropic's prompt caching API:

```ts
system: {
  role: 'system',
  content: `...`,
  providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
}
```

The system prompt is sent on every request (HTTP is stateless), but with caching enabled Anthropic's servers store the processed result. Subsequent requests that hit the cache are billed at roughly 10% of normal input token cost. The cache has a 5-minute TTL — as long as requests keep coming in, it stays warm.

### Model selection

The main chat loop uses Claude Sonnet because it needs to reason about tool selection, evaluate search results across multiple steps, and synthesize answers from retrieved context.

Auto-titling uses Claude Haiku. Generating a 4–6 word title from a single message is a trivial task — Sonnet would do it just as well, but at several times the cost. Matching model capability to task complexity is a first-order concern when running AI in production.

### Chunking strategy (`lib/chunk.ts`)

Documents are split into chunks before embedding. Retrieval quality depends on chunks being the right size and capturing complete thoughts — a query can only retrieve what's in a single chunk.

**What we tried first:** The initial implementation split on blank lines and merged short paragraphs until they hit a minimum length. This accidentally produced page-sized chunks because PDF conversion inserted `-- X of Y --` page markers surrounded by blank lines, making each page a single chunk. Page boundaries are layout artifacts, not semantic boundaries.

**What we do now:** Recursive splitting with overlap.

1. Strip PDF artifacts (`-- X of Y --` markers, single-newline line-wrap artifacts)
2. Split the full document on paragraph breaks
3. Any paragraph still over 800 characters gets subdivided at sentence boundaries
4. Pieces are greedily merged into chunks up to 800 characters
5. Each chunk overlaps the next by ~150 characters, so thoughts near a boundary appear in both chunks rather than being lost at the split point

**Key parameters:**
- `CHUNK_SIZE = 800` — roughly 120–150 words, a good unit for retrieval
- `CHUNK_OVERLAP = 150` — ~18% overlap, standard for RAG pipelines
- `MIN_CHUNK_SIZE = 50` — filters out near-empty chunks that would produce low-signal embeddings

**Known limitation:** The sentence splitter uses `.!?` as boundary signals, which breaks on abbreviations (`Mr.`, `U.S.A.`) and decimals. This only triggers on paragraphs over 800 characters, which is rare in narrative prose, so it's deferred.

### Duplicate detection

Uploads are deduplicated via SHA-256 content hash stored in the `documents` table. Re-uploading the same file returns a 409 before any parsing or embedding work is done.

---

## Database schema

| Migration | What it adds |
|---|---|
| 001 | `documents`, `chunks` with `embedding vector(1024)`, HNSW index |
| 002 | `content_hash TEXT UNIQUE` on documents (duplicate detection) |
| 003 | `search_vector tsvector GENERATED ALWAYS` on chunks + GIN index (full-text search) |
| 004 | `conversations` + `messages` (chat history persistence) |
