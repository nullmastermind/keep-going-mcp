# AI Search MCP

A Model Context Protocol (MCP) server that provides AI-powered web search and web fetch capabilities for AI assistants.

## Features

- **AI-Powered Web Search**: Natural language search using Google's AI mode via SearchAPI.io
- **Web Content Fetching**: Fetch and convert web pages to Markdown format
- **Multiple API Key Support**: Load balancing and automatic retry with multiple API keys
- **Easy Integration**: Works with any MCP-compatible AI assistant

## Quick Start

```bash
npx -y @dccxx/ai-search-mcp
```

Or

```bash
bunx @dccxx/ai-search-mcp
```

## Configuration

### API Key Setup

This MCP server requires a **SEARCHAPI_IO_API_KEY** environment variable to function. This API key is used to access SearchAPI.io's Google AI Mode search service, which powers the intelligent web search capabilities.

#### What is SEARCHAPI_IO_API_KEY?

The `SEARCHAPI_IO_API_KEY` is an authentication token that allows this MCP server to make requests to SearchAPI.io's API. SearchAPI.io provides access to Google's AI-powered search results, enabling natural language queries and context-aware search functionality.

#### How to Obtain an API Key

1. Visit [https://www.searchapi.io/](https://www.searchapi.io/)
2. Sign up for an account or log in
3. Navigate to your dashboard to find your API key
4. Copy the API key for use in the configuration

**Note**: You can configure multiple API keys separated by commas for load balancing and automatic retry functionality. If one key fails or reaches its rate limit, the server will automatically try the next available key.

### MCP Server Configuration

To use this MCP server with your AI assistant, add the following configuration to your MCP settings file:

```json
{
  "mcpServers": {
    "Better Web Search": {
      "command": "bunx",
      "args": [
        "@dccxx/ai-search-mcp@latest"
      ],
      "env": {
        "SEARCHAPI_IO_API_KEY": ""
      }
    }
  }
}
```

**Important**: Replace the empty string `""` in the `SEARCHAPI_IO_API_KEY` field with your actual API key from SearchAPI.io.

#### Configuration File Location

The MCP settings file location depends on your AI assistant:

- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Other MCP clients**: Refer to your client's documentation for the configuration file location

#### Multiple API Keys Example

To configure multiple API keys for load balancing and automatic failover:

```json
{
  "mcpServers": {
    "Better Web Search": {
      "command": "bunx",
      "args": [
        "@dccxx/ai-search-mcp@latest"
      ],
      "env": {
        "SEARCHAPI_IO_API_KEY": "your_first_api_key,your_second_api_key,your_third_api_key"
      }
    }
  }
}
```

Separate multiple keys with commas. The server will randomly select an available key for each request and automatically retry with another key if one fails.

## Available Tools

Once configured, the MCP server provides two tools:

### 1. web-search

Search for content using AI-powered search that understands natural language queries.

**Parameters:**
- `query` (string): Natural language search query with context

### 2. web-fetch

Fetch content from a specific URL and convert it to Markdown format.

**Parameters:**
- `url` (string): The URL to fetch content from

## License

MIT
