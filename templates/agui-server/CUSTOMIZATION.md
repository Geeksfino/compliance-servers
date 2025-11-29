# AG-UI Server Customization Guide

This guide explains how to customize your AG-UI server to meet your specific needs.

## Quick Start

Your AG-UI server is fully customizable. The most common customizations are:

1. **System Prompt** - Change the LLM's behavior
2. **Agent Behavior** - Modify how the agent processes requests
3. **Custom Routes** - Add new endpoints
4. **Configuration** - Adjust server settings

## System Prompt Customization

The system prompt controls how the LLM agent behaves. There are three ways to customize it:

### Option 1: Edit the Configuration File (Recommended)

Edit `src/config/system-prompt.ts`:

```typescript
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful coding assistant specialized in TypeScript.';
```

### Option 2: Use Environment Variable

Set the `AGUI_SYSTEM_PROMPT` environment variable:

```bash
export AGUI_SYSTEM_PROMPT="You are a helpful assistant specialized in data analysis."
pnpm run dev
```

### Option 3: Use a Text File

Create a `system-prompt.txt` file in the project root:

```
You are a helpful assistant with expertise in web development.
You provide clear, concise answers with code examples.
```

## Agent Behavior Customization

### Modify LLM Configuration

Edit `src/routes/agent-factory.ts` to change:

- **LLM Endpoint**: Default is LiteLLM or DeepSeek
- **Model**: Change the model name
- **Retry Logic**: Adjust `maxRetries`, `retryDelayMs`
- **Timeout**: Modify `timeoutMs`

Example:

```typescript
return new LLMAgent({
  endpoint: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  maxRetries: 3,
  retryDelayMs: 2000,
  timeoutMs: 60000,
  mcpServerId: 'mcpui-server',
});
```

### Add Custom Agent Logic

The main agent logic is in `src/agents/llm.ts`. Key customization points:

1. **Message Processing** (line ~740): `convertMessages()` - Modify how messages are formatted
2. **Tool Call Handling** (line ~400): `handleToolCalls()` - Change tool execution logic
3. **Event Streaming** (line ~200): `run()` - Customize event generation

## Custom Routes

Add new routes by creating a file in `src/routes/` and registering it in `src/server.ts`.

### Example: Custom Health Check

Create `src/routes/custom.ts`:

```typescript
import type { FastifyPluginAsync } from 'fastify';

export const customRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/custom/status', async (request, reply) => {
    return {
      status: 'ok',
      custom: 'data',
      timestamp: new Date().toISOString(),
    };
  });
};
```

Register in `src/server.ts`:

```typescript
import { customRoute } from './routes/custom.js';
// ...
await fastify.register(customRoute);
```

## Configuration

All configuration is in `src/utils/config.ts`. Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |
| `CORS_ORIGIN` | CORS origin | `*` |
| `AGENT_MODE` | Agent mode (`llm` or `emulated`) | `emulated` |
| `LLM_PROVIDER` | LLM provider (`litellm` or `deepseek`) | `litellm` |
| `LITELLM_ENDPOINT` | LiteLLM endpoint (required if `LLM_PROVIDER=litellm`) | - |
| `LITELLM_API_KEY` | LiteLLM API key (required if `LLM_PROVIDER=litellm`) | - |
| `LITELLM_MODEL` | LiteLLM model name | `deepseek-chat` |
| `DEEPSEEK_API_KEY` | DeepSeek API key (required if `LLM_PROVIDER=deepseek`) | - |
| `DEEPSEEK_MODEL` | DeepSeek model name | `deepseek-chat` |

**Note:** When using `LLM_PROVIDER=deepseek`, you do NOT need LiteLLM. The server connects directly to DeepSeek's API. See the [AG-UI server README](./README.md#deepseek-agent) for details.
| `MCP_SERVER_URL` | MCP server HTTP URL | - |
| `MCP_SERVER_COMMAND` | MCP server stdio command | - |
| `AGUI_SYSTEM_PROMPT` | System prompt override | - |

### Example: Development vs Production

Create `.env.development`:

```env
PORT=3000
LOG_LEVEL=debug
LOG_PRETTY=true
AGENT_MODE=llm
LLM_PROVIDER=litellm
LITELLM_ENDPOINT=http://localhost:4000
```

Create `.env.production`:

```env
PORT=8080
LOG_LEVEL=info
LOG_PRETTY=false
AGENT_MODE=llm
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-api-key
```

## MCP Integration

To connect to an MCP-UI server:

### HTTP Transport

```bash
MCP_SERVER_URL=http://localhost:3100/mcp pnpm run dev --use-llm
```

### Stdio Transport

```bash
MCP_SERVER_COMMAND="node dist/server.js" pnpm run dev --use-llm
```

## Advanced Customization

### Add New Agent Types

1. Create a new agent class in `src/agents/` extending `BaseAgent`
2. Import and instantiate it in `src/routes/agent-factory.ts`

### Custom Event Streaming

Modify `src/streaming/encoder.ts` to:
- Add custom event types
- Change event formatting
- Implement event filtering

### Authentication

Add authentication middleware in `src/server.ts`:

```typescript
fastify.addHook('preHandler', async (request, reply) => {
  const apiKey = request.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});
```

## Testing

Run tests:

```bash
pnpm test
```

Add custom tests in the `tests/` directory.

## Debugging

Enable debug logging:

```bash
LOG_LEVEL=debug pnpm run dev
```

Or use the TypeScript debugger:

```bash
pnpm run dev:debug
```

Then attach your IDE's debugger to the Node process.

## Deployment

See `../../docs/cloud-deployment-guide.md` for deployment instructions.

## Need Help?

- Check the [AG-UI Documentation](https://docs.ag-ui.com)
- Review the original `agui-test-server` for examples
- See `../../docs/scaffold-guide.md` for scaffold tool usage

## Common Customization Patterns

### Pattern 1: Domain-Specific Assistant

```typescript
// src/config/system-prompt.ts
const DEFAULT_SYSTEM_PROMPT = `You are an expert in financial analysis.
You help users understand market data and make informed decisions.
Always provide sources for your claims and be cautious about predictions.`;
```

### Pattern 2: Multi-Model Support

```typescript
// src/routes/agent-factory.ts
const modelOverride = (input.forwardedProps as any)?.model;
return new LLMAgent({
  model: modelOverride || config.litellmModel || 'deepseek-chat',
  // ...
});
```

### Pattern 3: Custom Tool Integration

The AG-UI server fetches tools from the connected MCP server. To add custom tools:

1. Deploy an MCP-UI server with your custom tools
2. Connect your AG-UI server to it via `MCP_SERVER_URL`

See the `mcpui-server-template` for creating custom MCP-UI tools.


