#!/usr/bin/env node

import { chmod, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Helper function to escape shell arguments for safe command construction
function escapeShellArg(arg: string): string {
  // For cross-platform compatibility, use double quotes and escape special characters
  // This works on Windows (PowerShell, CMD) and Unix-like systems (bash, sh)
  return `"${arg.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')}"`;
}

// Create MCP server
const server = new McpServer({
  name: 'auggie-shell-mcp',
  version: '1.0.0',
});

// Register Auggie tool
server.registerTool(
  'auggie',
  {
    title: 'Auggie',
    description:
      'Generates a shell script with the auggie CLI command and returns a short command to execute and clean it up.',
    inputSchema: {
      command: z.string().describe('The custom command to execute'),
      user_request: z.string().describe('The user request to process'),
      cwd: z.string().describe('The current project root to use as the process cwd'),
    },
  },
  async ({ command, user_request, cwd }) => {
    try {
      // Detect OS and determine script extension and execution command
      const isWindows = process.platform === 'win32';
      const scriptExtension = isWindows ? 'ps1' : 'sh';
      const scriptFileName = `auggie_shell.${scriptExtension}`;
      const scriptPath = join(cwd, scriptFileName);

      // Construct the auggie command with properly escaped arguments
      const commandParts = [
        'auggie',
        '--print',
        'command',
        escapeShellArg(command),
        escapeShellArg(user_request),
        '--compact',
      ];
      const auggieCommand = commandParts.join(' ');

      // Create script content based on OS
      let scriptContent: string;
      if (isWindows) {
        // PowerShell script
        scriptContent = auggieCommand;
      } else {
        // Unix shell script with shebang
        scriptContent = `#!/bin/sh\n${auggieCommand}`;
      }

      // Write the script file
      await writeFile(scriptPath, scriptContent, 'utf-8');

      // Make the script executable on Unix systems
      if (!isWindows) {
        await chmod(scriptPath, 0o755);
      }

      // Construct the execution command
      let executionCommand: string;
      if (isWindows) {
        executionCommand = `powershell -File ${scriptFileName}; Remove-Item ${scriptFileName}`;
      } else {
        executionCommand = `sh ${scriptFileName} && rm ${scriptFileName}`;
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
