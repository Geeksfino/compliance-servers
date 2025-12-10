# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

This project contains both an AG-UI server (LLM agent) and an MCP-UI server (UI tools) working together.

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

This will install dependencies for both servers using pnpm workspaces.

### 2. Start Both Servers

```bash
# Start with default configuration
./start.sh

# Start with example plugins enabled (for testing)
./start.sh --mcpui-examples-enabled

# Or use environment variable
MCPUI_EXAMPLES_ENABLED=true ./start.sh

# Show help
./start.sh --help
```

Or use pnpm:

```bash
pnpm dev
```

This will:
1. Start the MCP-UI server on port 3100
2. Wait for it to be ready
3. Start the AG-UI server on port 3000 with automatic MCP connection
4. Both servers will run in the background with logs in separate files

### 3. Access the Servers

- **AG-UI Server**: http://localhost:3000
- **MCP-UI Server**: http://localhost:3100
- **Health Checks**:
  - AG-UI: http://localhost:3000/health
  - MCP-UI: http://localhost:3100/health

### 4. View Logs

```bash
# MCP-UI server logs
tail -f mcpui-server.log

# AG-UI server logs
tail -f agui-server.log
```

## Project Structure

```
{{PROJECT_NAME}}/
├── agui-server/          # AG-UI server (LLM agent)
│   ├── src/
│   │   ├── config/
│   │   │   └── system-prompt.ts  # 🎯 Customize system prompt
│   │   ├── agents/
│   │   │   └── llm.ts            # LLM agent logic
│   │   └── ...
│   └── README.md
├── mcpui-server/         # MCP-UI server (UI tools)
│   ├── src/
│   │   ├── config/
│   │   │   └── tools.ts          # 🎯 Configure tools
│   │   ├── tools/
│   │   │   ├── tool-plugin.ts    # Plugin interface (type definitions)
│   │   │   └── plugins/          # 🎯 Put your custom plugins here
│   │   │       └── examples/     # Example plugins (reference only)
│   │   └── ...
│   └── README.md
├── start.sh              # Start script for both servers
├── package.json          # Root workspace configuration
└── README.md             # This file
```

🎯 = Primary customization points

## Configuration

### Environment Variables

Create `.env` files in each server directory:

**agui-server/.env**:
```env
PORT=3000
AGENT_MODE=llm
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-api-key
# MCP_SERVER_URL is automatically set by start.sh
```

**mcpui-server/.env**:
```env
PORT=3100
# Enable example plugins for testing (optional):
# MCPUI_ENABLE_EXAMPLE_PLUGINS=true
# Or use CLI flag: pnpm dev --enable-examples
# Or use start.sh flag: ./start.sh --mcpui-examples-enabled
# For production, leave this unset and use your own plugins in src/tools/plugins/
```

**Root level (for start.sh)**:
```env
# Enable example plugins when using start.sh
MCPUI_EXAMPLES_ENABLED=true
```

### Customization

#### AG-UI Server

1. **System Prompt**: Edit `agui-server/src/config/system-prompt.ts`
2. **LLM Settings**: Edit `agui-server/src/routes/agent-factory.ts`
3. **See**: `agui-server/CUSTOMIZATION.md` for detailed guide

#### MCP-UI Server

1. **Tool Configuration**: Edit `mcpui-server/src/config/tools.ts`
   - Example plugins are **disabled by default** (`enableExamplePlugins: false`)
   - Example plugins are located in `src/tools/plugins/examples/` as reference implementations
   - Enable them for testing by:
     - CLI flag: `pnpm dev --enable-examples` (recommended for quick testing)
     - Environment variable: `MCPUI_ENABLE_EXAMPLE_PLUGINS=true`
     - Config file: `enableExamplePlugins: true` in `src/config/tools.ts`
   - For production, keep them disabled and use your own plugins
2. **Custom Tools**: Add plugins in `mcpui-server/src/tools/plugins/`
   - Recommended approach for production tools
   - Auto-discovered from `src/tools/plugins/` directory (excluding examples/)
   - See example plugins in `src/tools/plugins/examples/` for reference
3. **See**: 
   - **[mcpui-server/PLUGIN-DEVELOPMENT.md](./mcpui-server/PLUGIN-DEVELOPMENT.md)** - Complete plugin development guide
   - **[mcpui-server/CUSTOMIZATION.md](./mcpui-server/CUSTOMIZATION.md)** - General customization guide
   - **[mcpui-server/README.md](./mcpui-server/README.md)** - Server overview

## Development

### Build Both Servers

```bash
pnpm build
```

### Run Tests

```bash
pnpm test
```

### Individual Server Commands

```bash
# AG-UI server only
cd agui-server
pnpm run dev

# MCP-UI server only
cd mcpui-server
pnpm run dev
```

## How It Works

1. **MCP-UI Server** starts first and provides UI tools
2. **AG-UI Server** connects to MCP-UI server via HTTP
3. **LLM Agent** can call MCP-UI tools to generate UI resources
4. **Client** connects to AG-UI server via SSE to receive events

```
Client → AG-UI Server → LLM Provider
                ↓
         MCP-UI Server (tools)
                ↓
         UI Resources
```

## Testing

### Test MCP-UI Server

```bash
curl http://localhost:3100/health
curl http://localhost:3100/tools
```

### Test AG-UI Server

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "threadId": "test",
    "runId": "1",
    "messages": [{"id":"1","role":"user","content":"Show me a simple HTML form"}],
    "tools": [],
    "context": []
  }'
```

## Troubleshooting

### Port Already in Use

Change ports in `start.sh` or set environment variables:

```bash
MCPUI_PORT=3101 AGUI_PORT=3001 ./start.sh
```

### MCP Connection Failed

1. Check MCP-UI server is running: `curl http://localhost:3100/health`
2. Check logs: `tail -f mcpui-server.log`
3. Verify MCP_SERVER_URL in AG-UI server logs

### Dependencies Not Installing

```bash
# Clean and reinstall
pnpm clean
pnpm install
```

## Custom LLM Server Example

This project provides a custom LLM Server example located in the `llm-custom-server/` directory. This is a lightweight API proxy service that converts custom APIs to OpenAI-compatible format, allowing AG-UI or other clients supporting the OpenAI protocol to seamlessly call it.

### Features

*   **OpenAI Compatible Interface**: Provides `/v1/chat/completions` endpoint.
*   **Streaming Response**: Supports Server-Sent Events (SSE) streaming output, adapted for custom API-specific status streams.
*   **Authentication Management**: Prioritizes environment variable `FINSTEP_API_KEY`, also supports passing Key from client request headers.
*   **Docker Deployment**: Provides one-click Docker deployment solution.

### Quick Start

#### 1. Prepare Files

Ensure the `llm-custom-server/` directory contains the following files:
*   `custom_finstep.py` (main program script)
*   `Dockerfile` (build file)

#### 2. Build Docker Image

Run in the `llm-custom-server/` directory:

```bash
cd llm-custom-server
docker build -t finstep-proxy .
```

#### 3. Start Service

Run the container and map port `5000` to the host. Make sure to replace `<YOUR_API_KEY>` with your actual API Key.

```bash
docker run -d \
  --name finstep-proxy \
  -p 5000:5000 \
  -e FINSTEP_API_KEY='AI-ONE-xxxxxxxxxxxxxxxxxxxx' \
  --restart always \
  finstep-proxy
```

#### 4. Verify Service

Test if the service is running properly using curl:

```bash
curl http://localhost:5000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "finstep-proxy",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

#### 5. Client Configuration (AG-UI)

Configure in the AG-UI Server's `.env` file:

```env
# Connect to locally running Docker container
LITELLM_ENDPOINT=http://localhost:5000/v1

# Model name (can be any value, proxy service ignores this parameter, but it's recommended to fill it)
LITELLM_MODEL=finstep-proxy

# API Key (if environment variable is configured when starting Docker, any value can be filled here)
LITELLM_API_KEY=any
```

### API Specification (Internal Protocol)

This proxy service encapsulates the details of the upstream API. The following is the protocol specification of the upstream interface, for reference only.

#### Request Format

*   **URL**: `https://product-backend.finstep.cn/chat/api/chat/v2/completion`
*   **Method**: `POST`
*   **Header**:
    *   `Content-Type`: `application/json`
    *   `Authorization`: `AI-ONE-xxxxxxxxxxxxxxxxxxxx` (API Key)
*   **Body**:

```json
{
  "userId": "12345679",
  "sessionId": "7742d2c9127a4fc7b106a2ed6f790893",
  "query": "Will WuXi AppTec stock rise recently?",
  "sessionTitle": "Will WuXi AppTec stock rise recently?"
}
```

#### Response Format (SSE Streaming)

The upstream interface returns a standard Server-Sent Events (SSE) data stream containing different status phases:

```text
data:{"status": "THINKING"}
data:{"status": "ORGANIZING"}
data:{"status": "MSG_START"}
data:{"status": "RESPONSING", "type": "deepthink", "text": "You"}
data:{"status": "RESPONSING", "type": "deepthink", "text": "are"}
data:{"status": "MSG_DONE"}
data:{"status": "DONE"}
```

The proxy service automatically processes these statuses, extracts only the `text` field from the `RESPONSING` status, and encapsulates it into OpenAI standard `chat.completion.chunk` format to return to the client.

### Development and Debugging

To view logs for debugging:

```bash
docker logs -f finstep-proxy
```

Stop and remove the container:

```bash
docker stop finstep-proxy
docker rm finstep-proxy
```

For more details, see **[llm-custom-server/README.md](./llm-custom-server/README.md)**.

## Documentation

- **AG-UI Server**: See `agui-server/CUSTOMIZATION.md`
- **MCP-UI Server**: See `mcpui-server/CUSTOMIZATION.md`
- **Scaffold Guide**: See `../docs/scaffold-guide.md`
- **Custom LLM Server**: See `llm-custom-server/README.md`

## License

MIT

