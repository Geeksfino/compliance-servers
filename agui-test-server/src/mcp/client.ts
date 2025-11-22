/**
 * MCP Client for calling MCP-UI servers
 * Supports both stdio (for local/development) and HTTP (for cloud/production) transports
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { HTTPClientTransport } from './http-transport.js';
import { logger } from '../utils/logger.js';

export interface MCPClientConfig {
  // For stdio transport (local/development)
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  
  // For HTTP transport (cloud/production)
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface MCPToolCallResult {
  content?: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
    resource?: any;
    [key: string]: unknown;
  }>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
  [key: string]: unknown;
}

export class MCPClientManager {
  private clients: Map<string, Client> = new Map();

  /**
   * Connect to an MCP server
   */
  async connect(serverId: string, config: MCPClientConfig): Promise<void> {
    if (this.clients.has(serverId)) {
      logger.debug({ serverId }, 'MCP client already connected');
      return;
    }

    try {
      let transport;
      let transportType: string;
      
      // Determine which transport to use based on configuration
      if (config.url) {
        // Use HTTP transport for cloud/network communication
        transportType = 'http';
        transport = new HTTPClientTransport({
          url: config.url,
          headers: config.headers,
          timeout: config.timeout,
        });
        logger.info({ serverId, url: config.url }, 'Using HTTP transport for MCP connection');
      } else if (config.command) {
        // Use stdio transport for local/process communication
        transportType = 'stdio';
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
          env: config.env,
        });
        logger.info({ serverId, command: config.command }, 'Using stdio transport for MCP connection');
      } else {
        throw new Error('MCP client config must provide either url (HTTP) or command (stdio)');
      }

      const client = new Client(
        {
          name: 'agui-test-server',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);
      this.clients.set(serverId, client);

      logger.info({ serverId, transport: transportType }, 'Connected to MCP server');
    } catch (error) {
      logger.error(
        {
          serverId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to connect to MCP server'
      );
      throw error;
    }
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolCallResult> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`MCP client not connected: ${serverId}`);
    }

    try {
      logger.debug(
        { serverId, toolName, args },
        'Calling MCP tool'
      );

      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      logger.debug(
        {
          serverId,
          toolName,
          contentCount: (result as any).content?.length || 0,
        },
        'MCP tool call completed'
      );

      return result as MCPToolCallResult;
    } catch (error) {
      logger.error(
        {
          serverId,
          toolName,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'MCP tool call failed'
      );
      throw error;
    }
  }

  /**
   * List available tools from an MCP server
   */
  async listTools(serverId: string): Promise<MCPTool[]> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`MCP client not connected: ${serverId}`);
    }

    try {
      const result = await client.listTools();
      return (result.tools || []) as MCPTool[];
    } catch (error) {
      logger.error(
        {
          serverId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to list MCP tools'
      );
      throw error;
    }
  }

  /**
   * Check if a client is connected
   */
  isConnected(serverId: string): boolean {
    return this.clients.has(serverId);
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (!client) {
      return;
    }

    try {
      await client.close();
      this.clients.delete(serverId);
      logger.info({ serverId }, 'Disconnected from MCP server');
    } catch (error) {
      logger.error(
        {
          serverId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error disconnecting from MCP server'
      );
    }
  }

  /**
   * Disconnect all clients
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.keys()).map((serverId) =>
      this.disconnect(serverId)
    );
    await Promise.all(disconnectPromises);
  }
}

// Singleton instance
export const mcpClientManager = new MCPClientManager();
