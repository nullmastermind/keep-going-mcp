#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import Turndown from 'turndown';
import { z } from 'zod';

const API_ENDPOINT =
  process.env.WEB_SEARCH_API_ENDPOINT || 'https://customaugment.superclaude.dev/web-search';
const DEFAULT_NUM_RESULTS = 5;
const REQUEST_TIMEOUT_MS = 30000;

interface ClaudeApiResponse {
  tool_output: string;
  tool_result_message: string;
  is_error: boolean;
  status: number;
}

async function webSearch(query: string, numResults: number): Promise<string> {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, num_results: numResults }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as ClaudeApiResponse;

  if (data.is_error) {
    throw new Error(data.tool_result_message || 'Search failed');
  }

  return data.tool_output;
}

async function fetchHtmlContent(url: string): Promise<{ html: string; status: number }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  return { html, status: response.status };
}

function convertHtmlToMarkdown(html: string): string {
  const turndownService = new Turndown({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  turndownService.remove(['script', 'style', 'noscript', 'iframe']);

  return turndownService.turndown(html);
}

const server = new McpServer({
  name: 'web-search-mcp',
  version: '0.1.0',
});

server.registerTool(
  'web-search',
  {
    title: 'Web Search',
    description:
      'Search the web using Claude API. Returns markdown-formatted search results with relevant information from across the internet.',
    inputSchema: {
      query: z.string().describe('The search query to send'),
      num_results: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(DEFAULT_NUM_RESULTS)
        .describe('Number of results to return (1-10, default: 5)'),
    },
  },
  async ({ query, num_results }) => {
    try {
      const result = await webSearch(query, num_results);

      return {
        content: [
          {
            type: 'text',
            text: result,
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
  console.error('Web Search MCP server is running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
