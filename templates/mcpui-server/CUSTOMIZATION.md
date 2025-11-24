# MCP-UI Server Customization Guide

This guide explains how to customize your MCP-UI server to create and manage custom UI tools.

## Quick Start

Your MCP-UI server is fully customizable. The most common customizations are:

1. **Tool Configuration** - Enable/disable tool categories
2. **Custom Tools** - Add your own MCP-UI tools
3. **Plugins** - Create reusable tool plugins
4. **Server Configuration** - Adjust server settings

## Tool Configuration

### Option 1: Edit Configuration File (Recommended)

Edit `src/config/tools.ts`:

```typescript
export const toolConfig: ToolConfig = {
  enabledCategories: ['html', 'url'], // Only enable HTML and URL tools
  customToolPaths: ['./custom/my-tools.js'],
  plugins: ['my-plugin.js'],
};
```

### Option 2: Use Environment Variables

```bash
# Enable specific tool categories
export MCPUI_ENABLED_CATEGORIES=html,url,remote-dom

# Add custom tool paths
export MCPUI_CUSTOM_TOOLS=./custom/tool1.js,./custom/tool2.js

# Add plugins
export MCPUI_TOOL_PLUGINS=plugin1.js,plugin2.js

pnpm run dev
```

### Built-in Tool Categories

| Category | Description | Tools |
|----------|-------------|-------|
| `html` | HTML rendering tools | showSimpleHtml, showInteractiveForm, showComplexLayout, etc. |
| `url` | URL-based tools | showExampleSite, showCustomUrl, showApiDocs |
| `remote-dom` | Remote DOM interactive components | showRemoteDomButton, showRemoteDomForm, etc. |
| `metadata` | Metadata demonstrations | showWithPreferredSize, showWithRenderData |
| `async` | Async tool patterns | showAsyncToolCall, processAsyncRequest |

## Creating Custom Tools

### Method 1: Add to Existing Category Files

Edit one of the existing tool files (e.g., `src/tools/html.ts`):

```typescript
export function registerHTMLTools(server: McpServer): void {
  // ... existing tools ...
  
  // Add your custom tool
  server.registerTool(
    'showCustomWidget',
    {
      title: 'Show Custom Widget',
      description: 'Displays a custom widget with data visualization',
      inputSchema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            description: 'Data to visualize',
          },
        },
      },
    },
    async (params: unknown) => {
      const { data = [] } = params as any;
      
      const htmlString = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Custom Widget</title>
            <style>
              /* Your CSS here */
            </style>
          </head>
          <body>
            <div id="widget">
              <!-- Your HTML here -->
            </div>
            <script>
              // Your JavaScript here
              const data = ${JSON.stringify(data)};
            </script>
          </body>
        </html>
      `;
      
      const uiResource = createUIResource({
        uri: `ui://custom-widget/${Date.now()}`,
        content: { type: 'rawHtml', htmlString },
        encoding: 'text',
      });
      
      return { content: [uiResource] };
    }
  );
}
```

### Method 2: Create a New Tool File

Create `src/tools/custom/my-tools.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createUIResource } from '@mcp-ui/server';
import { logger } from '../utils/logger.js';

export function registerMyTools(server: McpServer): void {
  logger.info('Registering custom tools...');
  
  server.registerTool(
    'myCustomTool',
    {
      title: 'My Custom Tool',
      description: 'Does something amazing',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string' },
        },
      },
    },
    async (params: unknown) => {
      const { input = '' } = params as any;
      
      // Create your UI resource
      const uiResource = createUIResource({
        uri: `ui://my-tool/${Date.now()}`,
        content: {
          type: 'rawHtml',
          htmlString: `<h1>Hello: ${input}</h1>`,
        },
        encoding: 'text',
      });
      
      return { content: [uiResource] };
    }
  );
}
```

Add to `src/config/tools.ts`:

```typescript
customToolPaths: ['./custom/my-tools.js'],
```

Or import and call directly in `src/tools/index.ts`.

### Method 3: Create a Plugin (Recommended)

**📖 See [PLUGIN-DEVELOPMENT.md](./PLUGIN-DEVELOPMENT.md) for the complete plugin development guide.**

Create `src/tools/plugins/my-plugin.ts`:

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createUIResource } from '@mcp-ui/server';
import type { MCPUIToolPlugin } from '../../plugins/tool-plugin.js';

export const myPlugin: MCPUIToolPlugin = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  description: 'My custom tool plugin',
  author: 'Your Name',
  
  register(server: McpServer) {
    server.registerTool(
      'pluginTool',
      {
        title: 'Plugin Tool',
        description: 'A tool from my plugin',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      async (params: unknown) => {
        const uiResource = createUIResource({
          uri: `ui://plugin-tool/${Date.now()}`,
          content: {
            type: 'rawHtml',
            htmlString: '<h1>Plugin Tool Output</h1>',
          },
          encoding: 'text',
        });
        
        return { content: [uiResource] };
      }
    );
  },
};

export default myPlugin;
```

Plugins in `src/tools/plugins/` are automatically discovered and loaded.

## MCP-UI Resource Types

### Raw HTML

```typescript
createUIResource({
  uri: 'ui://my-tool/1',
  content: {
    type: 'rawHtml',
    htmlString: '<h1>Hello</h1>',
  },
  encoding: 'text',
});
```

### External URL

```typescript
createUIResource({
  uri: 'ui://my-tool/2',
  content: {
    type: 'externalUrl',
    url: 'https://example.com',
  },
  encoding: 'text',
});
```

### Remote DOM

```typescript
createUIResource({
  uri: 'ui://my-tool/3',
  content: {
    type: 'remoteDom',
    // Remote DOM content
  },
  encoding: 'text',
});
```

## Tool Input Schemas

Use Zod for schema validation:

```typescript
import { z } from 'zod';

const mySchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'User name',
      minLength: 1,
    },
    age: {
      type: 'number',
      description: 'User age',
      minimum: 0,
      maximum: 150,
    },
    email: {
      type: 'string',
      format: 'email',
    },
  },
  required: ['name', 'email'],
};

// Validate in tool handler
async (params: unknown) => {
  const validated = z.object({
    name: z.string().min(1),
    age: z.number().min(0).max(150).optional(),
    email: z.string().email(),
  }).parse(params);
  
  // Use validated.name, validated.email, etc.
}
```

## Advanced Customization

### Add Metadata

```typescript
createUIResource({
  uri: 'ui://my-tool/1',
  content: { type: 'rawHtml', htmlString: '<h1>Hello</h1>' },
  encoding: 'text',
  metadata: {
    'preferred-frame-size': JSON.stringify({ width: 800, height: 600 }),
    'initial-render-data': JSON.stringify({ theme: 'dark' }),
  },
});
```

### Async Tool Calls

```typescript
server.registerTool('asyncTool', {
  title: 'Async Tool',
  description: 'Demonstrates async patterns',
  inputSchema: { type: 'object', properties: {} },
}, async (params: unknown) => {
  // Long-running operation
  await someAsyncOperation();
  
  const uiResource = createUIResource({
    uri: `ui://async-tool/${Date.now()}`,
    content: { type: 'rawHtml', htmlString: '<h1>Completed</h1>' },
    encoding: 'text',
  });
  
  return { content: [uiResource] };
});
```

### Error Handling

```typescript
async (params: unknown) => {
  try {
    // Validate params
    const validated = mySchema.parse(params);
    
    // Create resource
    const uiResource = createUIResource({
      // ...
    });
    
    return { content: [uiResource] };
  } catch (error) {
    logger.error({ error, params }, 'Tool execution failed');
    
    // Return error UI
    const errorResource = createUIResource({
      uri: `ui://error/${Date.now()}`,
      content: {
        type: 'rawHtml',
        htmlString: `<div style="color: red;">Error: ${error.message}</div>`,
      },
      encoding: 'text',
    });
    
    return { content: [errorResource] };
  }
}
```

## Server Configuration

Environment variables in `src/server.ts`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3100` |
| `HOST` | Server host | `0.0.0.0` |
| `SERVER_NAME` | MCP server name | `mcpui-test-server` |
| `SERVER_VERSION` | MCP server version | `1.0.0` |
| `CORS_ORIGIN` | CORS origin | `*` |
| `SESSION_TIMEOUT` | Session timeout (ms) | `3600000` |
| `MCPUI_ENABLED_CATEGORIES` | Enabled tool categories | (all) |
| `MCPUI_CUSTOM_TOOLS` | Custom tool paths | - |
| `MCPUI_TOOL_PLUGINS` | Plugin paths | - |

## Testing

Test your tools:

```bash
pnpm test
```

Add tests in `src/tools/tools.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createMyTool } from './my-tools.js';

describe('My Custom Tool', () => {
  it('should create a valid UI resource', async () => {
    const result = await createMyTool({ input: 'test' });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('resource');
  });
});
```

## Integration with AG-UI Servers

Your MCP-UI server can be connected to AG-UI servers:

```bash
# In AG-UI server
MCP_SERVER_URL=http://localhost:3100/mcp pnpm run dev --use-llm
```

The LLM will be able to call your custom tools!

## Common Tool Patterns

### Pattern 1: Data Visualization

```typescript
server.registerTool('showChart', {
  title: 'Show Chart',
  description: 'Displays a chart from data',
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'array' },
      chartType: { type: 'string', enum: ['bar', 'line', 'pie'] },
    },
  },
}, async (params: unknown) => {
  const { data, chartType = 'bar' } = params as any;
  
  const htmlString = `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      </head>
      <body>
        <canvas id="chart"></canvas>
        <script>
          const ctx = document.getElementById('chart').getContext('2d');
          new Chart(ctx, {
            type: '${chartType}',
            data: ${JSON.stringify(data)},
          });
        </script>
      </body>
    </html>
  `;
  
  return {
    content: [createUIResource({
      uri: `ui://chart/${Date.now()}`,
      content: { type: 'rawHtml', htmlString },
      encoding: 'text',
    })],
  };
});
```

### Pattern 2: Interactive Form

```typescript
server.registerTool('showForm', {
  title: 'Show Form',
  description: 'Displays an interactive form',
  inputSchema: { type: 'object', properties: { fields: { type: 'array' } } },
}, async (params: unknown) => {
  const { fields = [] } = params as any;
  
  const formHtml = fields.map((field: any) => `
    <div>
      <label>${field.label}</label>
      <input type="${field.type}" name="${field.name}" />
    </div>
  `).join('');
  
  const htmlString = `
    <!DOCTYPE html>
    <html>
      <body>
        <form id="myForm">
          ${formHtml}
          <button type="submit">Submit</button>
        </form>
        <script>
          document.getElementById('myForm').addEventListener('submit', (e) => {
            e.preventDefault();
            // Handle form submission
            alert('Form submitted!');
          });
        </script>
      </body>
    </html>
  `;
  
  return {
    content: [createUIResource({
      uri: `ui://form/${Date.now()}`,
      content: { type: 'rawHtml', htmlString },
      encoding: 'text',
    })],
  };
});
```

## Need Help?

- Check the [MCP-UI Documentation](https://docs.mcp-ui.dev)
- Review built-in tools in `src/tools/` for examples
- See `../../docs/scaffold-guide.md` for scaffold tool usage
- Check the [MCP SDK Documentation](https://docs.modelcontextprotocol.io)


