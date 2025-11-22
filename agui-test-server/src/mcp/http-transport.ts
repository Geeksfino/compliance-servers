/**
 * HTTP-based MCP Client Transport for network communication with MCP servers
 * 
 * This transport enables agui-test-server to communicate with mcpui-test-server
 * over HTTP, which is suitable for cloud deployments where both servers run
 * as independent long-running processes.
 */

import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';

export interface HTTPClientTransportConfig {
  /** Base URL of the MCP server (e.g., http://localhost:3100/mcp) */
  url: string;
  /** Additional headers to include in requests */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * HTTP Client Transport for MCP Protocol
 * 
 * Communicates with MCP servers via HTTP POST requests, maintaining
 * session state through the mcp-session-id header.
 */
export class HTTPClientTransport implements Transport {
  private url: string;
  private headers: Record<string, string>;
  private timeout: number;
  private _sessionId?: string;
  private abortController?: AbortController;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(config: HTTPClientTransportConfig) {
    this.url = config.url;
    this.headers = config.headers || {};
    this.timeout = config.timeout || 30000;
  }

  /**
   * Start the transport (no-op for HTTP, connection established on first request)
   */
  async start(): Promise<void> {
    logger.debug({ url: this.url }, 'HTTP transport ready');
  }

  /**
   * Send a message to the MCP server
   */
  async send(message: JSONRPCMessage): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      ...this.headers,
    };

    // Include session ID in header if we have one
    if (this._sessionId) {
      headers['mcp-session-id'] = this._sessionId;
    }

    const abortController = new AbortController();
    this.abortController = abortController;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.timeout);

    try {
      // Type guard to get method and id
      const method = 'method' in message ? message.method : undefined;
      const id = 'id' in message ? message.id : undefined;
      
      logger.debug(
        { 
          url: this.url, 
          method,
          id,
          hasSessionId: !!this._sessionId 
        },
        'Sending HTTP request to MCP server'
      );

      const response = await fetch(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      // Capture session ID from response header (for initialize request)
      const sessionId = response.headers.get('mcp-session-id');
      if (sessionId && !this._sessionId) {
        this._sessionId = sessionId;
        logger.info({ sessionId }, 'MCP session established via HTTP');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      // Handle SSE response format from StreamableHTTPServerTransport
      const contentType = response.headers.get('content-type') || '';
      let responseData: any;
      
      if (contentType.includes('text/event-stream')) {
        // Parse SSE format: "event: message\ndata: {json}\n\n"
        const text = await response.text();
        const dataMatch = text.match(/data:\s*({.*})/);
        if (dataMatch) {
          responseData = JSON.parse(dataMatch[1]);
        } else if (text.trim() === '') {
          // Empty response for notifications (no response expected)
          logger.debug({ method }, 'Notification sent (no response expected)');
          return;
        } else {
          throw new Error('Failed to parse SSE response');
        }
      } else {
        // Standard JSON response
        const text = await response.text();
        if (text.trim() === '') {
          // Empty response for notifications
          logger.debug({ method }, 'Notification sent (no response expected)');
          return;
        }
        responseData = JSON.parse(text);
      }
      
      // Safe type check for result
      const hasResult = typeof responseData === 'object' && responseData !== null && 'result' in responseData;
      
      logger.debug(
        { 
          method,
          id,
          hasResult
        },
        'Received HTTP response from MCP server'
      );

      // Deliver response message
      if (this.onmessage) {
        this.onmessage(responseData as JSONRPCMessage);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      const method = 'method' in message ? message.method : undefined;
      
      logger.error(
        {
          url: this.url,
          method,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'HTTP request to MCP server failed'
      );

      if (this.onerror) {
        this.onerror(error as Error);
      }
      throw error;
    }
  }

  /**
   * Close the transport and clean up session
   */
  async close(): Promise<void> {
    // Abort any pending requests
    if (this.abortController) {
      this.abortController.abort();
    }
    
    // Send DELETE request to close session on server
    if (this._sessionId) {
      try {
        logger.debug({ sessionId: this._sessionId }, 'Closing MCP session via HTTP');
        
        await fetch(this.url, {
          method: 'DELETE',
          headers: {
            'mcp-session-id': this._sessionId,
          },
        });
        
        logger.info({ sessionId: this._sessionId }, 'MCP session closed via HTTP');
      } catch (error) {
        // Ignore errors on close - session might already be expired
        logger.debug(
          { 
            sessionId: this._sessionId,
            error: error instanceof Error ? error.message : 'Unknown error' 
          },
          'Error closing MCP session (may already be closed)'
        );
      }
      
      this._sessionId = undefined;
    }

    if (this.onclose) {
      this.onclose();
    }
  }
}
