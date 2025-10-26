#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Create MCP server
const server = new McpServer({
  name: 'ai-search-mcp',
  version: '1.0.0',
});

// Register web-search tool
server.registerTool(
  'web-search',
  {
    title: 'Web Search',
    description: 'Search for content using a keyword query',
    inputSchema: {
      query: z.string().describe('The search query keyword'),
    },
  },
  async ({ query }) => {
    const mockResults = {
      query,
      results: [
        {
          title: 'Sample Result 1',
          url: 'https://example.com/result1',
          snippet: 'This is a sample search result snippet for demonstration purposes.',
        },
        {
          title: 'Sample Result 2',
          url: 'https://example.com/result2',
          snippet: 'Another sample search result to show the data structure.',
        },
      ],
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockResults, null, 2),
        },
      ],
    };
  },
);

// Register web-fetch tool
server.registerTool(
  'web-fetch',
  {
    title: 'Web Fetch',
    description: 'Fetch content from a specific URL',
    inputSchema: {
      url: z.string().describe('The URL to fetch content from'),
    },
  },
  async ({ url }) => {
    const mockContent = {
      url,
      status: 200,
      contentType: 'text/html',
      content:
        '<html><body><h1>Sample Page Content</h1><p>This is mock content fetched from the URL for demonstration purposes.</p></body></html>',
      fetchedAt: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockContent, null, 2),
        },
      ],
    };
  },
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('AI Search MCP server is running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
