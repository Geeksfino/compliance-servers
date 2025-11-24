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

## Documentation

- **AG-UI Server**: See `agui-server/CUSTOMIZATION.md`
- **MCP-UI Server**: See `mcpui-server/CUSTOMIZATION.md`
- **Scaffold Guide**: See `../docs/scaffold-guide.md`

## License

MIT

