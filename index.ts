#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import TurndownService from 'turndown';
import { z } from 'zod';

function getApiKeys(): string[] {
  const apiKeyEnv = process.env.SEARCHAPI_IO_API_KEY;
  if (!apiKeyEnv) {
    return [];
  }
  return apiKeyEnv
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
}

async function searchWithRetry(query: string): Promise<unknown> {
  const apiKeys = getApiKeys();

  if (apiKeys.length === 0) {
    throw new Error(
      'SEARCHAPI_IO_API_KEY environment variable is not set. Please configure at least one API key.',
    );
  }

  const usedKeys = new Set<string>();
  const availableKeys = [...apiKeys];

  while (availableKeys.length > 0) {
    const keyIndex = Math.floor(Math.random() * availableKeys.length);
    const apiKey = availableKeys[keyIndex] as string;
    availableKeys.splice(keyIndex, 1);
    usedKeys.add(apiKey);

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.searchapi.io/api/v1/search?engine=google_ai_mode&q=${encodedQuery}&api_key=${apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          `API key failed with status ${response.status}: ${apiKey.substring(0, 8)}...`,
        );
        continue;
      }

      const data = await response.json();

      if (data && typeof data === 'object' && 'error' in data && data.error) {
        console.error(`API key returned error: ${apiKey.substring(0, 8)}... - ${data.error}`);
        continue;
      }

      return data;
    } catch (error) {
      console.error(
        `API key encountered error: ${apiKey.substring(0, 8)}... - ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error('All API keys failed. Please check your API keys and network connection.');
}

async function fetchHtmlContent(url: string): Promise<{ html: string; status: number }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  return { html, status: response.status };
}

function convertHtmlToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  turndownService.remove(['script', 'style', 'noscript', 'iframe']);

  return turndownService.turndown(html);
}

const server = new McpServer({
  name: 'ai-search-mcp',
  version: '1.0.0',
});

server.registerTool(
  'web-search',
  {
    title: 'Web Search',
    description:
      'Search for content using AI-powered search that understands natural language queries. Does not require exact keyword matching - provide queries with sufficient context and the AI search engine will understand the intent. Natural language queries with context are preferred over strict keyword-based searches.',
    inputSchema: {
      query: z
        .string()
        .describe(
          'Natural language search query with context. The AI search engine will understand the intent and context without requiring exact keyword matching.',
        ),
    },
  },
  async ({ query }) => {
    try {
      const response = await searchWithRetry(query);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error),
                query,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }
  },
);

server.registerTool(
  'web-fetch',
  {
    title: 'Web Fetch',
    description: 'Fetch content from a specific URL and convert to Markdown',
    inputSchema: {
      url: z.string().describe('The URL to fetch content from'),
    },
  },
  async ({ url }) => {
    try {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        throw new Error(`Invalid URL format: ${url}`);
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
      }

      const { html, status } = await fetchHtmlContent(url);
      const markdown = convertHtmlToMarkdown(html);

      const response = {
        url,
        status,
        content: markdown,
        fetchedAt: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error),
                url,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AI Search MCP server is running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
