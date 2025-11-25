#!/usr/bin/env node

import { Auggie } from '@augmentcode/auggie-sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { startRelayServer } from './relay-server.js';

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
    // Extract subdomain from AUGMENT_API_URL (e.g., "d1" from "https://d1.api.augmentcode.com/")
    const extractSubdomain = (url: string | undefined): string => {
      if (!url) return 'd1'; // Default fallback
      const match = url.match(/https?:\/\/([^.]+)\.api\.augmentcode\.com/);
      return match?.[1] ?? 'd1'; // Return extracted subdomain or default
    };

    const subdomain = extractSubdomain(process.env.AUGMENT_API_URL);

    Auggie.create({
      // auggiePath: 'node augment.mjs',
      model: 'haiku4.5',
      workspaceRoot: projectRoot,
      allowIndexing: true,
      // apiUrl: `http://localhost:${process.env.PORT || 8188}/${subdomain}/`,
      // apiKey: process.env.AUGMENT_API_TOKEN,
    }).then((client: any) => {
      let result = '';

      client.onSessionUpdate((event: any) => {
        // console.log(event.update.sessionUpdate);
        switch (event.update.sessionUpdate) {
          // case 'agent_message_chunk':
          //   if (event.update.content.type === 'text') {
          //     process.stdout.write(event.update.content.text);
          //     // result += event.update.content.text;
          //   }
          //   break;
          case 'tool_call_update':
            // resolve(String(event.update.rawOutput?.output || 'Error: Something went wrong'));
            // client.close();
            result += String(event.update.rawOutput?.output || '');
            if (result.includes("Path:")) {
              resolve(result);
              client.close();
            }
            break;
        }
      });

      client
        .prompt(`call codebase-retrieval: information_request=${JSON.stringify(query)}`)
        .then(() => {
          client.close();
          resolve(result || 'Error: Something went wrong');
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

  // startRelayServer();

  // setTimeout(async () => {
    console.log(await search('thông tin dự án', 'D:\\projects\\NodeJs\\keep-going-mcp'));
  // }, 2000);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
