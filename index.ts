#!/usr/bin/env node

import { FileSystemContext } from '@augmentcode/auggie-sdk';
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
  'codebase-retrieval',
  {
    title: 'Codebase Retrieval',
    description: `This tool is Augment's context engine, the world's best codebase context engine. It:\n1. Takes in a natural
       language description of the code you are looking for;\n2. Uses a proprietary retrieval/embedding model suite that produces the
       highest-quality recall of relevant code snippets from across the codebase;\n3. Maintains a real-time index of the codebase, so
       the results are always up-to-date and reflects the current state of the codebase;\n4. Can retrieve across different programming
       languages;\n5. Only reflects the current state of the codebase on the disk, and has no information on version control or code
       history.`,
    inputSchema: {
      project_root: z.string().describe('The project root directory path'),
      information_request: z.string().describe('A description of the information you need.'),
    },
  },
  async ({ project_root: projectRoot, information_request }) => {
    return {
      content: [
        {
          type: 'text',
          text: await search(information_request, projectRoot),
        },
      ],
    };
  },
);

async function search(query: string, projectRoot: string): Promise<string> {
  const context = await FileSystemContext.create({
    directory: projectRoot,
  });

  try {
    const results = await context.search(query);
    return results;
  } finally {
    await context.close();
  }
}

// Start both MCP server and Express server in parallel
async function main() {
  // Start MCP server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Context Engine MCP server is running...');

  // setTimeout(async () => {
  console.time('codebase-retrieval');
  console.log(await search('thông tin dự án', 'D:\\projects\\research\\keep-going-mcp'));
  console.timeEnd('codebase-retrieval');
  // }, 2000);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
