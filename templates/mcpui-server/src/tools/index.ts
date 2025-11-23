/**
 * Tool Registration
 * 
 * CUSTOMIZE: This file controls tool registration based on configuration.
 * 
 * Tool registration happens in three phases:
 * 1. Example plugins (from src/tools/plugins/examples/ if enabled)
 * 2. Custom tools (from customToolPaths in config)
 * 3. Plugins (from plugins directory or config)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadToolConfig } from '../config/tools.js';
import { loadPlugins, loadSpecificPlugins, loadExamplePlugins } from './plugin-loader.js';
import { logger } from '../utils/logger.js';

/**
 * Register tools based on configuration
 * 
 * @param server - MCP server instance
 */
export async function registerTools(server: McpServer): Promise<void> {
  logger.info('Registering MCP-UI tools...');
  
  // Load configuration
  const config = loadToolConfig();
  
  logger.info(
    {
      enableExamplePlugins: config.enableExamplePlugins,
      customToolsCount: config.customToolPaths.length,
      pluginsCount: config.plugins.length,
    },
    'Tool configuration loaded'
  );
  
  // CUSTOMIZE: Load example plugins if enabled
  if (config.enableExamplePlugins) {
    logger.info('Loading example plugins from src/tools/plugins/examples/...');
    await loadExamplePlugins(server);
  } else {
    logger.debug('Example plugins disabled (set enableExamplePlugins: true to enable)');
  }
  
  // CUSTOMIZE: Load custom tools from specified paths
  if (config.customToolPaths.length > 0) {
    logger.info({ count: config.customToolPaths.length }, 'Loading custom tools...');
    for (const toolPath of config.customToolPaths) {
      try {
        const module = await import(toolPath);
        if (typeof module.register === 'function') {
          await module.register(server);
          logger.info({ toolPath }, 'Custom tool registered');
        } else {
          logger.warn({ toolPath }, 'Custom tool module does not export a register function');
        }
      } catch (error) {
        logger.error(
          {
            toolPath,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to load custom tool'
        );
      }
    }
  }
  
  // CUSTOMIZE: Load plugins
  if (config.plugins.length > 0) {
    // Load specific plugins from config
    await loadSpecificPlugins(server, config.plugins);
  } else {
    // Auto-discover plugins from plugins directory (excluding examples/)
    await loadPlugins(server, undefined, true);
  }
  
  // Final summary
  logger.info('✅ Tool registration completed');
}
