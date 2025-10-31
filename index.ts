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
  // Shescape will automatically detect the shell based on the environment
  // For PowerShell, it uses PowerShell-specific escaping rules
  // For Unix shells (bash/sh/zsh), it uses POSIX shell escaping
  const shescape = new Shescape({
    shell: isPS ? 'powershell' : true, // 'powershell' for PowerShell, true for auto-detection
    flagProtection: true, // Enable flag protection to prevent flag injection attacks
  });

  // Use the quote method to properly escape the argument
  // This returns a quoted string that is safe to use in shell commands
  return shescape.quote(arg);
}

// Create MCP server
const server = new McpServer({
  name: 'auggie-shell-mcp',
  version: '1.0.12',
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

      // Check if ALLOW_CWD_SHELL environment variable is set to "true"
      const allowCwdShell = process.env.ALLOW_CWD_SHELL === 'true';

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
        '--compact',
      ];
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
          scriptContent = `\uFEFFSet-Location -Path ${escapedCwd}\nWrite-Host "---\n${escapedTruncatedRequest}"\n${auggieCommand}`;
        } else {
          scriptContent = `\uFEFFSet-Location -Path ${escapedCwd}\n${auggieCommand}`;
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
          scriptContent = `#!/bin/bash\ncd ${escapedCwd}\necho "---\n${escapedTruncatedRequest}"\n${auggieCommand}`;
        } else {
          scriptContent = `#!/bin/bash\ncd ${escapedCwd}\n${auggieCommand}`;
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

      let executionCommand: string;
      if (isPS) {
        executionCommand = `powershell -File ${escapedScriptPath}`;
      } else {
        executionCommand = `bash ${escapedScriptPath}`;
      }

      return {
        content: [
          {
            type: 'text',
            text: `Please execute in directory "${cwd}":\n\n${executionCommand}`,
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
