# AG-UI Test Server

A production-grade AG-UI protocol test server for NeuronKit SDK integration testing. Supports multiple agent types including pre-scripted scenarios, echo testing, and real LLM integration via LiteLLM or DeepSeek.

## Features

- ✅ **Full AG-UI Protocol Support** - Implements the complete AG-UI specification
- 🎭 **Multiple Agent Types** - Scenario, Echo, LiteLLM, DeepSeek
- 📡 **SSE Streaming** - Server-Sent Events with proper event encoding
- 🧪 **Test Scenarios** - Pre-built scenarios for deterministic testing
- 🔌 **LiteLLM Integration** - Provider-agnostic LLM access
- 🔗 **MCP Integration** - Call MCP servers and stream UI resources
- 🚀 **High Performance** - Built on Fastify for maximum throughput
- 📊 **Session Management** - Track conversations across multiple turns
- 🔍 **Structured Logging** - Pino-based logging with pretty output

## Quick Start

### Prerequisites

- Node.js 20+
- npm/yarn/pnpm

### Installation

```bash
cd agui-test-server
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key configuration options:

```env
# Server
PORT=3000
HOST=0.0.0.0

# Default agent type
DEFAULT_AGENT=scenario

# For LLM integration (optional)
LLM_PROVIDER=litellm
LITELLM_ENDPOINT=http://localhost:4000/v1
LITELLM_API_KEY=your-key
LITELLM_MODEL=deepseek-chat
```

### Running the Server

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`.

## API Endpoints

### POST /agent

Main AG-UI endpoint. Accepts `RunAgentInput` and returns SSE stream.

**Request**:
```json
{
  "threadId": "uuid",
  "runId": "run_timestamp_random",
  "messages": [
    {
      "id": "msg-uuid",
      "role": "user",
      "content": "Hello"
    }
  ],
  "tools": [],
  "context": [],
  "state": null,
  "forwardedProps": null
}
```

**Response**: `text/event-stream`

```
event: message
data: {"type":"RUN_STARTED","threadId":"...","runId":"..."}

event: message
data: {"type":"TEXT_MESSAGE_CHUNK","messageId":"...","delta":"Hello"}

event: message
data: {"type":"RUN_FINISHED","threadId":"...","runId":"..."}
```

### GET /scenarios

List all available test scenarios.

**Response**:
```json
{
  "scenarios": [
    {
      "id": "simple-chat",
      "name": "Simple Chat",
      "description": "Basic conversation with greeting",
      "turnCount": 2
    }
  ]
}
```

### POST /scenarios/:id

Run a specific scenario directly (useful for testing).

**Request**:
```json
{
  "threadId": "test-123",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "hello"
    }
  ]
}
```

### GET /health

Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-01T06:00:00.000Z",
  "uptime": 123.45,
  "sessions": 5
}
```

## Agent Types

### Scenario Agent (Default)

Pre-scripted responses for deterministic testing.

**Available Scenarios**:
- `simple-chat` - Basic conversation
- `tool-call` - Tool invocation demo
- `error-handling` - Error scenarios

**Usage**:
```bash
curl -X POST http://localhost:3000/scenarios/simple-chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","content":"hello"}]}'
```

### Echo Agent

Simple echo agent for basic connectivity testing.

**Configuration**:
```env
DEFAULT_AGENT=echo
```

### LiteLLM Agent

Connect to any mainstream LLM provider via the LiteLLM proxy.

> **📖 For complete LiteLLM setup instructions, see [../../docs/litellm-guide.md](../../docs/litellm-guide.md)**

**LiteLLM Proxy Startup Guide (Recommended: Built-in Script):**
1. It is recommended to use the built-in `start-litellm.sh` script to automatically start the LiteLLM proxy. This requires no manual virtual environment activation or manual dependency management.

```bash
# Method 1: Pass the DeepSeek API key directly
DEEPSEEK_API_KEY=your-api-key ./scripts/start-litellm.sh

# Method 2: Export the environment variable first, then run the script
export DEEPSEEK_API_KEY=your-api-key
./scripts/start-litellm.sh
```

2. (First-time setup) If LiteLLM dependencies are not installed yet, please create a Python virtual environment and install dependencies in your project root directory:

```bash
cd /your/project/path
python3 -m venv .venv
source .venv/bin/activate
pip install 'litellm[proxy]'
```
> Note: Make sure to use quotes in `'litellm[proxy]'` to ensure all dependencies are installed.

3. After startup, the LiteLLM proxy will listen on `http://localhost:4000`, and the API key will be passed through the environment variable.

**Manual Startup (Advanced, Optional):**

```bash
# Activate virtual environment
source .venv/bin/activate

# Start LiteLLM proxy (customize the model if needed)
litellm --model deepseek/deepseek-chat --api_key $DEEPSEEK_API_KEY
```

For more detailed instructions, see [../scripts/README.md](../scripts/README.md).


**Configuration**:
```env
DEFAULT_AGENT=litellm
LITELLM_ENDPOINT=http://localhost:4000/v1
LITELLM_API_KEY=your-key
LITELLM_MODEL=deepseek-chat
```

### DeepSeek Agent

Direct DeepSeek API integration. **No LiteLLM required** - connects directly to DeepSeek's API.

**Quick Setup:**

1. Get your DeepSeek API key from https://platform.deepseek.com/

2. Configure your `.env` file:
```env
AGENT_MODE=llm
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat
```

3. Start the server:
```bash
pnpm run dev
```

That's it! No LiteLLM proxy needed. The server connects directly to DeepSeek's API.

**Configuration Options:**
```env
AGENT_MODE=llm              # Required: use 'llm' mode
LLM_PROVIDER=deepseek       # Required: set to 'deepseek'
DEEPSEEK_API_KEY=your-key   # Required: your DeepSeek API key
DEEPSEEK_MODEL=deepseek-chat # Optional: model name (default: deepseek-chat)
```

**When to Use DeepSeek Direct vs LiteLLM:**
- **Use DeepSeek Direct**: Simple setup, only need DeepSeek, no additional services
- **Use LiteLLM**: Want to switch between multiple providers, need provider abstraction, or want advanced features like fallback, rate limiting, etc.

## MCP Integration

The AG-UI test server can integrate with MCP (Model Context Protocol) servers to execute tools and stream UI resources back to clients.

### Overview

When configured with an MCP server:
1. LLM agent detects tool calls from the LLM
2. Executes tools via MCP server connection
3. Streams results back as AG-UI events:
   - `TOOL_CALL_RESULT` - Text content from tool execution
   - `CUSTOM` events - MCP UI resources (HTML, URLs, Remote DOM)

### Configuration

Set environment variables to enable MCP integration:

```env
# Enable LLM mode
AGENT_MODE=llm

# Configure MCP server (stdio transport)
MCP_SERVER_COMMAND=node
MCP_SERVER_ARGS=../mcpui-test-server/dist/server.js
```

### Example: Calling MCP-UI Tools

```bash
# Build both servers
cd mcpui-test-server && npm run build
cd ../agui-test-server && npm run build

# Configure .env
cat > .env << EOF
AGENT_MODE=llm
LITELLM_ENDPOINT=http://localhost:4000/v1
LITELLM_API_KEY=your-key
MCP_SERVER_COMMAND=node
MCP_SERVER_ARGS=../mcpui-test-server/dist/server.js
EOF

# Start LiteLLM proxy (separate terminal)
litellm --model deepseek/deepseek-chat --api_key $DEEPSEEK_API_KEY

# Start AG-UI server
npm start

# Make request
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "threadId": "test-123",
    "runId": "run_1",
    "messages": [{"id":"1","role":"user","content":"Show me a simple HTML page"}]
  }'
```

### Event Flow

```
RUN_STARTED
  ↓
TOOL_CALL_START (toolCallName: "showSimpleHtml")
  ↓
TOOL_CALL_ARGS (arguments JSON)
  ↓
TOOL_CALL_END
  ↓
TOOL_CALL_RESULT (text content)
  ↓
CUSTOM (name: "mcp-ui-resource", value: { type: "resource", resource: {...} })
  ↓
RUN_FINISHED
```

### Handling UI Resources in Clients

```typescript
// Example client-side handling
for await (const event of stream) {
  if (event.type === 'CUSTOM' && event.name === 'mcp-ui-resource') {
    const uiResource = event.value;
    // Render UI resource
    renderUIResource(uiResource);
  }
}
```

## Testing with NeuronKit

### Swift Integration

```swift
import NeuronKit

let config = NeuronKitConfig(
    serverURL: URL(string: "http://localhost:3000/agent")!,
    deviceId: "test-device",
    userId: "test-user",
    storage: .inMemory
)

let runtime = NeuronRuntime(config: config)
let conversation = runtime.openConversation(agentId: UUID())

// Send message
try await conversation.sendMessage("Hello!")

// Bind UI
conversation.bindUI(myUIAdapter)
```

### cURL Testing

```bash
# Simple chat
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "threadId": "test-123",
    "runId": "run_1",
    "messages": [{"id":"1","role":"user","content":"hello"}],
    "tools": [],
    "context": []
  }'

# With tool definition
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "test-456",
    "runId": "run_2",
    "messages": [{"id":"2","role":"user","content":"take a photo"}],
    "tools": [{
      "name": "camera.capture",
      "description": "Capture photo",
      "parameters": {
        "mode": {"type": "string", "required": true}
      }
    }],
    "context": []
  }'
```

## Development

### Project Structure

```
agui-test-server/
├── src/
│   ├── agents/          # Agent implementations
│   │   ├── base.ts      # Base agent interface
│   │   ├── echo.ts      # Echo agent
│   │   ├── scenario.ts  # Scenario agent
│   │   └── llm.ts       # LLM agent
│   ├── routes/          # Fastify routes
│   │   ├── agent.ts     # Main /agent endpoint
│   │   ├── health.ts    # Health check
│   │   └── scenarios.ts # Scenario management
│   ├── scenarios/       # Test scenarios
│   │   ├── simple-chat.json
│   │   ├── tool-call.json
│   │   └── error-handling.json
│   ├── streaming/       # SSE utilities
│   │   ├── encoder.ts   # Event encoding
│   │   └── session.ts   # Session management
│   ├── types/           # TypeScript types
│   ├── utils/           # Utilities
│   └── server.ts        # Main entry point
├── tests/               # Tests
├── package.json
└── README.md
```

### Adding Custom Scenarios

Create a new JSON file in `src/scenarios/`:

```json
{
  "id": "my-scenario",
  "name": "My Custom Scenario",
  "description": "Description here",
  "turns": [
    {
      "trigger": {
        "userMessage": ".*keyword.*"
      },
      "events": [
        {
          "type": "TEXT_MESSAGE_CHUNK",
          "messageId": "msg_1",
          "delta": "Response text"
        }
      ],
      "delayMs": 200
    }
  ]
}
```

Register in `src/scenarios/index.ts`:

```typescript
scenarios['my-scenario'] = loadScenario('my-scenario.json');
```

### Running Tests

```bash
npm test           # Run tests
npm run test:ui    # Run tests with UI
```

### Linting

```bash
npm run lint       # Check code
npm run format     # Format code
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t agui-test-server .
docker run -p 3000:3000 --env-file .env agui-test-server
```

### Environment Variables

See `.env.example` for all available configuration options.

## Troubleshooting

### Connection Issues

- Verify server is running: `curl http://localhost:3000/health`
- Check firewall settings
- Ensure NeuronKit is pointing to correct URL

### SSE Stream Issues

- Check `Accept: text/event-stream` header
- Verify no proxies are buffering the response
- Check server logs for errors

### LLM Integration Issues

- Verify LiteLLM proxy is running
- Check API keys are correct
- Review logs for API errors

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## License

MIT

## Related Projects

- [NeuronKit](../neuronkit) - Swift SDK for AG-UI
- [AG-UI Protocol](https://docs.ag-ui.com) - Official specification
- [LiteLLM](https://github.com/BerriAI/litellm) - LLM proxy
