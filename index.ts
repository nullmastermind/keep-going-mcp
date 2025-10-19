#!/usr/bin/env node

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const execAsync = promisify(exec);

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
      'The Auggie tool allows running custom commands to call an AI model that works with commands and user requests.',
    inputSchema: {
      command: z.string().describe('The custom command to execute'),
      user_request: z.string().describe('The user request to process'),
      cwd: z.string().describe('The current project root to use as the process cwd'),
    },
  },
  async ({command, user_request, cwd}) => {
    try {
      const auggieCli = `auggie --print command ${command} ${JSON.stringify(user_request)} --compact`;
      const {stdout, stderr} = await execAsync(auggieCli, {cwd});

      if (stderr) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${stderr}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: stdout,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to execute auggie command: ${errorMessage}`,
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
