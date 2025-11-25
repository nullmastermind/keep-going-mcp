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

      // Check if this is an SSE stream
      const isSSE = targetUrl.includes('/chat-stream');

      if (isSSE && response.body) {
        // For SSE: stream the response body directly without buffering
        console.log('Streaming SSE response');

        const reader = response.body.getReader();

        // Handle client disconnect
        req.on('close', () => {
          console.log('Client disconnected, canceling stream');
          reader.cancel();
        });

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log('Stream ended');
              res.end();
              break;
            }

            // Write chunk to response
            res.write(Buffer.from(value));
          }
        } catch (streamError) {
          console.error('Stream error:', streamError);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Stream error' });
          }
        }
      } else {
        // For non-SSE: buffer the entire response before sending
        const responseBody = await response.arrayBuffer();
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
