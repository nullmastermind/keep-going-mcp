Name: Context Engine MCP

```bash
npx -y @dccxx/context-engine-mcp
```

Or

```bash
bunx @dccxx/context-engine-mcp
```

## MCP Server Configuration

To use this MCP server with AI assistants like Claude Desktop or other MCP-compatible clients, you need to add it to your MCP configuration file.

### Configuration Format

Add the following configuration to your MCP settings:

```json
{
  "context-engine-mcp-server": {
    "command": "bunx",
    "args": ["@dccxx/context-engine-mcp"],
    "env": {}
  }
}
```

### Configuration for Claude Desktop

For Claude Desktop, add the configuration to your `claude_desktop_config.json` file:

**Location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Example configuration:**

```json
{
  "mcpServers": {
    "context-engine-mcp-server": {
      "command": "bunx",
      "args": ["@dccxx/context-engine-mcp"],
      "env": {}
    }
  }
}
```

After adding the configuration, restart Claude Desktop for the changes to take effect.
