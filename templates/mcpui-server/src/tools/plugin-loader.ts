/**
 * Plugin Loader for MCP-UI Tools
 * 
 * CUSTOMIZE: This loader automatically discovers and loads tool plugins.
 * 
 * Plugin discovery:
 * 1. Scans src/tools/plugins/ directory for .js/.ts files
 * 2. Loads each plugin module
 * 3. Validates plugin structure
 * 4. Registers tools with MCP server
 * 
 * To add a plugin:
 * 1. Create a .ts file in src/tools/plugins/
 * 2. Export a plugin object implementing MCPUIToolPlugin
 * 3. The loader will automatically discover and load it
 */

import { readdirSync, statSync, type Dirent } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MCPUIToolPlugin } from './tool-plugin.js';
import { isValidPlugin } from './tool-plugin.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load and register plugins from a directory
 * 
 * @param server - MCP server instance
 * @param pluginDir - Directory containing plugin files (default: src/tools/plugins/)
 * @param excludeExamples - If true, exclude plugins from examples/ subdirectory (default: true)
 */
export async function loadPlugins(
  server: McpServer,
  pluginDir: string = join(__dirname, 'plugins'),
  excludeExamples: boolean = true
): Promise<void> {
  try {
    // Check if plugin directory exists
    try {
      statSync(pluginDir);
    } catch {
      logger.info({ pluginDir }, 'Plugin directory not found, skipping plugin loading');
      return;
    }
    
    const files = readdirSync(pluginDir, { withFileTypes: true });
    let pluginFiles = files
      .filter(dirent => dirent.isFile() && (dirent.name.endsWith('.js') || dirent.name.endsWith('.ts')) && !dirent.name.endsWith('.d.ts') && dirent.name !== '.gitkeep')
      .map(dirent => dirent.name);
    
    // If excluding examples, also filter out any files in the examples subdirectory
    // (This shouldn't happen when loading from examples dir itself, but included for safety)
    if (excludeExamples) {
      const examplesPath = join(pluginDir, 'examples');
      try {
        const examplesStat = statSync(examplesPath);
        if (examplesStat.isDirectory()) {
          // Don't process the examples directory - it's handled separately
          logger.debug('Skipping examples directory (will be loaded separately if enabled)');
        }
      } catch {
        // Examples directory doesn't exist, continue
      }
    }
    
    if (pluginFiles.length === 0) {
      logger.info({ pluginDir }, 'No plugin files found');
      return;
    }
    
    logger.info({ pluginDir, count: pluginFiles.length }, 'Loading plugins...');
    
    for (const file of pluginFiles) {
      try {
        const pluginPath = join(pluginDir, file);
        logger.debug({ pluginPath }, 'Loading plugin file');
        
        // Dynamic import
        const module = await import(pluginPath);
        
        // Try to find the plugin export
        // Support: export default plugin, export const plugin, or named exports
        let plugin: MCPUIToolPlugin | undefined;
        
        if (module.default && isValidPlugin(module.default)) {
          plugin = module.default;
        } else if (module.plugin && isValidPlugin(module.plugin)) {
          plugin = module.plugin;
        } else {
          // Try to find any valid plugin export
          for (const key of Object.keys(module)) {
            if (isValidPlugin(module[key])) {
              plugin = module[key];
              break;
            }
          }
        }
        
        if (!plugin) {
          logger.warn({ file }, 'Plugin file does not export a valid plugin');
          continue;
        }
        
        logger.info(
          {
            file,
            pluginName: plugin.name,
            pluginVersion: plugin.version,
            pluginDescription: plugin.description,
          },
          'Registering plugin'
        );
        
        // Register the plugin
        await plugin.register(server);
        
        logger.info(
          { pluginName: plugin.name, pluginVersion: plugin.version },
          '✅ Plugin registered successfully'
        );
      } catch (error) {
        logger.error(
          {
            file,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
          },
          '❌ Failed to load plugin'
        );
      }
    }
  } catch (error) {
    logger.error(
      {
        pluginDir,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error loading plugins'
    );
  }
}

/**
 * Load example plugins from src/tools/plugins/examples/
 * 
 * @param server - MCP server instance
 */
export async function loadExamplePlugins(server: McpServer): Promise<void> {
  const examplesDir = join(__dirname, 'plugins', 'examples');
  
  try {
    statSync(examplesDir);
  } catch {
    logger.info({ examplesDir }, 'Example plugins directory not found, skipping');
    return;
  }
  
  logger.info({ examplesDir }, 'Loading example plugins...');
  
  // Load plugins from examples directory (don't exclude examples this time)
  await loadPlugins(server, examplesDir, false);
  
  logger.info('✅ Example plugins loaded');
}

/**
 * Load specific plugins by path
 * 
 * @param server - MCP server instance
 * @param pluginPaths - Array of plugin file paths (relative to src/tools/plugins/)
 */
export async function loadSpecificPlugins(
  server: McpServer,
  pluginPaths: string[]
): Promise<void> {
  if (pluginPaths.length === 0) {
    return;
  }
  
  logger.info({ count: pluginPaths.length }, 'Loading specific plugins...');
  
  for (const pluginPath of pluginPaths) {
    try {
      // Resolve relative path
      const fullPath = pluginPath.startsWith('.')
        ? join(__dirname, 'plugins', pluginPath)
        : pluginPath;
      
      logger.debug({ pluginPath: fullPath }, 'Loading plugin');
      
      const module = await import(fullPath);
      
      // Find plugin export
      let plugin: MCPUIToolPlugin | undefined;
      
      if (module.default && isValidPlugin(module.default)) {
        plugin = module.default;
      } else if (module.plugin && isValidPlugin(module.plugin)) {
        plugin = module.plugin;
      } else {
        for (const key of Object.keys(module)) {
          if (isValidPlugin(module[key])) {
            plugin = module[key];
            break;
          }
        }
      }
      
      if (!plugin) {
        logger.warn({ pluginPath }, 'Plugin does not export a valid plugin');
        continue;
      }
      
      logger.info(
        {
          pluginPath,
          pluginName: plugin.name,
          pluginVersion: plugin.version,
        },
        'Registering specific plugin'
      );
      
      await plugin.register(server);
      
      logger.info(
        { pluginName: plugin.name, pluginVersion: plugin.version },
        '✅ Specific plugin registered successfully'
      );
    } catch (error) {
      logger.error(
        {
          pluginPath,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        '❌ Failed to load specific plugin'
      );
    }
  }
}


