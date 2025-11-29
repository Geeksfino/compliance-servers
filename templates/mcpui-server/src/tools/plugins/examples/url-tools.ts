/**
 * EXAMPLE PLUGIN: URL Tools
 * 
 * ⚠️  NOTE: This is an EXAMPLE PLUGIN, NOT enabled by default.
 * 
 * This plugin demonstrates how to create MCP-UI tool plugins that display external URLs.
 * It serves as a reference implementation for developers to learn and test with.
 * 
 * To enable this example plugin for testing:
 * - Edit src/config/tools.ts and set enableExamplePlugins: true
 * - Or set environment variable: MCPUI_ENABLE_EXAMPLE_PLUGINS=true
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createUIResource } from '@mcp-ui/server';
import type { MCPUIToolPlugin } from '../../tool-plugin.js';
import { logger } from '../../../utils/logger.js';

// Zod schema for validation
const customUrlInputSchema = z.object({
  url: z.string().describe('The URL to display (must be https://)'),
});

// Input schema for MCP (using Zod shape to avoid type inference issues)
const customUrlInputSchemaShape = {
  url: z.string().describe('The URL to display (must be https://)'),
} as const;

const emptyInputSchema = z.object({});
const emptyInputSchemaShape = {} as const;

export const urlToolsPlugin: MCPUIToolPlugin = {
  name: 'example-url-tools',
  version: '1.0.0',
  description: 'Example plugin demonstrating external URL tools',
  author: 'MCP-UI Template',
  
  async register(server: McpServer): Promise<void> {
    // Tool 1: Show Example Site
    server.registerTool(
      'showExampleSite',
      {
        title: 'Show Example Site',
        description: 'Displays example.com in an iframe',
        inputSchema: emptyInputSchemaShape as any,
      },
      async (params: unknown) => {
        emptyInputSchema.parse(params);
        logger.info({ tool: 'showExampleSite' }, 'Tool called');

        const uiResource = createUIResource({
          uri: 'ui://external-url/example',
          content: { type: 'externalUrl', iframeUrl: 'https://example.com' },
          encoding: 'text',
        });

        return { content: [uiResource] };
      }
    );

    // Tool 2: Show Custom URL
    server.registerTool(
      'showCustomUrl',
      {
        title: 'Show Custom URL',
        description: 'Displays a custom URL provided by the user',
        inputSchema: customUrlInputSchemaShape as any,
      },
      async (params: unknown) => {
        const { url } = customUrlInputSchema.parse(params);
        logger.info({ tool: 'showCustomUrl', url }, 'Tool called');

        // Validate URL
        if (!url.startsWith('https://')) {
          throw new Error('URL must start with https://');
        }

        const uiResource = createUIResource({
          uri: `ui://external-url/${encodeURIComponent(url)}`,
          content: { type: 'externalUrl', iframeUrl: url },
          encoding: 'text',
        });

        return { content: [uiResource] };
      }
    );

    // Tool 3: Show API Documentation
    server.registerTool(
      'showApiDocs',
      {
        title: 'Show API Documentation',
        description: 'Displays MCP-UI documentation',
        inputSchema: emptyInputSchemaShape as any,
      },
      async (params: unknown) => {
        emptyInputSchema.parse(params);
        logger.info({ tool: 'showApiDocs' }, 'Tool called');

        const uiResource = createUIResource({
          uri: 'ui://external-url/docs',
          content: { type: 'externalUrl', iframeUrl: 'https://mcpui.dev' },
          encoding: 'text',
        });

        return { content: [uiResource] };
      }
    );

    logger.info('✅ Example URL tools plugin registered (3 tools)');
  },
};

export default urlToolsPlugin;

