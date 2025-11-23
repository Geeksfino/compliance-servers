/**
 * Tool Registration Configuration
 * 
 * CUSTOMIZE: This file controls which MCP-UI tools are registered and loaded.
 * 
 * Example Plugins:
 * Example plugins are located in src/tools/plugins/examples/ and demonstrate:
 * - html-tools.ts: HTML rendering tools (showSimpleHtml, showInteractiveForm, etc.)
 * - url-tools.ts: URL-based tools (showExampleSite, showCustomUrl, showApiDocs)
 * - remote-dom-tools.ts: Remote DOM tools (showRemoteDomButton, showRemoteDomForm)
 * - metadata-tools.ts: Metadata demonstration tools (showWithPreferredSize, showWithRenderData)
 * - async-tools.ts: Async tool call demonstration (showAsyncToolCall, processAsyncRequest)
 * 
 * To customize:
 * - Enable example plugins via CLI: `pnpm dev --enable-examples`
 * - Or set enableExamplePlugins to true in this file
 * - Or set MCPUI_ENABLE_EXAMPLE_PLUGINS=true environment variable
 * - Add custom tool paths to customToolPaths
 * - Add plugin paths to plugins array (or use auto-discovery from src/tools/plugins/)
 */

export interface ToolConfig {
  /**
   * Enable example plugins from src/tools/plugins/examples/
   * These are reference implementations for learning and testing
   */
  enableExamplePlugins: boolean;
  
  /**
   * Custom tool module paths (relative to src/tools/)
   * Each module should export a register function: (server: McpServer) => void
   */
  customToolPaths: string[];
  
  /**
   * Plugin paths (relative to src/tools/plugins/)
   * Each plugin should implement the MCPUIToolPlugin interface
   * If empty, plugins will be auto-discovered from src/tools/plugins/ (excluding examples/)
   */
  plugins: string[];
}

// CUSTOMIZE: Default tool configuration
// 
// NOTE: Example plugins are DISABLED by default.
// They are provided as SAMPLE/REFERENCE implementations in src/tools/plugins/examples/
// for developers to:
// 1. Learn how to create MCP-UI tool plugins
// 2. Test the server during development
// 3. Use as templates for custom tools
//
// To enable example plugins for testing:
//   CLI: pnpm dev --enable-examples (recommended for quick testing)
//   ENV: MCPUI_ENABLE_EXAMPLE_PLUGINS=true
//   Config: enableExamplePlugins: true
//
// For production, keep enableExamplePlugins: false and use your own tools via:
// - customToolPaths: Custom tool modules
// - plugins: Plugin system (recommended - auto-discovered from src/tools/plugins/)
export const toolConfig: ToolConfig = {
  // DISABLED by default - example plugins are for learning/testing only
  enableExamplePlugins: false,
  
  // Add paths to your custom tool modules here
  // Example: ['./custom/my-tools.js']
  customToolPaths: [],
  
  // Add plugin paths here, or use auto-discovery (plugins in src/tools/plugins/)
  // Example: ['my-plugin.js']
  // If empty, all plugins in src/tools/plugins/ (except examples/) will be auto-discovered
  plugins: [],
};

/**
 * Parse command-line arguments for tool configuration
 */
function parseCLIArgs(): { enableExamplePlugins?: boolean } {
  const args = process.argv.slice(2);
  const result: { enableExamplePlugins?: boolean } = {};
  
  // Check for --enable-examples or --with-examples flag
  if (args.includes('--enable-examples') || args.includes('--with-examples')) {
    result.enableExamplePlugins = true;
  }
  
  // Check for --no-examples flag (explicitly disable)
  if (args.includes('--no-examples')) {
    result.enableExamplePlugins = false;
  }
  
  return result;
}

/**
 * Load tool configuration from CLI args, environment, or use defaults
 * 
 * Priority order:
 * 1. Command-line flags (highest priority)
 * 2. Environment variables
 * 3. Config file defaults (lowest priority)
 */
export function loadToolConfig(): ToolConfig {
  const cliArgs = parseCLIArgs();
  
  // Allow enabling example plugins via CLI flag, environment variable, or config
  // Priority: CLI > ENV > Config
  let enableExamplePlugins = toolConfig.enableExamplePlugins;
  
  if (cliArgs.enableExamplePlugins !== undefined) {
    enableExamplePlugins = cliArgs.enableExamplePlugins;
  } else {
    const envEnableExamples = process.env.MCPUI_ENABLE_EXAMPLE_PLUGINS;
    if (envEnableExamples === 'true' || envEnableExamples === '1') {
      enableExamplePlugins = true;
    } else if (envEnableExamples === 'false' || envEnableExamples === '0') {
      enableExamplePlugins = false;
    }
  }
  
  // Allow specifying custom tool paths via environment variable
  // Format: MCPUI_CUSTOM_TOOLS=./custom/tool1.js,./custom/tool2.js
  const envCustomTools = process.env.MCPUI_CUSTOM_TOOLS;
  const customToolPaths = envCustomTools
    ? envCustomTools.split(',').map(p => p.trim())
    : toolConfig.customToolPaths;
  
  // Allow specifying plugin paths via environment variable
  // Format: MCPUI_TOOL_PLUGINS=plugin1.js,plugin2.js
  const envPlugins = process.env.MCPUI_TOOL_PLUGINS;
  const plugins = envPlugins
    ? envPlugins.split(',').map(p => p.trim())
    : toolConfig.plugins;
  
  return {
    enableExamplePlugins,
    customToolPaths,
    plugins,
  };
}


