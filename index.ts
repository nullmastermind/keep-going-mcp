#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Create MCP server
const server = new McpServer({
  name: 'context-engine-mcp',
  version: '0.0.1',
});

// Register context engine tool
server.registerTool(
  'query_context',
  {
    title: 'Query Context',
    description: 'Query the context engine for project information',
    inputSchema: {
      project_root: z.string().describe('The project root directory path'),
      query: z.string().describe('The query to search for in the project'),
    },
  },
  async ({ project_root: _project_root, query: _query }) => {
    // Simple mock implementation that returns "nothing found"
    return {
      content: [
        {
          type: 'text',
          text: 'nothing found',
        },
      ],
    };
  },
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Context Engine MCP server is running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
