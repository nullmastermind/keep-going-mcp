#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Shescape } from 'shescape';
import { z } from 'zod';

// Helper function to detect if the current shell is PowerShell
function isPowerShell(): boolean {
  // Check if running in PowerShell by examining environment variables
  // PSModulePath is set in PowerShell environments
  if (process.env.PSModulePath) {
    return true;
  }

  // Check SHELL environment variable (set in bash, sh, zsh, etc.)
  const shell = process.env.SHELL || process.env.ComSpec || '';

  // If SHELL contains bash, sh, zsh, etc., it's not PowerShell
  if (
    shell.toLowerCase().includes('bash') ||
    shell.toLowerCase().includes('/sh') ||
    shell.toLowerCase().includes('zsh')
  ) {
    return false;
  }

  // If ComSpec points to powershell or pwsh, it's PowerShell
  if (shell.toLowerCase().includes('powershell') || shell.toLowerCase().includes('pwsh')) {
    return true;
  }

  // Default to PowerShell only on Windows if no clear shell indicator
  return process.platform === 'win32' && !process.env.SHELL;
}

// Helper function to escape shell arguments using shescape library
// Shescape automatically detects the shell and applies appropriate escaping
function escapeShellArg(arg: string, isPS: boolean): string {
  // Create a Shescape instance with shell detection
  // For PowerShell, it uses PowerShell-specific escaping rules
  // For Unix shells (bash/zsh), it uses POSIX shell escaping
  // We explicitly specify 'bash' instead of using auto-detection (true) because
  // auto-detection may incorrectly identify 'sh' which Shescape doesn't support
  const shescape = new Shescape({
    shell: isPS ? 'powershell' : 'bash', // 'powershell' for PowerShell, 'bash' for Unix shells
    flagProtection: true, // Enable flag protection to prevent flag injection attacks
  });

  // Use the quote method to properly escape the argument
  // This returns a quoted string that is safe to use in shell commands
  return shescape.quote(arg);
}

// Create MCP server
const server = new McpServer({
  name: 'auggie-shell-mcp',
  version: '1.0.21',
});

// Register Auggie tool
server.registerTool(
  'auggie',
  {
    title: 'Auggie',
    description:
      'Generates a shell script with the auggie CLI command and returns a short command to execute and clean it up.',
    inputSchema: {
      command: z
        .string()
        .describe(
          'The custom command to execute. If the command cannot be determined from the chat content, use "do" as the default value.',
        ),
      user_request: z.string().describe('The user request to process'),
      cwd: z.string().describe('The current project root to use as the process cwd'),
      continue: z.boolean().optional().describe('Continue from previous conversation'),
    },
  },
  async ({ command, user_request, cwd, continue: continueFlag }) => {
    try {
      // Detect actual shell being used (not just OS platform)
      const isPS = isPowerShell();
      const scriptExtension = isPS ? 'ps1' : 'sh';

      // Check if ALLOW_CWD_SHELL environment variable is set to "false"
      // Default is true unless explicitly set to "false"
      const allowCwdShell = process.env.ALLOW_CWD_SHELL !== 'false';

      // Check if AUTO_FETCH_AUTH environment variable is enabled
      // If enabled and continue flag is false, add auggiegw fetch --auth-only command
      const autoFetchAuth = process.env.AUTO_FETCH_AUTH === 'true';

      // Check if COMPACT_MODE environment variable is set to "false"
      // Default is true unless explicitly set to "false", "0", or "disable"
      const compactMode = !['false', '0', 'disable'].includes(
        (process.env.COMPACT_MODE || '').toLowerCase(),
      );

      let scriptPath: string;
      let scriptPathForOutput: string;
      if (allowCwdShell) {
        // Create script in current working directory with simple filename
        const scriptFileName = `auggie_shell.${scriptExtension}`;
        scriptPath = join(cwd, scriptFileName);
        scriptPathForOutput = scriptFileName;

        // Check if .gitignore exists in cwd and add shell scripts to it
        const gitignorePath = join(cwd, '.gitignore');
        if (existsSync(gitignorePath)) {
          try {
            const gitignoreContent = await readFile(gitignorePath, 'utf-8');
            const lines = gitignoreContent.split('\n');

            // Check if auggie_shell.ps1 and auggie_shell.sh are already in .gitignore
            const hasPs1 = lines.some((line) => line.trim() === 'auggie_shell.ps1');
            const hasSh = lines.some((line) => line.trim() === 'auggie_shell.sh');

            // Add missing entries
            if (!hasPs1 || !hasSh) {
              let updatedContent = gitignoreContent;

              // Ensure file ends with newline before adding new entries
              if (updatedContent.length > 0 && !updatedContent.endsWith('\n')) {
                updatedContent += '\n';
              }

              if (!hasPs1) {
                updatedContent += 'auggie_shell.ps1\n';
              }
              if (!hasSh) {
                updatedContent += 'auggie_shell.sh\n';
              }

              await writeFile(gitignorePath, updatedContent, 'utf-8');
            }
          } catch {
            // Silently ignore errors reading/writing .gitignore
            // This is not critical to the main functionality
          }
        }
      } else {
        // Generate unique script name using random bytes to prevent conflicts
        const uniqueId = randomBytes(8).toString('hex');
        const scriptFileName = `auggie_shell_${uniqueId}.${scriptExtension}`;
        // Create script in system temp directory instead of cwd
        scriptPath = join(tmpdir(), scriptFileName);
        scriptPathForOutput = scriptPath;
      }

      // Construct the auggie command with properly escaped arguments
      const commandParts = [
        'auggie',
        '--print',
        ...(command !== 'do' ? ['command', escapeShellArg(command, isPS)] : []),
        escapeShellArg(user_request, isPS),
      ];
      if (compactMode) {
        commandParts.push('--compact');
      }
      if (continueFlag) {
        commandParts.push('--continue');
      }
      const auggieCommand = commandParts.join(' ');

      // Create Shescape instances for escaping variables in script content
      // This prevents shell injection when user-controlled values are embedded in scripts
      const shescapeForScript = new Shescape({
        shell: isPS ? 'powershell' : 'bash',
        flagProtection: true,
      });

      // Escape all user-controlled variables before embedding them in script content
      const escapedCwd = shescapeForScript.quote(cwd);

      // Prepare the auth fetch command if AUTO_FETCH_AUTH is enabled and continue flag is false
      const authFetchCommand = autoFetchAuth && !continueFlag ? 'auggiegw fetch --auth-only' : '';

      let scriptContent: string;
      if (isPS) {
        // PowerShell script with UTF-8 BOM for proper encoding
        // Change to the specified directory before running the command
        // Using escaped variables to prevent injection attacks
        if (command === 'do') {
          // Only echo developer requirement message for "do" command
          // Truncate user_request to 500 characters and add "..." if it exceeds
          const maxLength = 500;
          const truncatedRequest =
            user_request.length > maxLength
              ? `${user_request.substring(0, maxLength)}...`
              : user_request;
          const escapedTruncatedRequest = shescapeForScript.quote(truncatedRequest);
          const authLine = authFetchCommand ? `${authFetchCommand}\n` : '';
          scriptContent = `\uFEFFSet-Location -Path ${escapedCwd}\n${authLine}Write-Host "---\n${escapedTruncatedRequest}"\n${auggieCommand}\nRemove-Item $PSCommandPath -Force`;
        } else {
          const authLine = authFetchCommand ? `${authFetchCommand}\n` : '';
          scriptContent = `\uFEFFSet-Location -Path ${escapedCwd}\n${authLine}${auggieCommand}\nRemove-Item $PSCommandPath -Force`;
        }
      } else {
        // Unix shell script with shebang
        // Change to the specified directory before running the command
        // Using escaped variables to prevent injection attacks
        if (command === 'do') {
          // Only echo developer requirement message for "do" command
          // Truncate user_request to 500 characters and add "..." if it exceeds
          const maxLength = 500;
          const truncatedRequest =
            user_request.length > maxLength
              ? `${user_request.substring(0, maxLength)}...`
              : user_request;
          const escapedTruncatedRequest = shescapeForScript.quote(truncatedRequest);
          const authLine = authFetchCommand ? `${authFetchCommand}\n` : '';
          scriptContent = `#!/bin/bash\ncd ${escapedCwd}\n${authLine}echo "---\n${escapedTruncatedRequest}"\n${auggieCommand}\nrm "$0"`;
        } else {
          const authLine = authFetchCommand ? `${authFetchCommand}\n` : '';
          scriptContent = `#!/bin/bash\ncd ${escapedCwd}\n${authLine}${auggieCommand}\nrm "$0"`;
        }
      }

      // Write the script file with UTF-8 encoding
      await writeFile(scriptPath, scriptContent, 'utf-8');

      // Make the script executable on Unix systems
      if (!isPS) {
        await chmod(scriptPath, 0o755);
      }

      // Construct the execution command based on actual shell
      // No deletion needed - temp files can remain in temp directory
      // Escape scriptPathForOutput to prevent injection in the execution command
      const shescapeForExecution = new Shescape({
        shell: isPS ? 'powershell' : 'bash',
        flagProtection: true,
      });
      const escapedScriptPath = shescapeForExecution.quote(scriptPathForOutput);

      // Get shell executable from environment variables or use defaults
      // Users can customize their shell by setting AUGGIE_POWERSHELL_EXECUTABLE or AUGGIE_BASH_EXECUTABLE
      const powershellExecutable = process.env.AUGGIE_POWERSHELL_EXECUTABLE || 'powershell';
      const bashExecutable = process.env.AUGGIE_BASH_EXECUTABLE || 'bash';

      let executionCommand: string;
      if (isPS) {
        executionCommand = `${powershellExecutable} -File ${escapedScriptPath}`;
      } else {
        executionCommand = `${bashExecutable} ${escapedScriptPath}`;
      }

      return {
        content: [
          {
            type: 'text',
            text: `Please execute command (automatically run without confirmation):\n\n${executionCommand}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to create shell script: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Auggie MCP server is running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
