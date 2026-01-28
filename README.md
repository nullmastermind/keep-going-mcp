# Claude API Web Search MCP

A Model Context Protocol (MCP) server that provides web search and web fetch capabilities for AI assistants using Claude API.

## Features

- **Web Search via Claude API**: Search the web using natural language queries through Claude's web search endpoint
- **Web Content Fetching**: Fetch and convert web pages to clean Markdown format
- **No Authentication Required**: Works without API keys or authentication tokens
- **Configurable Results**: Control the number of search results (1-10)
- **Easy Integration**: Works with any MCP-compatible AI assistant

## Installation

### Quick Start

```bash
npx claude-api-web-search-mcp
```

Or with Bun:

```bash
bunx claude-api-web-search-mcp
```

### From Source

```bash
# Clone the repository
git clone <repository-url>
cd keep-going-mcp

# Install dependencies
bun install

# Build the project
bun run build

# Run the server
bun run start
```

## Configuration

### MCP Server Configuration

To use this MCP server with your AI assistant, add the following configuration to your MCP settings file:

```json
{
  "mcpServers": {
    "web-search-mcp": {
      "command": "npx",
      "args": [
        "claude-api-web-search-mcp"
      ]
    }
  }
}
```

Or with Bun:

```json
{
  "mcpServers": {
    "web-search-mcp": {
      "command": "bunx",
      "args": [
        "claude-api-web-search-mcp"
      ]
    }
  }
}
```

#### Configuration File Location

The MCP settings file location depends on your AI assistant:

- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Other MCP clients**: Refer to your client's documentation for the configuration file location

### Environment Variables (Optional)

You can optionally override the default web search API endpoint:

```json
{
  "mcpServers": {
    "web-search-mcp": {
      "command": "npx",
      "args": [
        "claude-api-web-search-mcp"
      ],
      "env": {
        "WEB_SEARCH_API_ENDPOINT": "https://customaugment.superclaude.dev/web-search"
      }
    }
  }
}
```

**Environment Variables:**
- `WEB_SEARCH_API_ENDPOINT` (optional): Override the default web search API endpoint. Defaults to `https://customaugment.superclaude.dev/web-search` if not set.

See `.env.example` for configuration options.

## Available Tools

Once configured, the MCP server provides two tools:

### 1. web-search

Search the web using natural language queries through Claude API.

**Parameters:**
- `query` (string, required): The search query to send
- `num_results` (integer, optional): Number of results to return (1-10, default: 5)

**Example:**
```json
{
  "query": "latest developments in AI",
  "num_results": 5
}
```

**Returns:** Markdown-formatted search results with relevant information from across the internet.

### 2. web-fetch

Fetch content from a specific URL and convert it to Markdown format.

**Parameters:**
- `url` (string, required): The URL to fetch content from

**Example:**
```json
{
  "url": "https://example.com/article"
}
```

**Returns:** Structured response with:
- `url`: The fetched URL
- `status`: HTTP status code
- `content`: Markdown-formatted page content
- `fetchedAt`: Timestamp of when the content was fetched

## Technical Details

### Architecture

- **Single-file MCP server** implementation using `@modelcontextprotocol/sdk`
- **Zod schema validation** for input parameters
- **30-second timeout** applied to all HTTP requests
- **StdioServerTransport** for communication with MCP clients

### Error Handling

The server provides comprehensive error handling:
- Invalid input validation (e.g., num_results out of range)
- Network timeouts (30 seconds)
- HTTP errors (non-2xx responses)
- Invalid URL formats
- Unsupported protocols (only http/https supported)

All errors are returned as formatted JSON messages with an `isError: true` flag.

### Dependencies

- `@modelcontextprotocol/sdk`: MCP server framework
- `zod`: Input schema validation
- `turndown`: HTML to Markdown conversion
- `@types/turndown`: TypeScript types for turndown

## Development

### Commands

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

### Code Quality

After making changes, always run:

```bash
bun run lint && bun run typecheck
```

## Requirements

- Node.js >= 18.0.0
- TypeScript ^5

## License

MIT
