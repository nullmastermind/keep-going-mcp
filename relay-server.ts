import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Request, Response } from 'express';
import express from 'express';

/**
 * Start the Express relay/proxy server
 * Proxies requests from /:nodeId/* to https://${nodeId}.api.augmentcode.com/${wildcardPath}
 */
export function startRelayServer(): void {
  const app = express();
  const PORT = process.env.PORT || 8188;

  // Middleware to parse JSON and raw body
  app.use(express.json());
  app.use(express.raw({ type: '*/*', limit: '50mb' }));

  // Relay/proxy route
  app.all('/:nodeId/*wildcardPath', async (req: Request, res: Response) => {
    const { nodeId } = req.params;

    // Extract the path after /:nodeId/ from the original URL
    // This avoids Express 5's wildcard behavior of joining segments with commas
    const fullPath = req.path; // e.g., "/d18/agents/list-remote-tools"
    const nodeIdPrefix = `/${nodeId}/`;
    const wildcardPath = fullPath.startsWith(nodeIdPrefix)
      ? fullPath.slice(nodeIdPrefix.length)
      : '';

    const targetUrl = `https://${nodeId}.api.augmentcode.com/${wildcardPath}`;

    console.log('Received request for', JSON.stringify(targetUrl));

    try {
      // Check if this is a chat-stream request - if so, simulate streaming from chunks.json
      const isChatStream = targetUrl.includes('/chat-stream');

      if (isChatStream) {
        // Simulate streaming from chunks.json file
        console.log('Simulating stream from chunks.json');

        const chunksFilePath = join(process.cwd(), 'chunks.json');

        // Check if chunks.json exists
        if (!existsSync(chunksFilePath)) {
          res.status(500).json({ error: 'chunks.json file not found' });
          return;
        }

        // Read chunks from file
        let chunks: Array<{ value: string }>;
        try {
          const fileContent = readFileSync(chunksFilePath, 'utf-8');
          chunks = JSON.parse(fileContent);
          console.log(`Loaded ${chunks.length} chunks from chunks.json`);
        } catch (parseError) {
          console.error('Error reading chunks.json:', parseError);
          res.status(500).json({ error: 'Failed to parse chunks.json' });
          return;
        }

        // Set streaming headers (matching actual API response)
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Handle client disconnect
        let streamCanceled = false;
        req.on('close', () => {
          console.log('Client disconnected, stopping simulated stream');
          streamCanceled = true;
        });

        // Stream chunks immediately without any delays
        console.log('Starting chunk streaming loop (no delays)...');
        try {
          for (let i = 0; i < chunks.length; i++) {
            if (streamCanceled) {
              console.log(`Stream canceled at chunk ${i + 1}/${chunks.length}`);
              break;
            }

            const chunk = chunks[i];
            if (!chunk) {
              console.error(`Chunk at index ${i} is undefined, skipping`);
              continue;
            }

            console.log(
              `[BEFORE WRITE] Chunk ${i + 1}/${chunks.length}, size: ${chunk.value.length} bytes`,
            );

            // Write chunk to response immediately (no delays, no backpressure handling)
            const writeResult = res.write(chunk.value);

            console.log(
              `[AFTER WRITE] Chunk ${i + 1}/${chunks.length}, res.write() returned: ${writeResult}`,
            );
          }

          if (!streamCanceled) {
            console.log('All chunks sent successfully, calling res.end()');
            res.end();
            console.log('res.end() called successfully');
          } else {
            console.log('Stream was canceled, not calling res.end()');
          }
        } catch (streamError) {
          console.error('Simulated stream error:', streamError);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Stream error' });
          } else if (!streamCanceled) {
            res.end();
          }
        }
      } else {
        // For non-chat-stream requests: make the actual proxy request
        // Prepare headers (exclude host header to avoid conflicts)
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.headers)) {
          if (key.toLowerCase() !== 'host' && typeof value === 'string') {
            headers[key] = value;
          } else if (Array.isArray(value)) {
            headers[key] = value.join(', ');
          }
        }

        // Prepare request options
        const requestOptions: RequestInit = {
          method: req.method,
          headers,
        };

        // Add body for non-GET/HEAD requests
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          if (req.body) {
            if (Buffer.isBuffer(req.body)) {
              requestOptions.body = req.body;
            } else if (typeof req.body === 'object') {
              requestOptions.body = JSON.stringify(req.body);
            } else {
              requestOptions.body = req.body;
            }
          }
        }

        // Make the proxy request
        const response = await fetch(targetUrl, requestOptions);

        // Forward response status
        res.status(response.status);

        // Forward response headers
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });

        // For non-SSE: buffer the entire response before sending
        const responseBody = await response.arrayBuffer();

        // Log response body for codebase-retrieval requests
        if (wildcardPath.includes('codebase-retrieval')) {
          console.log(
            'Codebase-retrieval request path:',
            targetUrl,
            JSON.stringify(req.body, null),
          );
          console.log('Response body:', Buffer.from(responseBody).toString('utf-8'));
        }

        res.send(Buffer.from(responseBody));
      }
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Proxy request failed' });
    }
  });

  // Start the server
  app.listen(PORT, () => {
    console.log(`Express relay/proxy server is running on port ${PORT}`);
  });
}
