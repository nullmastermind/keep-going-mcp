# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that enhances user prompts using Augment Code's context engine. The server uses `FileSystemContext` from `@augmentcode/auggie-sdk` to search the codebase and then uses `searchAndAsk` to generate enhanced, more specific versions of user prompts.

**Package name**: `auggie-prompt-enhancer-mcp`

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
- Registers the `enhance-prompt` tool with Zod schema validation
- Uses `StdioServerTransport` for communication with MCP clients

### Core Flow
1. MCP client calls `enhance-prompt` with `project_root`, `user_request`, and optional `last_context` parameters
2. Server creates/retrieves a cached `FileSystemContext` instance for the specified project directory
3. Formats last context (if provided) into a context section
4. Builds an enhancement prompt instruction that guides the AI to rewrite the user's request
5. Calls `context.searchAndAsk(userRequest, enhancementPrompt)` to search codebase and enhance the prompt
6. **Retry logic**: Retries up to 3 times if the result doesn't contain `<enhanced-prompt>` tags
7. Parses the enhanced prompt from XML tags using regex
8. Returns the enhanced prompt or original request if parsing fails

### Key Implementation Details

**Input Schema**:
```typescript
inputSchema: {
  project_root: z.string().describe('The absolute project root directory path'),
  user_request: z.string().describe('The user request/prompt to enhance'),
  last_context: z.string().optional().describe('Optional summary of previous conversation context'),
}
```

**Last Context Format**: When provided, last context is formatted as:
```
### PREVIOUS CONTEXT ###
<summary of what user was working on>
### END PREVIOUS CONTEXT ###
```

**FileSystemContext Usage**:
```typescript
const context = await FileSystemContext.create({
  directory: projectRoot,
});
const result = await context.searchAndAsk(userRequest, enhancementPrompt);
await context.close();
```

**Enhancement Prompt**: The `buildEnhancementPrompt()` function creates an instruction that asks the AI to:
- Analyze the original request for vague or ambiguous parts
- Use codebase context to make the request more specific
- Add relevant technical details (file names, function names, class names)
- Maintain the original intent
- Return the enhanced prompt in `<enhanced-prompt>` XML tags

**Response Parsing**: Uses regex `/<enhanced-prompt>([\s\S]*?)<\/enhanced-prompt>/` to extract the enhanced prompt from the AI response.

**Error Handling**: Errors are caught and returned as formatted error messages rather than throwing, ensuring MCP clients always receive a response.

## Special Logic & Patterns

### Retry Mechanism
The `enhancePrompt()` function implements a retry pattern because the AI may occasionally fail to include the XML tags. The loop continues until:
- Results contain `<enhanced-prompt>` tag (success marker)
- Maximum 3 attempts reached (returns parsed result regardless)

### Context Caching
`FileSystemContext` instances are cached by project root to prevent duplicate initialization errors and improve performance.

### Resource Cleanup
`FileSystemContext` requires explicit cleanup via `context.close()`. Cached contexts are closed on process exit (SIGINT/SIGTERM).

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

