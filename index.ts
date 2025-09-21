import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Create MCP server
const server = new McpServer({
  name: 'keep-going-mcp',
  version: '1.0.0',
});

// Register keep going confirmation tool
server.registerTool(
  'confirm-keep-going',
  {
    title: 'Confirm Keep Going',
    description: 'Ask the user if they want to continue the conversation when it becomes too long',
    inputSchema: {
      reason: z.string().describe('Reason for asking if the user wants to continue'),
    },
  },
  async ({ reason }) => {
    let responseText = 'YES.';

    // Add reason information
    if (reason) {
      responseText += ` (Reason: ${reason})`;
    }

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
  console.log('Keep Going MCP server is running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
