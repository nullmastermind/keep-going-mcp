#!/usr/bin/env node

import { Auggie } from '@augmentcode/auggie-sdk';
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
  async ({ project_root: projectRoot, query }) => {
    return {
      content: [
        {
          type: 'text',
          text: await search(query, projectRoot),
        },
      ],
    };
  },
);

async function search(query: string, projectRoot: string): Promise<string> {
  return new Promise<string>((resolve) => {
    Auggie.create({
      auggiePath: 'bun augment.mjs',
      model: 'haiku4.5',
      workspaceRoot: projectRoot,
      allowIndexing: true,
      // apiUrl: 'http://localhost:8080',
    }).then((client: any) => {
      client.onSessionUpdate((event: any) => {
        // console.log(event.update.sessionUpdate);

        switch (event.update.sessionUpdate) {
          // case 'agent_message_chunk':
          //   if (event.update.content.type === 'text') {
          //     process.stdout.write(event.update.content.text);
          //   }
          //   break;
          case 'tool_call_update':
            resolve(String(event.update.rawOutput?.output || 'Error: Something went wrong'));
            client.close();
            break;
        }
      });

      client
        .prompt(
          `call code-retrieval: ${JSON.stringify(query)}\n\ncall code-retrieval ngay lập tức (không cần câu mở đầu "I'll...", etc).\n\n{`,
        )
        .then(() => {
          client.close();
          resolve('Error: Something went wrong');
        });
    });
  });
}

// Start both MCP server and Express server in parallel
async function main() {
  // Start MCP server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Context Engine MCP server is running...');

  // console.log(await search('thông tin dự án', 'D:\\projects\\NodeJs\\keep-going-mcp'));
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
