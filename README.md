Name: Auggie MCP

```bash
npx -y @dccxx/auggie-shell-mcp
```

Or

```bash
bunx @dccxx/auggie-shell-mcp
```

## MCP Server Configuration

To use this MCP server with AI assistants like Claude Desktop or other MCP-compatible clients, you need to add it to your MCP configuration file.

### Configuration Format

Add the following configuration to your MCP settings:

```json
{
  "auggie-mcp-server": {
    "command": "bunx",
    "args": ["@dccxx/auggie-shell-mcp"],
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
    "auggie-mcp-server": {
      "command": "bunx",
      "args": ["@dccxx/auggie-shell-mcp"],
      "env": {}
    }
  }
}
```

**With environment variables (optional):**

```json
{
  "mcpServers": {
    "auggie-mcp-server": {
      "command": "bunx",
      "args": ["@dccxx/auggie-shell-mcp"],
      "env": {
        "ALLOW_CWD_SHELL": "true"
      }
    }
  }
}
```

After adding the configuration, restart Claude Desktop for the changes to take effect.

## Environment Variables

### ALLOW_CWD_SHELL

By default, Auggie MCP creates shell scripts in the system's temporary directory with unique filenames to prevent conflicts. If you prefer to have scripts created in the current working directory instead, you can set the `ALLOW_CWD_SHELL` environment variable to `true`.

**Default behavior (ALLOW_CWD_SHELL not set or set to any value other than "true"):**
- Scripts are created in the system temp directory
- Filenames use a unique identifier: `auggie_shell_<random_id>.sh` or `auggie_shell_<random_id>.ps1`

**When ALLOW_CWD_SHELL=true:**
- Scripts are created in the current working directory
- Filename is always: `auggie_shell.sh` or `auggie_shell.ps1`

**Example usage:**

```bash
# Linux/macOS
export ALLOW_CWD_SHELL=true
npx -y @dccxx/auggie-shell-mcp

# Windows PowerShell
$env:ALLOW_CWD_SHELL="true"
npx -y @dccxx/auggie-shell-mcp
```

**Note:** When using `ALLOW_CWD_SHELL=true`, the script file will be overwritten on each execution. Make sure to add `auggie_shell.sh` and `auggie_shell.ps1` to your `.gitignore` file if you don't want these files tracked in version control.
