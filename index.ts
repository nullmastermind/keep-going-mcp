#!/usr/bin/env node

import { existsSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { FileSystemContext } from '@augmentcode/auggie-sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Cache for FileSystemContext instances to prevent duplicate initialization errors
const contextCache = new Map<string, Awaited<ReturnType<typeof FileSystemContext.create>>>();

// Create MCP server
const server = new McpServer({
  name: 'context-engine-mcp',
  version: '0.0.6',
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
      project_root: z
        .string()
        .describe('The absolute project root directory path (full path, not relative)'),
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

/**
 * Resolves the project root directory by checking if the path exists.
 * If not, traverses up the directory tree (up to 3 levels) to find an existing parent directory.
 * Throws an error if no existing directory is found.
 */
function resolveProjectRoot(projectRoot: string): string {
  const maxTraversalLevels = 3;
  let currentPath = projectRoot;

  for (let level = 0; level < maxTraversalLevels; level++) {
    if (existsSync(currentPath) && statSync(currentPath).isDirectory()) {
      return currentPath;
    }

    const parentPath = dirname(currentPath);
    // Stop if we've reached the root (parent is the same as current)
    if (parentPath === currentPath) {
      break;
    }
    currentPath = parentPath;
  }

  throw new Error(
    `Project root directory not found. Checked "${projectRoot}" and up to ${maxTraversalLevels} parent directories. root: ${projectRoot}`,
  );
}

/**
 * Gets or creates a FileSystemContext for the given project directory.
 * Caches contexts to prevent duplicate initialization errors.
 */
async function getOrCreateContext(
  resolvedRoot: string,
): Promise<Awaited<ReturnType<typeof FileSystemContext.create>>> {
  const cached = contextCache.get(resolvedRoot);
  if (cached) {
    return cached;
  }

  const context = await FileSystemContext.create({
    directory: resolvedRoot,
  });
  contextCache.set(resolvedRoot, context);
  return context;
}

async function search(query: string, projectRoot: string): Promise<string> {
  const maxAttempts = 3;

  try {
    const resolvedRoot = resolveProjectRoot(projectRoot);
    const context = await getOrCreateContext(resolvedRoot);

    let results = '';
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      results = await context.search(query);

      if (results.includes('Path:')) {
        return results;
      }
    }

    // Return last result even if it doesn't contain "Path:"
    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error during codebase retrieval: ${errorMessage}`;
  }
}

/**
 * Closes all cached FileSystemContext instances to prevent memory leaks.
 */
async function closeAllContexts(): Promise<void> {
  const closePromises = Array.from(contextCache.values()).map((context) => context.close());
  await Promise.all(closePromises);
  contextCache.clear();
}

// Start MCP server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Context Engine MCP server is running...');
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  await closeAllContexts();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeAllContexts();
  process.exit(0);
});

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
