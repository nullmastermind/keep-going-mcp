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

**With environment variables (optional - to use temp directory instead of CWD):**

```json
{
  "mcpServers": {
    "auggie-mcp-server": {
      "command": "bunx",
      "args": ["@dccxx/auggie-shell-mcp"],
      "env": {
        "ALLOW_CWD_SHELL": "false"
      }
    }
  }
}
```

After adding the configuration, restart Claude Desktop for the changes to take effect.

## Environment Variables

### ALLOW_CWD_SHELL

By default, Auggie MCP creates shell scripts in the current working directory with a simple filename. If you prefer to have scripts created in the system's temporary directory with unique filenames to prevent conflicts, you can set the `ALLOW_CWD_SHELL` environment variable to `false`.

**Default behavior (ALLOW_CWD_SHELL not set or set to any value other than "false"):**
- Scripts are created in the current working directory
- Filename is always: `auggie_shell.sh` or `auggie_shell.ps1`

**When ALLOW_CWD_SHELL=false:**
- Scripts are created in the system temp directory
- Filenames use a unique identifier: `auggie_shell_<random_id>.sh` or `auggie_shell_<random_id>.ps1`

**Example usage to disable CWD shell scripts:**

```bash
# Linux/macOS
export ALLOW_CWD_SHELL=false
npx -y @dccxx/auggie-shell-mcp

# Windows PowerShell
$env:ALLOW_CWD_SHELL="false"
npx -y @dccxx/auggie-shell-mcp
```

**Note:** With the default behavior, the script file will be overwritten on each execution. Make sure to add `auggie_shell.sh` and `auggie_shell.ps1` to your `.gitignore` file if you don't want these files tracked in version control.

### AUGGIE_POWERSHELL_EXECUTABLE

Allows you to specify a custom PowerShell executable instead of the default `powershell`. This is useful if you want to use PowerShell Core (`pwsh`) or a custom shell on Windows.

**Default:** `powershell`

**Example usage with PowerShell Core:**

```bash
# Windows PowerShell
$env:AUGGIE_POWERSHELL_EXECUTABLE="pwsh"
npx -y @dccxx/auggie-shell-mcp
```

**Example configuration in Claude Desktop:**

```json
{
  "mcpServers": {
    "auggie-mcp-server": {
      "command": "bunx",
      "args": ["@dccxx/auggie-shell-mcp"],
      "env": {
        "AUGGIE_POWERSHELL_EXECUTABLE": "pwsh"
      }
    }
  }
}
```

### AUGGIE_BASH_EXECUTABLE

Allows you to specify a custom bash-compatible shell executable instead of the default `bash`. This is useful if you want to use `zsh`, `fish`, or other custom shells on Unix-like systems.

**Default:** `bash`

**Example usage with zsh:**

```bash
# Linux/macOS
export AUGGIE_BASH_EXECUTABLE=zsh
npx -y @dccxx/auggie-shell-mcp
```

**Example configuration in Claude Desktop:**

```json
{
  "mcpServers": {
    "auggie-mcp-server": {
      "command": "bunx",
      "args": ["@dccxx/auggie-shell-mcp"],
      "env": {
        "AUGGIE_BASH_EXECUTABLE": "zsh"
      }
    }
  }
}
```
