#!/usr/bin/env node

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
  name: 'auggie-mcp',
  version: '1.0.0',
});

// Register Auggie tool
server.registerTool(
  'auggie',
  {
    title: 'Auggie',
    description:
      'Returns the auggie CLI command as text for the client to review and execute. Does not execute the command directly.',
    inputSchema: {
      command: z.string().describe('The custom command to execute'),
      user_request: z.string().describe('The user request to process'),
      cwd: z.string().describe('The current project root to use as the process cwd'),
    },
  },
  async ({ command, user_request, cwd }) => {
    // Construct the auggie command with properly escaped arguments
    const commandParts = [
      'auggie',
      '--print',
      'command',
      escapeShellArg(command),
      escapeShellArg(user_request),
      '--compact',
    ];
    const commandString = commandParts.join(' ');

    return {
      content: [
        {
          type: 'text',
          text: `Command to execute in directory "${cwd}":\n\n${commandString}`,
        },
      ],
    };
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
