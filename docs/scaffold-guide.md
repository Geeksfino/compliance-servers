# Scaffold Guide for AG-UI and MCP-UI Servers

This guide explains how to use the scaffold tool to create new AG-UI and MCP-UI server projects from templates.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [Template Types](#template-types)
- [Options](#options)
- [Examples](#examples)
- [Template Structure](#template-structure)
- [Customization](#customization)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

Create a new combined project (AG-UI + MCP-UI servers):

```bash
npx @geeksfino/agui-mcpui-servers scaffold my-project
cd my-project
pnpm install
./start.sh
```

The `start.sh` script automatically:
1. Starts the MCP-UI server on port 3100
2. Waits for it to be ready
3. Starts the AG-UI server on port 3000 with MCP connection configured
4. Both servers run together with logs in separate files

## Installation

### Option 1: npx (Recommended)

No installation required. Use `npx` to run the scaffold tool directly:

```bash
npx @finclip/agui-mcpui-servers scaffold <template> <name>
```

### Option 2: Global Installation

Install globally for repeated use:

```bash
npm install -g @geeksfino/agui-mcpui-servers
scaffold <template> <name>
```

### Option 3: Local pnpm

Within the `compliance-servers` repository:

```bash
pnpm scaffold <template> <name>
```

## Usage

### Basic Command Structure

```bash
scaffold <project-name> [options]
```

### Parameters

- **project-name** (required): Name of your project (must be a valid npm package name)

**Note**: The scaffold tool always creates a combined project with both AG-UI and MCP-UI servers working together. This ensures proper integration and automatic MCP connection configuration.

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--description` | Project description | `--description "My custom agent"` |
| `--author` | Author name | `--author "John Doe"` |
| `--output` | Output directory | `--output ./servers/my-agent` |
| `--install` | Install dependencies after scaffolding | `--install` |
| `--no-git` | Skip git repository initialization | `--no-git` |
| `--help`, `-h` | Show help message | `--help` |

## Project Structure

The scaffolded project includes both servers working together:

```
my-project/
├── agui-server/          # AG-UI server (LLM agent)
├── mcpui-server/         # MCP-UI server (UI tools)
├── start.sh              # Start script for both servers
├── package.json          # Root workspace configuration
└── README.md             # Project documentation
```

### AG-UI Server

The AG-UI server provides:

- Implements the AG-UI protocol for streaming agent interactions
- Integrates with LLM providers (LiteLLM, DeepSeek, etc.)
- Connects to MCP-UI servers for tool calling
- Supports customizable system prompts
- Includes scenario-based testing

**Use cases:**
- Building AI agents with custom behavior
- Creating chat-based applications
- Implementing LLM-powered services
- Developing conversational interfaces

**Key files:**
- `src/config/system-prompt.ts` - Customize system prompt
- `src/agents/llm.ts` - Main LLM agent logic
- `src/routes/agent.ts` - Agent endpoint definition
- `src/utils/config.ts` - Server configuration

### MCP-UI Server

The MCP-UI server provides:

- Implements the MCP (Model Context Protocol) for UI resources
- Provides tools that LLMs can call
- Supports HTML, URL, and Remote DOM resources
- Includes plugin system for custom tools
- Configurable tool categories

**Use cases:**
- Creating custom UI tools for LLMs
- Building reusable tool collections
- Developing interactive UI components
- Providing visualization capabilities

**Key files:**
- `src/config/tools.ts` - Configure enabled tools
- `src/tools/index.ts` - Tool registration
- `src/tools/plugins/` - Custom tool plugins
- `src/plugins/tool-plugin.ts` - Plugin interface

## Examples

### Example 1: Basic Combined Project

```bash
npx @finclip/agui-mcpui-servers scaffold coding-assistant --install
cd coding-assistant
# Edit agui-server/src/config/system-prompt.ts
# Edit mcpui-server/src/config/tools.ts
./start.sh
```

### Example 2: Project with Custom Output

```bash
npx @finclip/agui-mcpui-servers scaffold financial-advisor \
  --description "Financial analysis agent" \
  --author "Finance Team" \
  --output ./agents/financial \
  --install
cd ./agents/financial
./start.sh
```

### Example 3: Project with Custom Tools

```bash
npx @finclip/agui-mcpui-servers scaffold data-viz-agent \
  --description "Data visualization agent with custom tools" \
  --install
cd data-viz-agent
# Add custom tools in mcpui-server/src/tools/plugins/
./start.sh
```

### Example 4: Project Without Auto-Install

```bash
npx @geeksfino/agui-mcpui-servers scaffold my-project \
  --output ./my-projects/agent \
  --no-git
cd ./my-projects/agent
pnpm install
./start.sh
```

## Project Structure

### Combined Project Structure

```
my-project/
├── agui-server/          # AG-UI server
│   ├── src/
│   │   ├── config/
│   │   │   └── system-prompt.ts     # 🎯 Customize system prompt
│   │   ├── agents/
│   │   │   └── llm.ts               # LLM agent logic
│   │   ├── routes/
│   │   │   ├── agent.ts             # Main endpoint
│   │   │   └── agent-factory.ts     # 🎯 LLM configuration
│   │   └── server.ts                # Server entry point
│   ├── CUSTOMIZATION.md             # Detailed customization guide
│   └── README.md
├── mcpui-server/         # MCP-UI server
│   ├── src/
│   │   ├── config/
│   │   │   └── tools.ts             # 🎯 Tool configuration
│   │   ├── tools/
│   │   │   ├── index.ts             # Tool registration
│   │   │   └── plugins/             # 🎯 Custom plugins
│   │   └── server.ts                # Server entry point
│   ├── CUSTOMIZATION.md             # Detailed customization guide
│   └── README.md
├── start.sh              # 🚀 Start both servers
├── package.json          # Root workspace configuration
└── README.md             # Project overview
```

### AG-UI Server Structure (within combined project)

```
agui-server/
├── src/
│   ├── agents/
│   │   ├── base.ts              # Base agent interface
│   │   ├── llm.ts               # LLM agent implementation
│   │   ├── echo.ts              # Echo agent (for testing)
│   │   └── scenario.ts          # Scenario-based agent
│   ├── config/
│   │   └── system-prompt.ts     # 🎯 System prompt configuration
│   ├── mcp/
│   │   ├── client.ts            # MCP client
│   │   └── http-transport.ts    # HTTP transport
│   ├── routes/
│   │   ├── agent.ts             # Main agent endpoint
│   │   ├── agent-factory.ts     # Agent creation logic
│   │   ├── health.ts            # Health check
│   │   └── scenarios.ts         # Scenario endpoints
│   ├── streaming/
│   │   ├── encoder.ts           # AG-UI event encoding
│   │   ├── session.ts           # Session management
│   │   └── connection.ts        # SSE connections
│   ├── types/
│   │   └── agui.ts              # AG-UI types
│   ├── utils/
│   │   ├── config.ts            # Configuration loader
│   │   ├── logger.ts            # Logging
│   │   └── validation.ts        # Request validation
│   └── server.ts                # 🎯 Main entry point
├── tests/                       # Test files
├── docs/                        # Documentation
├── .env.example                 # Environment template
├── package.json
├── tsconfig.json
├── CUSTOMIZATION.md             # 📖 Customization guide
└── README.md
```

### MCP-UI Server Structure (within combined project)

```
mcpui-server/
├── src/
│   ├── config/
│   │   └── tools.ts             # 🎯 Tool configuration
│   ├── plugins/
│   │   └── tool-plugin.ts       # Plugin interface
│   ├── tools/
│   │   ├── index.ts             # 🎯 Tool registration
│   │   ├── plugin-loader.ts     # Plugin loader
│   │   ├── html.ts              # HTML tools
│   │   ├── url.ts               # URL tools
│   │   ├── remote-dom.ts        # Remote DOM tools
│   │   ├── metadata.ts          # Metadata tools
│   │   ├── async.ts             # Async tools
│   │   └── plugins/             # 🎯 Custom plugins directory
│   ├── mcp/
│   │   └── session.ts           # Session management
│   ├── types/
│   │   └── index.ts             # Type definitions
│   ├── utils/
│   │   └── logger.ts            # Logging
│   └── server.ts                # Main entry point
├── tests/                       # Test files
├── .env.example                 # Environment template
├── package.json
├── tsconfig.json
├── CUSTOMIZATION.md             # 📖 Customization guide
└── README.md
```

🎯 = Primary customization points

## Customization

After scaffolding, customize your project:

### AG-UI Server Customization

1. **System Prompt**: Edit `agui-server/src/config/system-prompt.ts` or set `AGUI_SYSTEM_PROMPT`
2. **LLM Configuration**: Modify `agui-server/src/routes/agent-factory.ts`
3. **Custom Routes**: Add files in `agui-server/src/routes/` and register in `agui-server/src/server.ts`
4. **Environment**: Copy `.env.example` to `.env` in `agui-server/` and configure

See `agui-server/CUSTOMIZATION.md` for detailed guides.

### MCP-UI Server Customization

1. **Tool Categories**: Edit `mcpui-server/src/config/tools.ts` or set `MCPUI_ENABLED_CATEGORIES`
2. **Custom Tools**: Add files in `mcpui-server/src/tools/` or `mcpui-server/src/tools/plugins/`
3. **Plugin Development**: Implement `MCPUIToolPlugin` interface
4. **Environment**: Copy `.env.example` to `.env` in `mcpui-server/` and configure

See `mcpui-server/CUSTOMIZATION.md` for detailed guides.

### Start Script

The `start.sh` script automatically:
- Starts MCP-UI server on port 3100
- Waits for it to be ready
- Starts AG-UI server on port 3000 with `MCP_SERVER_URL=http://localhost:3100/mcp`
- Both servers run with logs in `mcpui-server.log` and `agui-server.log`

You can customize ports by setting environment variables:
```bash
MCPUI_PORT=3101 AGUI_PORT=3001 ./start.sh
```

## Best Practices

### Naming Conventions

- Use lowercase with hyphens: `my-agent-server`, `data-viz-tools`
- Avoid spaces, special characters, or uppercase
- Keep names descriptive but concise

### Project Organization

- Keep customizations in designated files (marked with 🎯)
- Follow the existing directory structure
- Document your customizations in comments
- Use environment variables for configuration

### Development Workflow

1. **Scaffold** the project
2. **Install** dependencies (`pnpm install`)
3. **Configure** environment (`.env` file)
4. **Customize** based on your needs
5. **Test** frequently (`pnpm test`)
6. **Document** your changes

### Version Control

- Initialize git repository (enabled by default)
- Create `.gitignore` for sensitive files
- Commit frequently with clear messages
- Use branches for features

### Environment Management

Create multiple environment files:

- `.env.development` - Development settings
- `.env.staging` - Staging settings
- `.env.production` - Production settings

Load with:

```bash
NODE_ENV=production pnpm start
```

## Troubleshooting

### Issue: "Template directory not found"

**Solution**: Ensure you're running the scaffold tool from the correct location or using npx with the published package.

### Issue: "Directory already exists"

**Solution**: The scaffold tool will prompt you to overwrite. Choose "yes" to overwrite or "no" to abort and use a different project name.

### Issue: "Invalid project name"

**Solution**: Project names must be valid npm package names:
- Lowercase only
- No spaces
- Alphanumeric and hyphens only
- Cannot start with a dot or underscore

### Issue: "Failed to install dependencies"

**Solution**: Run `pnpm install` manually in the project directory. Ensure you have pnpm installed (`npm install -g pnpm`).

### Issue: "Build errors after scaffolding"

**Solution**:
1. Run `pnpm install` to ensure all dependencies are installed
2. Run `pnpm run build` to check for TypeScript errors
3. Check `tsconfig.json` for correct configuration

### Issue: "Cannot connect to MCP server"

**Solution** (AG-UI server):
1. Ensure MCP server is running
2. Check `MCP_SERVER_URL` environment variable
3. Verify network connectivity
4. Check MCP server logs

### Issue: "Tools not loading"

**Solution** (MCP-UI server):
1. Check `src/config/tools.ts` configuration
2. Verify tool category names are correct
3. Check plugin file naming and location
4. Review server logs for errors

## Advanced Usage

### Custom Template Modifications

After scaffolding, you can:

1. **Add Dependencies**:
   ```bash
   pnpm add express socket.io
   ```

2. **Modify TypeScript Configuration**:
   Edit `tsconfig.json` to adjust compiler options

3. **Add Scripts**:
   Edit `package.json` to add custom npm scripts

4. **Create Custom Directories**:
   Organize code however you prefer

### Integration with CI/CD

Example GitHub Actions workflow:

```yaml
name: Build and Test
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm run build
      - run: pnpm test
```

### Docker Deployment

Create a `Dockerfile` in your project:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
EXPOSE 3000
CMD ["pnpm", "start"]
```

## Additional Resources

- [AG-UI Documentation](https://docs.ag-ui.com)
- [MCP Documentation](https://docs.modelcontextprotocol.io)
- [MCP-UI Documentation](https://docs.mcp-ui.dev)
- [Template CUSTOMIZATION.md](./templates/agui-server-template/CUSTOMIZATION.md)
- [Deployment Guide](./cloud-deployment-guide.md)

## Support

For issues or questions:

1. Check the `CUSTOMIZATION.md` in your generated project
2. Review the original template servers in `compliance-servers/`
3. Check server logs for error messages
4. Consult official documentation links above

## Contributing

To improve the scaffold tool or templates:

1. Fork the repository
2. Make your changes in `compliance-servers/tools/scaffold.ts` or `compliance-servers/templates/`
3. Test thoroughly
4. Submit a pull request

## License

The scaffold tool and templates are provided under the MIT License.


