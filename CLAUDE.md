# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run CLI in dev mode
bun run bin/lotion.ts <command>

# Type check
bun x tsc --noEmit

# Run tests
bun test

# Build standalone binary
bun build bin/lotion.ts --compile --outfile dist/lotion
```

## Architecture

### Data Flow

```
CLI (commander) → commands/{init,sync,watch}.ts
                       ↓
              config/loader.ts  (reads ~/.lotion.yaml, validates with Zod)
                       ↓
              sync/engine.ts    (orchestrates sync per target)
              ├── notion/fetcher.ts   (pagination + filter by last_edited_time)
              ├── converter/index.ts  (page → frontmatter + markdown body)
              │   ├── converter/blocks.ts     (recursive block → markdown)
              │   ├── converter/frontmatter.ts
              │   └── converter/properties.ts
              ├── converter/slugify.ts  (title → filename, conflict resolution)
              └── sync/state.ts    (reads/writes .lotion-state.json)
                       ↓
              sync/writer.ts    (writes .md files to output_dir/{target.name}/)
```

### Incremental Sync

`sync/state.ts` persists `{ [pageId]: { last_edited_time, local_path } }` to `{output_dir}/.lotion-state.json`. On each sync, `fetchDatabasePages` adds a `last_edited_time.after` filter using the oldest known timestamp, so only changed pages are fetched and converted. Concurrency is capped at 5 via `p-limit`.

### Notion API v5 Notes

This project uses `@notionhq/client` v5 which maps Notion "databases" to the `dataSources` API:

- Query pages: `client.dataSources.query({ data_source_id })` (not `client.databases.query`)
- Retrieve database: `client.dataSources.retrieve({ data_source_id })`
- Search filter: `{ property: "object", value: "data_source" }` (not `"database"`)

All Notion API calls go through `withRetry()` in `notion/client.ts`, which handles rate limiting with exponential backoff (max 3 retries, starting at 1s).

### Block Converter

`converter/blocks.ts` is a native implementation (no `notion-to-md` dependency). It recursively fetches child blocks via `fetchBlocks()` and stores them on `block._children`. `blocksToMarkdown()` then renders the tree, handling tables as a special case (table rows are rendered by the parent `table` block handler, not individually).
