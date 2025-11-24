# MCP-UI Server

An MCP-UI protocol server implementing the Model Context Protocol (MCP) with full MCP-UI support. This server provides a foundation for building custom MCP-UI tools.

## Features

- ✅ **Full MCP Protocol** - Implements complete MCP specification
- 🎨 **Sample Tools** - Reference implementations for learning (disabled by default)
- 🔌 **Plugin System** - Easy extension with custom tools
- 📡 **HTTP Streaming** - StreamableHTTPServerTransport
- 🔧 **Multiple Content Types** - HTML, External URLs, Remote DOM
- 📊 **Metadata Support** - Preferred size, render data
- 🔄 **Async Protocol** - Message IDs, acknowledgments, responses
- 🚀 **High Performance** - Built on Express
- 📝 **Structured Logging** - Pino-based logging

## ⚠️ Important: Example Plugins

**Example plugins are DISABLED by default.** They are provided as **reference implementations** in `src/tools/plugins/examples/` for:
- Learning how to create MCP-UI tool plugins
- Testing the server during development
- Using as templates for your own plugins

To enable example plugins for testing, see [Configuration](#configuration) below.

## Quick Start

### Prerequisites

- Node.js 20+
- npm/yarn/pnpm

### Installation

```bash
cd mcpui-test-server
npm install
```

### Configuration

#### Basic Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Basic configuration options:

```env
PORT=3100
HOST=0.0.0.0
NODE_ENV=development
SERVER_NAME=mcpui-server
SERVER_VERSION=1.0.0
LOG_LEVEL=info
LOG_PRETTY=true
CORS_ORIGIN=*
SESSION_TIMEOUT=3600000
```

#### Tool Configuration

**Edit `src/config/tools.ts`** to configure which tools are enabled:

```typescript
export const toolConfig: ToolConfig = {
  // Enable example plugins for testing (optional):
  enableExamplePlugins: true,  // Set to true to enable example plugins
  
  // Add your custom tool modules:
  customToolPaths: ['./custom/my-tools.js'],
  
  // Add plugin paths (or use auto-discovery from src/tools/plugins/):
  plugins: ['my-plugin.js'],
  // If empty, all plugins in src/tools/plugins/ (except examples/) will be auto-discovered
};
```

**📖 For complete plugin development guide, see [PLUGIN-DEVELOPMENT.md](./PLUGIN-DEVELOPMENT.md)**

**Or use command-line flags:**

```bash
# Enable example plugins via CLI flag (highest priority)
pnpm dev --enable-examples

# Explicitly disable example plugins
pnpm dev --no-examples
```

**Or use environment variables:**

```env
# Enable example plugins for testing
MCPUI_ENABLE_EXAMPLE_PLUGINS=true

# Specify custom tool paths
MCPUI_CUSTOM_TOOLS=./custom/tool1.js,./custom/tool2.js

# Specify plugin paths
MCPUI_TOOL_PLUGINS=plugin1.js,plugin2.js
```

**Configuration Priority:**
1. Command-line flags (highest priority) - `--enable-examples` or `--no-examples`
2. Environment variables - `MCPUI_ENABLE_EXAMPLE_PLUGINS`
3. Config file defaults (lowest priority) - `src/config/tools.ts`

**For production**, keep `enableExamplePlugins: false` and use your own plugins in `src/tools/plugins/`.

### Running the Server

**Development mode** (with hot reload):
```bash
# Start with default configuration (example plugins disabled)
pnpm dev

# Start with example plugins enabled (for testing)
pnpm dev --enable-examples

# Show help
pnpm dev --help
```

**Production mode**:
```bash
pnpm build
pnpm start

# Or with example plugins enabled
pnpm start --enable-examples
```

**Command-line Options:**
- `--enable-examples` or `--with-examples` - Enable example plugins from `src/tools/plugins/examples/`
- `--no-examples` - Explicitly disable example plugins (overrides config and env)
- `--help` or `-h` - Show help message

The server will start on `http://localhost:3100`.

## API Endpoints

### MCP Protocol Endpoints

- `POST /mcp` - Client-to-server communication
- `GET /mcp` - Server-to-client stream
- `DELETE /mcp` - Session termination

### Utility Endpoints

- `GET /health` - Health check
- `GET /tools` - List all available tools

## Example Plugins (Disabled by Default)

The following example plugins are provided as **reference implementations** in `src/tools/plugins/examples/`:

### HTML Tools Plugin (`html-tools.ts`)
- `showSimpleHtml` - Basic HTML with styling and interactive buttons
- `showRawHtml` - Minimal raw HTML sample
- `showInteractiveForm` - Form with validation and async submission
- `showComplexLayout` - Multi-column responsive layout

### URL Tools Plugin (`url-tools.ts`)
- `showExampleSite` - Displays example.com
- `showCustomUrl` - Displays user-provided URL
- `showApiDocs` - Displays MCP-UI documentation

### Remote DOM Tools Plugin (`remote-dom-tools.ts`)
- `showRemoteDomButton` - Interactive button with counter
- `showRemoteDomForm` - Form with validation

### Metadata Tools Plugin (`metadata-tools.ts`)
- `showWithPreferredSize` - Demonstrates preferred-frame-size
- `showWithRenderData` - Demonstrates initial-render-data

### Async Protocol Tools Plugin (`async-tools.ts`)
- `showAsyncToolCall` - Demonstrates async message protocol
- `processAsyncRequest` - Handles async tool call requests

**To enable these example plugins for testing**, see [Configuration](#configuration) below.

## Testing with ConvoUI-iOS

### Swift Integration

```swift
import ConvoUI

let mcpClient = MCPClient(serverURL: URL(string: "http://localhost:3100")!)

// Initialize connection
try await mcpClient.initialize()

// List tools
let tools = try await mcpClient.listTools()

// Call a tool
let result = try await mcpClient.callTool(name: "showSimpleHtml", parameters: [:])

// Display UI resource
if let resource = result.content.first {
    let message = FinConvoMCPUIMessageModel.messageFromMCPResource(
        resource,
        messageId: UUID().uuidString,
        timestamp: Date()
    )
    resourceView.loadResource(message)
}
```

### cURL Testing

```bash
# Initialize session
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'

# List tools
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'

# Call a tool
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "showSimpleHtml",
      "arguments": {}
    }
  }'
```

## Development

### Project Structure

```
mcpui-server/
├── src/
│   ├── server.ts           # Main Express server
│   ├── config/
│   │   └── tools.ts        # 🎯 Tool configuration
│   ├── tools/
│   │   ├── index.ts        # Tool registry
│   │   ├── tool-plugin.ts  # Plugin interface (type definitions)
│   │   ├── plugin-loader.ts # Plugin discovery system
│   │   └── plugins/        # 🎯 Put your custom plugins here
│   │       ├── examples/   # 📝 Example plugins (disabled by default)
│   │       │   ├── html-tools.ts
│   │       │   ├── url-tools.ts
│   │       │   ├── remote-dom-tools.ts
│   │       │   ├── metadata-tools.ts
│   │       │   └── async-tools.ts
│   │       └── (your-plugin.ts) # 🎯 Your custom plugins go here
│   └── utils/
│       └── logger.ts       # Logging utilities
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

🎯 = Primary customization points  
📝 = Example/reference code (disabled by default)

**Important:** Put your custom plugins in `src/tools/plugins/` (NOT in `examples/`). They will be auto-discovered on server startup.

🎯 = Primary customization points  
📝 = Sample/reference code (disabled by default)

### Creating Custom Tools

#### Where to Put Your Plugins

**Important Folder Structure:**
- `src/tools/tool-plugin.ts` - Plugin interface/type definitions (don't modify)
- `src/tools/plugins/` - **Put your custom plugins here** ✅
- `src/tools/plugins/examples/` - Example plugins (reference only, don't put your plugins here)

#### Method 1: Plugin System (Recommended)

Create a plugin in `src/tools/plugins/` (NOT in `examples/`):

```typescript
// src/tools/plugins/my-tools.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createUIResource } from '@mcp-ui/server';
import type { MCPUIToolPlugin } from '../tool-plugin.js';

export const myPlugin: MCPUIToolPlugin = {
  name: 'my-custom-tools',
  version: '1.0.0',
  description: 'My custom tool plugin',
  
  async register(server: McpServer) {
    server.registerTool('myTool', {
      title: 'My Custom Tool',
      description: 'Does something useful',
      inputSchema: { type: 'object', properties: {} },
    }, async (params) => {
      const uiResource = createUIResource({
        uri: 'ui://my-tool/1',
        content: { type: 'rawHtml', htmlString: '<h1>Hello</h1>' },
        encoding: 'text',
      });
      return { content: [uiResource] };
    });
  },
};

export default myPlugin;
```

The plugin will be auto-discovered and loaded on server startup (plugins in `examples/` are excluded unless explicitly enabled).

#### Method 2: Custom Tool Modules

Create a module that exports a `register` function and add it to `customToolPaths` in `src/config/tools.ts`.

**See example plugins in `src/tools/plugins/examples/` for reference implementations.**

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
EXPOSE 3100
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t mcpui-test-server .
docker run -p 3100:3100 --env-file .env mcpui-test-server
```

## Troubleshooting

### Connection Issues

- Verify server is running: `curl http://localhost:3100/health`
- Check firewall settings
- Ensure client is pointing to correct URL

### Session Issues

- Sessions expire after 1 hour by default
- Check `SESSION_TIMEOUT` in `.env`
- Monitor session count via `/health` endpoint

## Documentation

- **[PLUGIN-DEVELOPMENT.md](./PLUGIN-DEVELOPMENT.md)** - Complete guide for developing custom MCP-UI tool plugins
- **[CUSTOMIZATION.md](./CUSTOMIZATION.md)** - General customization guide
- **[../../docs/scaffold-guide.md](../../docs/scaffold-guide.md)** - Scaffold tool usage

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## License

MIT

## Related Projects

- [ConvoUI-iOS](../ConvoUI-iOS) - Native iOS MCP-UI client
- [MCP Protocol](https://modelcontextprotocol.io/) - Official specification
- [@mcp-ui/server](https://www.npmjs.com/package/@mcp-ui/server) - MCP-UI server SDK
