# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that wraps Augment Code's context engine, exposing it as a `codebase-retrieval` tool for AI assistants. The server uses `FileSystemContext` from `@augmentcode/auggie-sdk` to perform intelligent code retrieval across any project directory.

**Package name**: `auggie-context-engine-mcp`

## Common Commands

```bash
# Install dependencies
bun install

# Development (runs TypeScript directly)
bun run dev

# Build TypeScript to dist/
bun run build

# Type checking
bun run typecheck

# Lint and auto-fix (Biome)
bun run lint

# Run built version
bun run start

# Build and run (test)
bun run test
```

**After writing code, always run:**
```bash
bun run lint && bun run typecheck
```

## Architecture

### Entry Point (`index.ts`)
Single-file MCP server implementation:
- Creates an MCP server using `@modelcontextprotocol/sdk`
- Registers the `codebase-retrieval` tool with Zod schema validation
- Uses `StdioServerTransport` for communication with MCP clients

### Core Flow
1. MCP client calls `codebase-retrieval` with `project_root` and `information_request` parameters
2. Server creates a `FileSystemContext` instance for the specified project directory
3. Calls `context.search(query)` to perform semantic code search
4. **Retry logic**: Retries up to 3 times if the result doesn't contain `"Path:"` marker
5. Returns the last result even if marker not found after all attempts
6. Context is always closed in `finally` block to prevent resource leaks

### Key Implementation Details

**FileSystemContext Usage**:
```typescript
const context = await FileSystemContext.create({
  directory: projectRoot,
});
const results = await context.search(query);
await context.close();
```

**Success Detection**: Results are considered successful when they contain the `"Path:"` marker. This indicates the retrieval found actual code snippets.

**Error Handling**: Errors are caught and returned as formatted error messages rather than throwing, ensuring MCP clients always receive a response.

## Special Logic & Patterns

### Retry Mechanism
The `search()` function implements a retry pattern because Augment's context engine may occasionally return empty results on first attempt. The loop continues until:
- Results contain `"Path:"` (success marker)
- Maximum 3 attempts reached (returns last result regardless)

### Resource Cleanup
`FileSystemContext` requires explicit cleanup via `context.close()`. This is handled in a `finally` block to ensure cleanup even on errors.

## Linter Configuration

Uses Biome with:
- `noExplicitAny: off` - allows `any` type
- Single quotes, 2-space indent, 100 char line width
- Auto-organize imports enabled

## TypeScript Configuration

- Target: ESNext with NodeNext module resolution
- `noUncheckedIndexedAccess: true` - stricter array/object access
- `verbatimModuleSyntax: true` - requires explicit type imports
- Outputs to `dist/` with declarations and source maps

