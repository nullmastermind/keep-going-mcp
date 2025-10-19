#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

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
    },
  },
  async ({ command, user_request }) => {
    let responseText = `Command: ${command}\nUser Request: ${user_request}\nProcessed successfully.`;

    return {
      content: [
        {
          type: 'text',
          text: responseText,
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
