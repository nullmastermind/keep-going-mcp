# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides web search and web fetch capabilities for AI assistants. The server uses Claude API for web search and converts HTML content to Markdown for web fetch.

**Package name**: `claude-api-web-search-mcp`

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
- Registers two tools: `web-search` and `web-fetch` with Zod schema validation
- Uses `StdioServerTransport` for communication with MCP clients

### Core Flow

#### Web Search Tool
1. MCP client calls `web-search` with `query` and optional `num_results` parameters
2. Server sends POST request to Claude API endpoint with JSON body
3. Parses response and checks `is_error` field
4. Returns `tool_output` on success or error message on failure
5. 30-second timeout applied to all requests

#### Web Fetch Tool
1. MCP client calls `web-fetch` with `url` parameter
2. Server validates URL format and protocol (http/https only)
3. Fetches HTML content with User-Agent header
4. Converts HTML to Markdown using TurndownService
5. Returns markdown content with metadata
6. 30-second timeout applied to all requests

### Key Implementation Details

**Constants**:
```typescript
const API_ENDPOINT = process.env.WEB_SEARCH_API_ENDPOINT || 'https://customaugment.superclaude.dev/web-search';
const DEFAULT_NUM_RESULTS = 5;
const REQUEST_TIMEOUT_MS = 30000;
```

**Environment Variables**:
- `WEB_SEARCH_API_ENDPOINT` (optional): Override the default web search API endpoint. Defaults to `https://customaugment.superclaude.dev/web-search` if not set.

**Web Search Input Schema**:
```typescript
inputSchema: {
  query: z.string().describe('The search query to send'),
  num_results: z.number().int().min(1).max(10).default(5)
    .describe('Number of results to return (1-10, default: 5)'),
}
```

**Web Fetch Input Schema**:
```typescript
inputSchema: {
  url: z.string().describe('The URL to fetch content from'),
}
```

**Claude API Request**:
```typescript
const response = await fetch(API_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, num_results: numResults }),
  signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
});
```

**Claude API Response Structure** (user-provided, do not modify):
```json
{
  "tool_output": "string - markdown formatted search results",
  "tool_result_message": "string - error message when is_error=true",
  "is_error": "boolean - false for success, true for error",
  "status": "number - status code"
}
```

**Response Parsing**:
- Check `response.ok` for HTTP errors
- Parse JSON response
- Check `is_error` field - if true, throw error with `tool_result_message`
- If false, return `tool_output` as result

**Error Handling**: Errors are caught and returned as formatted JSON error messages with `isError: true` flag, ensuring MCP clients always receive a response.

## Special Logic & Patterns

### Web Search Function
The `webSearch()` function:
- POSTs to Claude API with query and num_results
- Applies 30-second timeout using `AbortSignal.timeout()`
- Checks HTTP status and throws on non-2xx responses
- Checks `is_error` field in response and throws if true
- Returns `tool_output` string directly (already markdown formatted)

### Web Fetch Function
The `fetchHtmlContent()` and `convertHtmlToMarkdown()` functions:
- Validate URL format and protocol before fetching
- Apply 30-second timeout to HTTP requests
- Use User-Agent header to avoid bot blocking
- Remove script, style, noscript, and iframe elements during conversion
- Return structured response with url, status, content, and fetchedAt timestamp

### Input Validation
Zod schemas enforce:
- `query`: required string
- `num_results`: optional integer between 1-10, defaults to 5
- `url`: required string (further validated for format and protocol)

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

## No Authentication Required

The Claude API endpoint does not require API keys or authentication.

## Environment Variables

- `WEB_SEARCH_API_ENDPOINT` (optional): Override the default web search API endpoint. Defaults to `https://customaugment.superclaude.dev/web-search` if not set.

See `.env.example` for configuration options.
