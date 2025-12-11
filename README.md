# Context Engine MCP

A Model Context Protocol (MCP) server that exposes Augment Code's context engine as a `codebase-retrieval` tool for AI assistants.

## Quick Start

```bash
npx -y auggie-context-engine-mcp
```

Or with Bun:

```bash
bunx auggie-context-engine-mcp
```

## What It Does

This MCP server provides a `codebase-retrieval` tool that:
- Takes a natural language description of the code you're looking for
- Uses Augment's semantic search to find relevant code snippets
- Returns code sections with file paths and line numbers

### Tool Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `project_root` | string | The project root directory path |
| `information_request` | string | Natural language description of what you need |

## MCP Server Configuration

### Generic MCP Configuration

```json
{
  "context-engine-mcp-server": {
    "command": "bunx",
    "args": ["auggie-context-engine-mcp"],
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
    "context-engine-mcp-server": {
      "command": "bunx",
      "args": ["auggie-context-engine-mcp"],
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
