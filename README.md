# Prompt Enhancer MCP

A Model Context Protocol (MCP) server that enhances user prompts using Augment Code's context engine.

## Quick Start

```bash
npx -y auggie-prompt-enhancer-mcp@latest
```

Or with Bun:

```bash
bunx auggie-prompt-enhancer-mcp@latest
```

## What It Does

This MCP server provides an `enhance-prompt` tool that:
- Takes a user request/prompt and searches the codebase for relevant context
- Uses AI to rewrite the prompt to be clearer, more specific, and less ambiguous
- Returns an enhanced version of the prompt with better context and specificity

### Tool Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `project_root` | string | The project root directory path |
| `user_request` | string | The user request/prompt to enhance |

## MCP Server Configuration

### Generic MCP Configuration

```json
{
  "prompt-enhancer-mcp-server": {
    "command": "bunx",
    "args": ["auggie-prompt-enhancer-mcp"],
    "env": {}
  }
}
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

**Location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "prompt-enhancer-mcp-server": {
      "command": "bunx",
      "args": ["auggie-prompt-enhancer-mcp"],
      "env": {}
    }
  }
}
```

Restart Claude Desktop after adding the configuration.

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build
bun run build

# Lint & type check
bun run lint && bun run typecheck
```

## License

MIT
