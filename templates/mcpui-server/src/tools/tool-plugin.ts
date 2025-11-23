/**
 * MCP-UI Tool Plugin Interface
 * 
 * CUSTOMIZE: Implement this interface to create custom tool plugins.
 * 
 * Example plugin structure:
 * ```typescript
 * // src/tools/plugins/my-tools.ts
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import type { MCPUIToolPlugin } from '../tool-plugin.js';
 * 
 * export const myPlugin: MCPUIToolPlugin = {
 *   name: 'my-custom-tools',
 *   version: '1.0.0',
 *   register(server: McpServer) {
 *     server.registerTool('myTool', {
 *       title: 'My Custom Tool',
 *       description: 'Does something useful',
 *       inputSchema: { type: 'object', properties: {} }
 *     }, async (params) => {
 *       // Tool implementation
 *       return { content: [] };
 *     });
 *   }
 * };
 * ```
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Plugin interface for MCP-UI tools
 */
export interface MCPUIToolPlugin {
  /**
   * Plugin name (should be unique)
   */
  name: string;
  
  /**
   * Plugin version (semver format)
   */
  version: string;
  
  /**
   * Optional plugin description
   */
  description?: string;
  
  /**
   * Optional plugin author
   */
  author?: string;
  
  /**
   * Register tools with the MCP server
   * This function is called during server initialization
   * 
   * @param server - MCP server instance
   */
  register(server: McpServer): void | Promise<void>;
}

/**
 * Helper function to validate plugin structure
 * @param plugin - Plugin object to validate
 * @returns true if plugin is valid
 */
export function isValidPlugin(plugin: any): plugin is MCPUIToolPlugin {
  return (
    plugin &&
    typeof plugin === 'object' &&
    typeof plugin.name === 'string' &&
    plugin.name.length > 0 &&
    typeof plugin.version === 'string' &&
    plugin.version.length > 0 &&
    typeof plugin.register === 'function'
  );
}


