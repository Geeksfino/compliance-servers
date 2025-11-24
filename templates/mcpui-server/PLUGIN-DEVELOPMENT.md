# MCP-UI Plugin Development Guide

This guide explains how to develop custom MCP-UI tool plugins for your server. Plugins are the recommended way to add custom tools that generate interactive UI resources.

## Table of Contents

- [Overview](#overview)
- [Plugin System Architecture](#plugin-system-architecture)
- [Quick Start](#quick-start)
- [Plugin Interface](#plugin-interface)
- [Creating Your First Plugin](#creating-your-first-plugin)
- [MCP-UI Resource Types](#mcp-ui-resource-types)
- [Input Schema with Zod](#input-schema-with-zod)
- [Best Practices](#best-practices)
- [Testing Plugins](#testing-plugins)
- [Plugin Discovery](#plugin-discovery)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Overview

### What is a Plugin?

A plugin is a self-contained module that registers one or more MCP-UI tools with the server. Plugins are:

- **Modular**: Each plugin is a separate file
- **Auto-discoverable**: Placed in `src/tools/plugins/` and automatically loaded
- **Reusable**: Can be shared across projects
- **Type-safe**: Full TypeScript support with interface validation

### Why Use Plugins?

1. **Organization**: Keep related tools together in one module
2. **Reusability**: Share plugins across projects
3. **Maintainability**: Easier to manage and test
4. **Auto-discovery**: No manual registration needed
5. **Isolation**: Each plugin is independent

## Plugin System Architecture

```
src/tools/
├── tool-plugin.ts          # Plugin interface definition
├── plugin-loader.ts        # Auto-discovery and loading logic
├── index.ts                # Tool registration orchestrator
└── plugins/                # 🎯 Put your plugins here
    ├── examples/           # Example plugins (reference only)
    │   ├── html-tools.ts
    │   ├── url-tools.ts
    │   └── ...
    └── my-plugin.ts        # 🎯 Your custom plugins
```

### How Plugins Are Loaded

1. **Example Plugins** (optional): Loaded from `src/tools/plugins/examples/` if enabled
2. **Custom Tools**: Loaded from `customToolPaths` in config
3. **Your Plugins**: Auto-discovered from `src/tools/plugins/` (excluding `examples/`)

## Quick Start

### Step 1: Create Plugin File

Create `src/tools/plugins/my-first-plugin.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createUIResource } from '@mcp-ui/server';
import type { MCPUIToolPlugin } from '../tool-plugin.js';
import { logger } from '../../../utils/logger.js';

export const myFirstPlugin: MCPUIToolPlugin = {
  name: 'my-first-plugin',
  version: '1.0.0',
  description: 'My first MCP-UI plugin',
  author: 'Your Name',
  
  async register(server: McpServer): Promise<void> {
    server.registerTool(
      'myFirstTool',
      {
        title: 'My First Tool',
        description: 'A simple tool that displays a greeting',
        inputSchema: {},
      },
      async (params: unknown) => {
        logger.info({ tool: 'myFirstTool' }, 'Tool called');
        
        const uiResource = createUIResource({
          uri: 'ui://my-tool/1',
          content: {
            type: 'rawHtml',
            htmlString: '<h1>Hello from my first plugin!</h1>',
          },
          encoding: 'text',
        });
        
        return { content: [uiResource] };
      }
    );
    
    logger.info('✅ My first plugin registered (1 tool)');
  },
};

export default myFirstPlugin;
```

### Step 2: Restart Server

The plugin will be automatically discovered and loaded:

```bash
pnpm dev
```

### Step 3: Test Your Plugin

Your tool is now available! The LLM agent can call it:

```bash
# From your client or test script
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "test",
    "messages": [{
      "role": "user",
      "content": "Use myFirstTool to display a greeting"
    }]
  }'
```

## Plugin Interface

### Required Fields

```typescript
export interface MCPUIToolPlugin {
  name: string;        // Unique plugin identifier
  version: string;     // Semantic version (e.g., "1.0.0")
  register(server: McpServer): void | Promise<void>;  // Registration function
}
```

### Optional Fields

```typescript
{
  description?: string;  // Plugin description
  author?: string;       // Plugin author name
}
```

### Complete Example

```typescript
export const myPlugin: MCPUIToolPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'Plugin that provides custom UI tools',
  author: 'Your Name',
  
  async register(server: McpServer): Promise<void> {
    // Register your tools here
  },
};
```

## Creating Your First Plugin

### Example: KYC Form Plugin

Let's create a plugin for a KYC (Know Your Customer) form:

**File**: `src/tools/plugins/kyc-tools.ts`

```typescript
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createUIResource } from '@mcp-ui/server';
import type { MCPUIToolPlugin } from '../tool-plugin.js';
import { logger } from '../../../utils/logger.js';

// Input schema for the KYC form tool
const kycFormInputSchema = {};

// Input schema for processing KYC submission
const kycSubmissionInputSchema = {
  personalInfo: z.object({
    fullName: z.string(),
    email: z.string().email(),
    phone: z.string(),
  }),
  // ... more fields
};

export const kycToolsPlugin: MCPUIToolPlugin = {
  name: 'kyc-tools',
  version: '1.0.0',
  description: 'KYC tools for customer onboarding',
  author: 'Your Team',
  
  async register(server: McpServer): Promise<void> {
    // Tool 1: Display KYC Form
    server.registerTool(
      'showKYCForm',
      {
        title: 'Show KYC Form',
        description: 'Displays a comprehensive KYC form for customer onboarding',
        inputSchema: kycFormInputSchema,
      },
      async (params: unknown) => {
        logger.info({ tool: 'showKYCForm' }, 'KYC form requested');
        
        // Generate HTML form
        const formHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>KYC Form</title>
  <style>
    /* Your styles here */
  </style>
</head>
<body>
  <form id="kycForm">
    <!-- Form fields -->
  </form>
  <script>
    // Form handling logic
  </script>
</body>
</html>
        `;
        
        const uiResource = createUIResource({
          uri: 'ui://kyc-form/1',
          content: { type: 'rawHtml', htmlString: formHtml },
          encoding: 'blob',  // Use blob for larger HTML
        });
        
        return { content: [uiResource] };
      }
    );
    
    // Tool 2: Process KYC Submission
    server.registerTool(
      'processKYCSubmission',
      {
        title: 'Process KYC Submission',
        description: 'Processes and validates KYC form submissions',
        inputSchema: kycSubmissionInputSchema,
      },
      async (params: unknown) => {
        const parsed = z.object(kycSubmissionInputSchema).parse(params);
        
        logger.info(
          { tool: 'processKYCSubmission', email: parsed.personalInfo.email },
          'Processing KYC submission'
        );
        
        // Validate and process
        // ... your processing logic ...
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'submitted',
                kycId: 'KYC-' + Date.now(),
                message: 'KYC information received and is being reviewed.',
              }),
            },
          ],
        };
      }
    );
    
    logger.info('✅ KYC tools plugin registered (2 tools)');
  },
};

export default kycToolsPlugin;
```

## MCP-UI Resource Types

### 1. Raw HTML

For custom HTML content:

```typescript
createUIResource({
  uri: 'ui://my-tool/1',
  content: {
    type: 'rawHtml',
    htmlString: '<h1>Hello World</h1>',
  },
  encoding: 'text',  // or 'blob' for larger content
});
```

**When to use**: Custom UI components, forms, dashboards, visualizations

### 2. External URL

For displaying external websites:

```typescript
createUIResource({
  uri: 'ui://my-tool/2',
  content: {
    type: 'externalUrl',
    iframeUrl: 'https://example.com',
  },
  encoding: 'text',
});
```

**When to use**: Embedding external websites, documentation, dashboards

### 3. Remote DOM

For framework-agnostic interactive components:

```typescript
createUIResource({
  uri: 'ui://my-tool/3',
  content: {
    type: 'remoteDom',
    framework: 'react',  // or 'webcomponents'
    // Remote DOM content
  },
  encoding: 'text',
});
```

**When to use**: Framework-specific components, complex interactions

## Input Schema with Zod

### Why Zod?

Zod provides:
- **Type safety**: Compile-time and runtime validation
- **Rich validation**: Email, URL, min/max, custom validators
- **Auto-generated descriptions**: For LLM tool calling
- **Error messages**: Clear validation errors

### Basic Schema

```typescript
import { z } from 'zod';

const myToolInputSchema = {
  name: z.string().min(1).describe('User name'),
  email: z.string().email().describe('Email address'),
  age: z.number().int().min(0).max(150).optional().describe('Age'),
};

server.registerTool('myTool', {
  title: 'My Tool',
  description: 'Does something',
  inputSchema: myToolInputSchema,
}, async (params: unknown) => {
  // Validate and parse
  const parsed = z.object(myToolInputSchema).parse(params);
  
  // Use parsed.name, parsed.email, parsed.age
});
```

### Advanced Schema Patterns

```typescript
// Array validation
const arraySchema = {
  items: z.array(z.string()).min(1).describe('List of items'),
};

// Enum validation
const enumSchema = {
  status: z.enum(['active', 'inactive', 'pending']).describe('Status'),
};

// Nested objects
const nestedSchema = {
  user: z.object({
    name: z.string(),
    email: z.string().email(),
  }).describe('User information'),
};

// Conditional validation
const conditionalSchema = {
  type: z.enum(['individual', 'company']),
  // If type is 'company', companyName is required
  companyName: z.string().optional(),
};

// Validate conditionally
const parsed = z.object(conditionalSchema).parse(params);
if (parsed.type === 'company' && !parsed.companyName) {
  throw new Error('companyName is required for company type');
}
```

## Best Practices

### 1. Plugin Organization

**Group related tools together:**

```typescript
// ✅ Good: All KYC-related tools in one plugin
export const kycToolsPlugin: MCPUIToolPlugin = {
  name: 'kyc-tools',
  register(server) {
    server.registerTool('showKYCForm', ...);
    server.registerTool('processKYCSubmission', ...);
    server.registerTool('validateKYCData', ...);
  },
};

// ❌ Bad: Mixing unrelated tools
export const mixedPlugin: MCPUIToolPlugin = {
  name: 'mixed',
  register(server) {
    server.registerTool('kycForm', ...);
    server.registerTool('chartTool', ...);  // Unrelated!
    server.registerTool('paymentForm', ...);  // Unrelated!
  },
};
```

### 2. Error Handling

**Always handle errors gracefully:**

```typescript
async (params: unknown) => {
  try {
    const parsed = z.object(mySchema).parse(params);
    
    // Your logic here
    const uiResource = createUIResource({...});
    return { content: [uiResource] };
  } catch (error) {
    logger.error({ error, params }, 'Tool execution failed');
    
    // Return error UI instead of throwing
    const errorResource = createUIResource({
      uri: `ui://error/${Date.now()}`,
      content: {
        type: 'rawHtml',
        htmlString: `
          <div style="color: red; padding: 20px;">
            <h2>Error</h2>
            <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        `,
      },
      encoding: 'text',
    });
    
    return { content: [errorResource] };
  }
}
```

### 3. Logging

**Log important events:**

```typescript
async (params: unknown) => {
  logger.info({ tool: 'myTool', params }, 'Tool called');
  
  // ... processing ...
  
  logger.info(
    { tool: 'myTool', resultId: result.id },
    'Tool execution completed'
  );
}
```

### 4. URI Naming

**Use descriptive, unique URIs:**

```typescript
// ✅ Good: Descriptive and unique
uri: 'ui://kyc-form/1'
uri: 'ui://payment-form/checkout'
uri: 'ui://chart/revenue-2024'

// ❌ Bad: Generic or confusing
uri: 'ui://tool/1'
uri: 'ui://form'
uri: 'ui://widget'
```

### 5. HTML Best Practices

**Include MCP-UI JavaScript bridge:**

```typescript
const htmlString = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Tool</title>
</head>
<body>
  <!-- Your content -->
  
  <script>
    // Report size for auto-resize
    if (window.mcpUI && window.mcpUI.reportSize) {
      window.mcpUI.reportSize();
    }
    
    // Use MCP-UI API for interactions
    function handleSubmit() {
      window.mcpUI.callTool('processData', { data: '...' });
    }
  </script>
</body>
</html>
`;
```

### 6. Async Operations

**Handle async operations properly:**

```typescript
async (params: unknown) => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Or call external API
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  
  // Create UI resource with data
  const uiResource = createUIResource({
    uri: 'ui://my-tool/1',
    content: { type: 'rawHtml', htmlString: renderData(data) },
    encoding: 'text',
  });
  
  return { content: [uiResource] };
}
```

## Testing Plugins

### Unit Testing

Create tests in `src/tools/tools.test.ts` or create a separate test file:

```typescript
import { describe, it, expect } from 'vitest';
import { kycToolsPlugin } from './plugins/kyc-tools.js';

// Mock McpServer
class MockMcpServer {
  tools: Map<string, any> = new Map();
  
  registerTool(name: string, definition: any, handler: any) {
    this.tools.set(name, { name, definition, handler });
  }
}

describe('KYC Tools Plugin', () => {
  it('should register all KYC tools', async () => {
    const server = new MockMcpServer();
    await kycToolsPlugin.register(server as any);
    
    expect(server.tools.has('showKYCForm')).toBe(true);
    expect(server.tools.has('processKYCSubmission')).toBe(true);
  });
  
  it('showKYCForm should return valid UI resource', async () => {
    const server = new MockMcpServer();
    await kycToolsPlugin.register(server as any);
    
    const tool = server.tools.get('showKYCForm');
    const result = await tool.handler({});
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('resource');
    expect(result.content[0].resource.uri).toMatch(/^ui:\/\//);
  });
});
```

### Integration Testing

Test with the actual server:

```bash
# Start server
pnpm dev

# In another terminal, test your tool
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "myTool",
      "arguments": {}
    }
  }'
```

## Plugin Discovery

### Auto-Discovery (Recommended)

Place your plugin in `src/tools/plugins/` and it will be automatically discovered:

```
src/tools/plugins/
├── my-plugin.ts        ✅ Auto-discovered
├── kyc-tools.ts        ✅ Auto-discovered
└── examples/           ❌ Excluded (reference only)
    └── html-tools.ts
```

### Explicit Loading

If you need explicit control, add to `src/config/tools.ts`:

```typescript
export const toolConfig: ToolConfig = {
  enableExamplePlugins: false,
  customToolPaths: [],
  plugins: ['my-plugin.js', 'kyc-tools.js'],  // Explicit list
};
```

### Custom Tool Paths

For tools that don't follow the plugin interface:

```typescript
export const toolConfig: ToolConfig = {
  customToolPaths: ['./custom/legacy-tools.js'],
};
```

The module should export a `register` function:

```typescript
export async function register(server: McpServer): Promise<void> {
  server.registerTool('legacyTool', {...}, async (params) => {...});
}
```

## Common Patterns

### Pattern 1: Form with Validation

```typescript
server.registerTool('showForm', {
  title: 'Show Form',
  description: 'Displays a form with validation',
  inputSchema: {
    fields: z.array(z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean().optional(),
    })),
  },
}, async (params: unknown) => {
  const { fields = [] } = z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean().optional(),
    })),
  }).parse(params);
  
  const formHtml = generateFormHTML(fields);
  
  return {
    content: [createUIResource({
      uri: 'ui://form/1',
      content: { type: 'rawHtml', htmlString: formHtml },
      encoding: 'text',
    })],
  };
});
```

### Pattern 2: Data Visualization

```typescript
server.registerTool('showChart', {
  title: 'Show Chart',
  description: 'Displays a chart from data',
  inputSchema: {
    data: z.array(z.any()),
    chartType: z.enum(['bar', 'line', 'pie']),
  },
}, async (params: unknown) => {
  const { data, chartType } = z.object({
    data: z.array(z.any()),
    chartType: z.enum(['bar', 'line', 'pie']),
  }).parse(params);
  
  const chartHtml = `
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
      uri: 'ui://chart/1',
      content: { type: 'rawHtml', htmlString: chartHtml },
      encoding: 'text',
    })],
  };
});
```

### Pattern 3: Async Processing with Status Updates

```typescript
server.registerTool('processAsync', {
  title: 'Process Async',
  description: 'Processes data asynchronously',
  inputSchema: {
    data: z.string(),
  },
}, async (params: unknown) => {
  const { data } = z.object({
    data: z.string(),
  }).parse(params);
  
  // Return UI that handles async processing
  const asyncHtml = `
<!DOCTYPE html>
<html>
<body>
  <div id="status">Processing...</div>
  <script>
    const messageId = 'process-' + Date.now();
    
    // Send async request
    window.mcpUI.callTool('processData', { data: '${data}' }, messageId);
    
    // Listen for response
    window.addEventListener('message', (event) => {
      if (event.data.type === 'ui-message-response' && 
          event.data.messageId === messageId) {
        document.getElementById('status').textContent = 
          'Completed: ' + JSON.stringify(event.data.payload);
      }
    });
  </script>
</body>
</html>
  `;
  
  return {
    content: [createUIResource({
      uri: 'ui://async-process/1',
      content: { type: 'rawHtml', htmlString: asyncHtml },
      encoding: 'text',
    })],
  };
});
```

### Pattern 4: Multi-Step Workflow

```typescript
// Step 1: Show initial form
server.registerTool('showWorkflowStep1', {...}, async (params) => {
  // Return form for step 1
});

// Step 2: Process step 1 and show step 2
server.registerTool('showWorkflowStep2', {...}, async (params) => {
  // Validate step 1 data
  // Return form for step 2
});

// Step 3: Complete workflow
server.registerTool('completeWorkflow', {...}, async (params) => {
  // Process all steps
  // Return completion UI
});
```

## Troubleshooting

### Plugin Not Loading

**Check:**
1. File is in `src/tools/plugins/` (not in `examples/`)
2. File exports a default plugin object
3. Plugin implements `MCPUIToolPlugin` interface
4. Server logs show plugin loading messages

**Debug:**
```typescript
// Add logging in your plugin
export const myPlugin: MCPUIToolPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  async register(server: McpServer): Promise<void> {
    logger.info('My plugin is registering...');  // Check server logs
    // ...
  },
};
```

### Tool Not Available to LLM

**Check:**
1. Plugin is loaded (check server startup logs)
2. Tool is registered (check `tools.list` MCP call)
3. AG-UI server is connected to MCP-UI server
4. Tool name doesn't conflict with existing tools

**Verify:**
```bash
# Check available tools
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### Validation Errors

**Common issues:**
- Missing required fields in input schema
- Type mismatches (string vs number)
- Invalid email/URL formats

**Solution:**
```typescript
// Use Zod for validation
try {
  const parsed = z.object(mySchema).parse(params);
} catch (error) {
  // Log validation error
  logger.error({ error, params }, 'Validation failed');
  // Return user-friendly error UI
}
```

## Reference

### Example Plugins

See `src/tools/plugins/examples/` for complete reference implementations:
- `html-tools.ts` - HTML rendering patterns
- `url-tools.ts` - External URL handling
- `remote-dom-tools.ts` - Remote DOM components
- `metadata-tools.ts` - Metadata usage
- `async-tools.ts` - Async patterns

### MCP-UI Documentation

- [MCP-UI Server SDK](https://docs.mcp-ui.dev/server/typescript)
- [MCP-UI Protocol](https://docs.mcp-ui.dev/protocol)
- [MCP SDK](https://docs.modelcontextprotocol.io)

### Related Documentation

- `CUSTOMIZATION.md` - General customization guide
- `README.md` - Server overview and configuration

