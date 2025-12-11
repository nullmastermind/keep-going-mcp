# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that wraps Augment Code's context engine, exposing it as a `codebase-retrieval` tool for AI assistants. The server uses the `@augmentcode/auggie-sdk` to perform intelligent code retrieval across any project directory.

**Package name**: `@dccxx/context-engine-mcp`

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
- Creates an MCP server using `@modelcontextprotocol/sdk`
- Registers a single tool: `codebase-retrieval`
- Uses `StdioServerTransport` for communication with MCP clients

### Core Flow
1. MCP client calls `codebase-retrieval` with `project_root` and `information_request`
2. Server creates an Auggie client with the specified `workspaceRoot`
3. Auggie is prompted to call its internal `codebase-retrieval` tool
4. Response is extracted from `tool_call_update` events when output contains "Path:" and "The following code sections were retrieved:"
5. Result is returned to MCP client

### Key Implementation Details

**Auggie Client Configuration** (`index.ts:54-61`):
```typescript
Auggie.create({
  model: 'haiku4.5',
  workspaceRoot: projectRoot,
  allowIndexing: true,
  rules: [join(__dirname, 'rules.md')],
})
```

**Response Detection** (`index.ts:75-81`):
The search function resolves only when the tool output contains specific markers indicating a successful retrieval. This ensures partial or error responses are not returned prematurely.

### Rules File (`rules.md`)
Contains instructions for the internal Auggie agent to:
- Call `codebase-retrieval` immediately without preamble
- Retry up to 3 times if results are empty
- Pass the `information_request` parameter unchanged

### Relay Server (`relay-server.ts`)
**Currently unused** (commented out in `index.ts:107`). This is a development/debugging tool that:
- Proxies requests to `https://{nodeId}.api.augmentcode.com/`
- Simulates streaming responses from `chunks.json` for `/chat-stream` endpoints
- Logs codebase-retrieval request/response bodies

## Linter Configuration

Uses Biome with:
- `noExplicitAny: off` - allows `any` type
- Single quotes, 2-space indent, 100 char line width
- Auto-organize imports enabled

## TypeScript Configuration

- Target: ESNext with NodeNext module resolution
- `noUncheckedIndexedAccess: true` - stricter array/object access
- Outputs to `dist/` with declarations and source maps

