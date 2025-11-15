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
  version: '1.0.28',
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
      include_chat_history: z
        .boolean()
        .optional()
        .describe(
          "Add conversation information from the previous account. This value is true if the conversation continues after switching accounts. The 'continue' parameter must be false when this value is true.",
        ),
    },
  },
  async ({ command, user_request, cwd, continue: continueFlag, include_chat_history }) => {
    try {
      // Validate that continue must be false when include_chat_history is true
      if (include_chat_history && continueFlag) {
        return {
          content: [
            {
              type: 'text',
              text: "Invalid parameters: 'continue' parameter must be false when 'include_chat_history' is true.",
            },
          ],
          isError: true,
        };
      }
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

      // Check if SAVE_CONVERSATION_HISTORY environment variable is enabled
      // Default is false unless explicitly set to "true"
      const saveConversationHistory = process.env.SAVE_CONVERSATION_HISTORY === 'true';

      // Handle include_chat_history: read conversation history and prepend to user_request
      let modifiedUserRequest = user_request;
      if (include_chat_history && saveConversationHistory) {
        const conversationFilePath = join(cwd, 'auggie_shell_conversation.txt');
        if (existsSync(conversationFilePath)) {
          try {
            const chatHistory = await readFile(conversationFilePath, 'utf-8');
            modifiedUserRequest = `Continue from Chat history:\n"""""""\n${chatHistory}\n"""""""\n\nMy newest request:\n${user_request}`;
          } catch {
            // Silently ignore errors reading conversation history file
            // If file cannot be read, just use the original user_request
          }
        }
      }

      let scriptPath: string;
      let scriptPathForOutput: string;
      let userRequestFilePath: string;
      if (allowCwdShell) {
        // Create script in current working directory with simple filename
        const scriptFileName = `auggie_shell.${scriptExtension}`;
        scriptPath = join(cwd, scriptFileName);
        scriptPathForOutput = scriptFileName;
        userRequestFilePath = join(cwd, 'auggie_shell_user_request.txt');

        // Check if .gitignore exists in cwd and add shell scripts to it
        const gitignorePath = join(cwd, '.gitignore');
        if (existsSync(gitignorePath)) {
          try {
            const gitignoreContent = await readFile(gitignorePath, 'utf-8');
            const lines = gitignoreContent.split('\n');

            // Check if auggie_shell.ps1, auggie_shell.sh, auggie_shell_user_request.txt, and auggie_shell_conversation.txt are already in .gitignore
            const hasPs1 = lines.some((line) => line.trim() === 'auggie_shell.ps1');
            const hasSh = lines.some((line) => line.trim() === 'auggie_shell.sh');
            const hasUserRequest = lines.some(
              (line) => line.trim() === 'auggie_shell_user_request.txt',
            );
            const hasConversation = lines.some(
              (line) => line.trim() === 'auggie_shell_conversation.txt',
            );

            // Add missing entries
            if (!hasPs1 || !hasSh || !hasUserRequest || !hasConversation) {
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
              if (!hasUserRequest) {
                updatedContent += 'auggie_shell_user_request.txt\n';
              }
              if (!hasConversation) {
                updatedContent += 'auggie_shell_conversation.txt\n';
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
        userRequestFilePath = join(tmpdir(), `auggie_shell_user_request_${uniqueId}.txt`);
      }

      // Write the user_request content to a temporary file to avoid shell escaping issues
      await writeFile(userRequestFilePath, modifiedUserRequest, 'utf-8');

      // Construct the auggie command with properly escaped arguments
      // For PowerShell, use pipe format to avoid special character errors
      // For other shells, use command line argument format
      let auggieCommand: string;
      if (isPS) {
        // PowerShell: pipe $userRequest to auggie with stdin
        const commandParts = [
          '$userRequest',
          '|',
          'auggie',
          '--print',
          '-',
          ...(command !== 'do' ? ['command', escapeShellArg(command, isPS)] : []),
        ];
        if (compactMode) {
          commandParts.push('--compact');
        }
        if (continueFlag) {
          commandParts.push('--continue');
        }
        auggieCommand = commandParts.join(' ');
      } else {
        // Unix shells: use command line argument format
        const commandParts = [
          'auggie',
          '--print',
          ...(command !== 'do' ? ['command', escapeShellArg(command, isPS)] : []),
          '"$userRequest"',
        ];
        if (compactMode) {
          commandParts.push('--compact');
        }
        if (continueFlag) {
          commandParts.push('--continue');
        }
        auggieCommand = commandParts.join(' ');
      }

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

      // Prepare conversation history append command if enabled
      let conversationHistoryCommand = '';
      if (saveConversationHistory) {
        // Use variable substitution for user_request to avoid escaping issues
        const separator = '='.repeat(80);
        const timestamp = new Date().toISOString();

        if (isPS) {
          // PowerShell append command
          // Use Add-Content to append to file in the script's directory
          // PowerShell uses backtick for newline: `n
          // Use $originalUserRequest variable instead of escaped string
          conversationHistoryCommand = `Add-Content -Path (Join-Path (Split-Path $PSCommandPath) 'auggie_shell_conversation.txt') -Value "${separator}\`n[${timestamp}]\`n$originalUserRequest\`n"`;
        } else {
          // Bash append command
          // Use echo with >> to append to file in the script's directory
          const scriptDir = '$(dirname "$0")';
          // Use $originalUserRequest variable instead of escaped string
          conversationHistoryCommand = `echo "${separator}\\n[${timestamp}]\\n$originalUserRequest\\n" >> ${scriptDir}/auggie_shell_conversation.txt`;
        }
      }

      let scriptContent: string;
      if (isPS) {
        // PowerShell script with UTF-8 BOM for proper encoding
        // Change to the specified directory before running the command
        // Using escaped variables to prevent injection attacks

        // Escape the user request file path for PowerShell
        const escapedUserRequestFilePath = shescapeForScript.quote(userRequestFilePath);

        // Read user_request from file into variables
        const readUserRequestCommand = `$userRequest = Get-Content -Path ${escapedUserRequestFilePath} -Raw`;
        const readOriginalUserRequestCommand = `$originalUserRequest = Get-Content -Path ${escapedUserRequestFilePath} -Raw`;

        if (command === 'do') {
          // Only echo developer requirement message for "do" command
          const authLine = authFetchCommand ? `${authFetchCommand}\n` : '';

          if (saveConversationHistory) {
            if (continueFlag) {
              // When continue flag is true, just append to existing conversation file
              scriptContent = `\uFEFFSet-Location -Path ${escapedCwd}\n${readUserRequestCommand}\n${readOriginalUserRequestCommand}\n${authLine}Write-Host "---\n$userRequest"\n${auggieCommand}\n${conversationHistoryCommand}\nRemove-Item $PSCommandPath -Force`;
            } else {
              // When continue flag is false, delete conversation file after auggie command completes
              const deleteConversationFile = `Remove-Item -Path (Join-Path (Split-Path $PSCommandPath) 'auggie_shell_conversation.txt') -ErrorAction SilentlyContinue`;
              scriptContent = `\uFEFFSet-Location -Path ${escapedCwd}\n${readUserRequestCommand}\n${readOriginalUserRequestCommand}\n${authLine}Write-Host "---\n$userRequest"\n${auggieCommand}\n${deleteConversationFile}\n${conversationHistoryCommand}\nRemove-Item $PSCommandPath -Force`;
            }
          } else {
            scriptContent = `\uFEFFSet-Location -Path ${escapedCwd}\n${readUserRequestCommand}\n${authLine}Write-Host "---\n$userRequest"\n${auggieCommand}\nRemove-Item $PSCommandPath -Force`;
          }
        } else {
          const authLine = authFetchCommand ? `${authFetchCommand}\n` : '';

          if (saveConversationHistory) {
            if (continueFlag) {
              // When continue flag is true, just append to existing conversation file
              scriptContent = `\uFEFFSet-Location -Path ${escapedCwd}\n${readUserRequestCommand}\n${readOriginalUserRequestCommand}\n${authLine}${auggieCommand}\n${conversationHistoryCommand}\nRemove-Item $PSCommandPath -Force`;
            } else {
              // When continue flag is false, delete conversation file after auggie command completes
              const deleteConversationFile = `Remove-Item -Path (Join-Path (Split-Path $PSCommandPath) 'auggie_shell_conversation.txt') -ErrorAction SilentlyContinue`;
              scriptContent = `\uFEFFSet-Location -Path ${escapedCwd}\n${readUserRequestCommand}\n${readOriginalUserRequestCommand}\n${authLine}${auggieCommand}\n${deleteConversationFile}\n${conversationHistoryCommand}\nRemove-Item $PSCommandPath -Force`;
            }
          } else {
            scriptContent = `\uFEFFSet-Location -Path ${escapedCwd}\n${readUserRequestCommand}\n${authLine}${auggieCommand}\nRemove-Item $PSCommandPath -Force`;
          }
        }
      } else {
        // Unix shell script with shebang
        // Change to the specified directory before running the command
        // Using escaped variables to prevent injection attacks

        // Escape the user request file path for Bash
        const escapedUserRequestFilePath = shescapeForScript.quote(userRequestFilePath);

        // Read user_request from file into variables
        const readUserRequestCommand = `userRequest=$(cat ${escapedUserRequestFilePath})`;
        const readOriginalUserRequestCommand = `originalUserRequest=$(cat ${escapedUserRequestFilePath})`;

        if (command === 'do') {
          // Only echo developer requirement message for "do" command
          const authLine = authFetchCommand ? `${authFetchCommand}\n` : '';

          if (saveConversationHistory) {
            if (continueFlag) {
              // When continue flag is true, just append to existing conversation file
              scriptContent = `#!/bin/bash\ncd ${escapedCwd}\n${readUserRequestCommand}\n${readOriginalUserRequestCommand}\n${authLine}echo "---\n$userRequest"\n${auggieCommand}\n${conversationHistoryCommand}\nrm "$0"`;
            } else {
              // When continue flag is false, delete conversation file after auggie command completes
              const scriptDir = '$(dirname "$0")';
              const deleteConversationFile = `rm -f ${scriptDir}/auggie_shell_conversation.txt`;
              scriptContent = `#!/bin/bash\ncd ${escapedCwd}\n${readUserRequestCommand}\n${readOriginalUserRequestCommand}\n${authLine}echo "---\n$userRequest"\n${auggieCommand}\n${deleteConversationFile}\n${conversationHistoryCommand}\nrm "$0"`;
            }
          } else {
            scriptContent = `#!/bin/bash\ncd ${escapedCwd}\n${readUserRequestCommand}\n${authLine}echo "---\n$userRequest"\n${auggieCommand}\nrm "$0"`;
          }
        } else {
          const authLine = authFetchCommand ? `${authFetchCommand}\n` : '';

          if (saveConversationHistory) {
            if (continueFlag) {
              // When continue flag is true, just append to existing conversation file
              scriptContent = `#!/bin/bash\ncd ${escapedCwd}\n${readUserRequestCommand}\n${readOriginalUserRequestCommand}\n${authLine}${auggieCommand}\n${conversationHistoryCommand}\nrm "$0"`;
            } else {
              // When continue flag is false, delete conversation file after auggie command completes
              const scriptDir = '$(dirname "$0")';
              const deleteConversationFile = `rm -f ${scriptDir}/auggie_shell_conversation.txt`;
              scriptContent = `#!/bin/bash\ncd ${escapedCwd}\n${readUserRequestCommand}\n${readOriginalUserRequestCommand}\n${authLine}${auggieCommand}\n${deleteConversationFile}\n${conversationHistoryCommand}\nrm "$0"`;
            }
          } else {
            scriptContent = `#!/bin/bash\ncd ${escapedCwd}\n${readUserRequestCommand}\n${authLine}${auggieCommand}\nrm "$0"`;
          }
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
