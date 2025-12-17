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
  name: 'prompt-enhancer-mcp',
  version: '0.0.1',
});

// Register prompt enhancer tool
server.registerTool(
  'enhance-prompt',
  {
    title: 'Enhance Prompt',
    description: `This tool enhances user prompts using Augment's context engine. It:
1. Takes a user request/prompt and searches the codebase for relevant context
2. Uses AI to rewrite the prompt to be clearer, more specific, and less ambiguous
3. Returns an enhanced version of the prompt with better context and specificity
4. Helps improve prompt quality for better AI responses`,
    inputSchema: {
      project_root: z
        .string()
        .describe('The absolute project root directory path (full path, not relative)'),
      user_request: z.string().describe('The user request/prompt to enhance.'),
    },
  },
  async ({ project_root: projectRoot, user_request: userRequest }) => {
    return {
      content: [
        {
          type: 'text',
          text: await enhancePrompt(userRequest, projectRoot),
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

// Regex for extracting enhanced prompt from AI response
const ENHANCED_PROMPT_REGEX = /<enhanced-prompt>([\s\S]*?)<\/enhanced-prompt>/;

function parseEnhancedPrompt(response: string): string | null {
  const match = response.match(ENHANCED_PROMPT_REGEX);
  if (match?.[1]) {
    return match[1].trim();
  }
  return null;
}

async function enhancePrompt(userRequest: string, projectRoot: string): Promise<string> {
  const maxAttempts = 3;

  try {
    const resolvedRoot = resolveProjectRoot(projectRoot);
    const context = await getOrCreateContext(resolvedRoot);

    // Build the enhancement instruction
    const enhancementPrompt =
      "Here is an instruction that I'd like to give you, but it needs to be improved. " +
      'Rewrite and enhance this instruction to make it clearer, more specific, ' +
      'less ambiguous, and correct any mistakes. ' +
      'If there is code in triple backticks (```) consider whether it is a code sample and should remain unchanged. ' +
      'Reply with the following format:\n\n' +
      '### BEGIN RESPONSE ###\n' +
      'Here is an enhanced version of the original instruction that is more specific and clear:\n' +
      '<enhanced-prompt>enhanced prompt goes here</enhanced-prompt>\n\n' +
      '### END RESPONSE ###\n\n' +
      'Here is my original instruction:\n\n' +
      userRequest;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Use searchAndAsk to get the enhancement with relevant codebase context
      // The original prompt is used as the search query to find relevant code
      const response = await context.searchAndAsk(userRequest, enhancementPrompt);

      // console.log(response);

      // Parse the enhanced prompt from the response
      const enhanced = parseEnhancedPrompt(response);
      if (enhanced) {
        return enhanced;
      }
    }

    throw new Error('Failed to parse enhanced prompt from response');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error during prompt enhancement: ${errorMessage}`;
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

  // Test the enhancePrompt function
  // const testUserRequest = "thông tin dự án";
  // const testProjectRoot = "D:\\projects\\NodeJs\\keep-going-mcp";
  // console.log('Testing enhancePrompt with:', { userRequest: testUserRequest, projectRoot: testProjectRoot });
  // enhancePrompt(testUserRequest, testProjectRoot)
  //   .then(result => {
  //     console.log('Enhanced prompt result:', result);
  //   })
  //   .catch(error => {
  //     console.error('Error testing enhancePrompt:', error);
  //   });

  // console.log('Prompt Enhancer MCP server is running...');
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
