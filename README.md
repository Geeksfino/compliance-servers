# Compliance Servers - AG-UI and MCP-UI Templates

This repository contains production-ready templates and scaffolding tools for creating AG-UI and MCP-UI servers.

## Quick Start

### Create a New Project

```bash
# Combined project with both AG-UI and MCP-UI servers
npx @finclip/agui-mcpui-servers scaffold my-project
```

Then:

```bash
cd my-project
pnpm install
./start.sh
# or: pnpm dev
```

This creates a project with both servers that work together automatically!

## What's Included

### Template

The `templates/` directory contains a combined project template with both AG-UI and MCP-UI servers working together. The template ensures both servers are always configured to work together, with automatic MCP connection setup.

### Example Servers

- **`agui-test-server`**: Reference implementation of AG-UI server (for testing)
- **`mcpui-test-server`**: Reference implementation of MCP-UI server (for testing)

**Note**: These are test servers for development. For new projects, use the scaffold tool which creates a combined project with both servers.

### Scaffold Tool

A CLI tool for creating new projects from templates with:
- Interactive prompts
- Project name validation
- Automatic git initialization
- Optional dependency installation
- Comprehensive documentation

## Features

### AG-UI Server Template

- ✅ AG-UI protocol compliance
- ✅ LLM provider integration (LiteLLM, DeepSeek, OpenAI)
- ✅ MCP server connection
- ✅ Configurable system prompts
- ✅ Server-Sent Events (SSE) streaming
- ✅ Session management
- ✅ Scenario-based testing
- ✅ Full TypeScript support

**Key Customization Points:**
- System prompt configuration (`src/config/system-prompt.ts`)
- LLM settings (`src/routes/agent-factory.ts`)
- Custom routes and endpoints
- Environment-based configuration

### MCP-UI Server Template

- ✅ MCP protocol compliance
- ✅ Built-in tool categories (HTML, URL, Remote DOM, Metadata, Async)
- ✅ Plugin system for custom tools
- ✅ Configurable tool registration
- ✅ UI resource generation
- ✅ Session management
- ✅ Full TypeScript support

**Key Customization Points:**
- Tool configuration (`src/config/tools.ts`)
- Custom tool plugins (`src/tools/plugins/`)
- Tool categories (enable/disable)
- Environment-based configuration

## Installation

### Via npx (Recommended)

No installation required:

```bash
npx @finclip/agui-mcpui-servers scaffold <project-name>
```

### Global Installation

```bash
npm install -g @finclip/agui-mcpui-servers
scaffold my-project
```

### Local Development

```bash
git clone <repo>
cd compliance-servers
pnpm install
pnpm scaffold my-project
```

## Usage

### Basic Command

```bash
scaffold <project-name> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--description` | Project description |
| `--author` | Author name |
| `--output` | Output directory |
| `--install` | Install dependencies automatically |
| `--no-git` | Skip git initialization |
| `--help` | Show help message |

### Examples

```bash
# Basic combined project
npx @finclip/agui-mcpui-servers scaffold coding-assistant

# With options
npx @finclip/agui-mcpui-servers scaffold my-agent \
  --description "My AI agent with custom tools" \
  --author "Your Name" \
  --install

# Custom output directory
npx @finclip/agui-mcpui-servers scaffold financial-bot \
  --output ./agents/financial \
  --install
```

## Documentation

- **[docs/scaffold-guide.md](./docs/scaffold-guide.md)** - Comprehensive scaffold tool guide
- **[docs/testing-guide.md](./docs/testing-guide.md)** - Testing strategies
- **[docs/cloud-deployment-guide.md](./docs/cloud-deployment-guide.md)** - Deployment instructions
- **[docs/mcp-logging-guide.md](./docs/mcp-logging-guide.md)** - MCP logging reference
- **[templates/agui-server/CUSTOMIZATION.md](./templates/agui-server/CUSTOMIZATION.md)** - AG-UI customization guide
- **[templates/mcpui-server/CUSTOMIZATION.md](./templates/mcpui-server/CUSTOMIZATION.md)** - MCP-UI customization guide

## Template Structure

### AG-UI Server

```
agui-server-template/
├── src/
│   ├── config/
│   │   └── system-prompt.ts     # 🎯 Customize system prompt
│   ├── agents/
│   │   └── llm.ts               # LLM agent logic
│   ├── routes/
│   │   ├── agent.ts             # Main endpoint
│   │   └── agent-factory.ts     # 🎯 LLM configuration
│   └── server.ts                # Server entry point
├── CUSTOMIZATION.md             # Detailed customization guide
└── README.md
```

### MCP-UI Server

```
mcpui-server-template/
├── src/
│   ├── config/
│   │   └── tools.ts             # 🎯 Tool configuration
│   ├── tools/
│   │   ├── index.ts             # Tool registration
│   │   └── plugins/             # 🎯 Custom plugins
│   ├── plugins/
│   │   └── tool-plugin.ts       # Plugin interface
│   └── server.ts                # Server entry point
├── CUSTOMIZATION.md             # Detailed customization guide
└── README.md
```

🎯 = Primary customization points

## Configuration

### AG-UI Server Environment Variables

```env
# Server
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=*

# Agent Mode
AGENT_MODE=llm  # or 'emulated'

# LLM Provider
LLM_PROVIDER=litellm  # or 'deepseek'
LITELLM_ENDPOINT=http://localhost:4000
LITELLM_API_KEY=your-key
LITELLM_MODEL=deepseek-chat

# MCP Connection
MCP_SERVER_URL=http://localhost:3100/mcp

# Custom System Prompt
AGUI_SYSTEM_PROMPT="You are a helpful assistant"
```

### MCP-UI Server Environment Variables

```env
# Server
PORT=3100
HOST=0.0.0.0
CORS_ORIGIN=*

# Tool Configuration
MCPUI_ENABLED_CATEGORIES=html,url,remote-dom,metadata,async
MCPUI_CUSTOM_TOOLS=./custom/tool1.js,./custom/tool2.js
MCPUI_TOOL_PLUGINS=my-plugin.js
```

## Development

### Running Template Servers

```bash
# AG-UI test server
cd agui-test-server
pnpm install
MCP_SERVER_URL=http://localhost:3100/mcp pnpm run dev --use-llm

# MCP-UI test server
cd mcpui-test-server
pnpm install
pnpm run dev
```

### Testing

```bash
# AG-UI server
cd agui-test-server
pnpm test

# MCP-UI server
cd mcpui-test-server
pnpm test
```

### Building Scaffold Tool

```bash
# In compliance-servers root
pnpm install
pnpm run build
```

## Integration

### Connecting AG-UI and MCP-UI Servers

1. Start MCP-UI server:
   ```bash
   cd mcpui-test-server
   pnpm run dev  # Runs on port 3100
   ```

2. Start AG-UI server with MCP connection:
   ```bash
   cd agui-test-server
   MCP_SERVER_URL=http://localhost:3100/mcp pnpm run dev --use-llm
   ```

3. The LLM agent can now call MCP-UI tools!

### Testing Integration

```bash
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

## Deployment

See [docs/cloud-deployment-guide.md](./docs/cloud-deployment-guide.md) for deployment instructions for:
- Docker
- Kubernetes
- Cloud platforms (AWS, GCP, Azure)
- Serverless

## Architecture

### AG-UI Protocol Flow

```
Client → AG-UI Server → LLM Provider
                ↓
         MCP-UI Server (tools)
```

### MCP-UI Protocol Flow

```
AG-UI Server → MCP-UI Server
                    ↓
              Tool Execution
                    ↓
              UI Resource
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

- Check [docs/scaffold-guide.md](./docs/scaffold-guide.md) for detailed usage
- See template `CUSTOMIZATION.md` files for customization guides
- Review example servers for reference implementations
- Consult official documentation:
  - [AG-UI Docs](https://docs.ag-ui.com)
  - [MCP Docs](https://docs.modelcontextprotocol.io)
  - [MCP-UI Docs](https://docs.mcp-ui.dev)

## License

MIT

## Changelog

### v1.0.0

- Initial release
- AG-UI server template with configurable system prompts
- MCP-UI server template with plugin system
- Scaffold CLI tool with npx support
- Comprehensive documentation
- Example servers for reference


