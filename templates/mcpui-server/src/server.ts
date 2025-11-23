/**
 * MCP-UI Test Server
 * Main entry point
 * 
 * CUSTOMIZE: This is the main server entry point.
 * You can:
 * - Configure tool registration (see src/config/tools.ts)
 * - Add custom MCP endpoints
 * - Modify CORS settings
 * - Add middleware
 * - Change session management
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import { logger } from './utils/logger.js';
import { SessionManager } from './mcp/session.js';
import { registerTools } from './tools/index.js';
import type { ServerConfig, HealthStatus } from './types/index.js';

// Load environment variables
dotenv.config();

// Parse CLI arguments
const args = process.argv.slice(2);

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
MCP-UI Server

Usage:
  pnpm dev [options]
  pnpm start [options]
  node dist/server.js [options]

Options:
  --enable-examples, --with-examples
    Enable example plugins from src/tools/plugins/examples/
    Useful for testing and development

  --no-examples
    Explicitly disable example plugins (overrides config and env)

  --help, -h
    Show this help message

Examples:
  # Start with example plugins enabled
  pnpm dev --enable-examples

  # Start without example plugins
  pnpm dev --no-examples

  # Start with default configuration
  pnpm dev

Environment Variables:
  MCPUI_ENABLE_EXAMPLE_PLUGINS=true  # Enable example plugins
  PORT=3100                          # Server port
  HOST=0.0.0.0                       # Server host

For more information, see README.md
`);
  process.exit(0);
}

// Server configuration
const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3100'),
  host: process.env.HOST || '0.0.0.0',
  name: process.env.SERVER_NAME || 'mcpui-test-server',
  version: process.env.SERVER_VERSION || '1.0.0',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'),
};

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id'],
}));
app.use(express.json());

// Session manager
const sessionManager = new SessionManager(config.sessionTimeout);

// Store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Start time for uptime calculation
const startTime = Date.now();

// Health check endpoint
app.get('/health', (req, res) => {
  const health: HealthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: (Date.now() - startTime) / 1000,
    sessions: sessionManager.getSessionCount(),
    version: config.version,
  };
  
  res.json(health);
});

// MCP endpoint - POST for client-to-server communication
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const requestBody = req.body;
  const method = requestBody?.method;
  const requestId = requestBody?.id;
  const params = requestBody?.params;
  
  logger.info(
    {
      sessionId,
      method,
      requestId,
      hasParams: !!params,
      paramsPreview: params ? JSON.stringify(params).substring(0, 200) : undefined,
    },
    '📥 Received MCP POST request'
  );
  
  // Log specific request types
  if (method === 'initialize') {
    logger.info(
      {
        sessionId,
        protocolVersion: params?.protocolVersion,
        clientInfo: params?.clientInfo,
        capabilities: params?.capabilities,
      },
      '🔄 MCP initialize request'
    );
  } else if (method === 'tools/list') {
    logger.info({ sessionId }, '📋 MCP tools/list request');
  } else if (method === 'tools/call') {
    logger.info(
      {
        sessionId,
        toolName: params?.name,
        toolArguments: params?.arguments,
        requestId,
      },
      '🔧 MCP tools/call request - TOOL CALL RECEIVED'
    );
  } else {
    logger.debug(
      {
        sessionId,
        method,
        requestId,
        body: JSON.stringify(requestBody).substring(0, 500),
      },
      'MCP request details'
    );
  }
  
  let transport: StreamableHTTPServerTransport;

  try {
    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
      logger.debug({ sessionId }, 'Reusing existing transport');
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // Create new transport for initialization
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
          sessionManager.createSession(sid);
          logger.info({ sessionId: sid }, 'MCP session initialized');
        },
      });

      // Clean up on close
      transport.onclose = () => {
        if (transport.sessionId) {
          logger.info({ sessionId: transport.sessionId }, 'MCP session closed');
          delete transports[transport.sessionId];
          sessionManager.deleteSession(transport.sessionId);
        }
      };

      // Create new MCP server instance
      const server = new McpServer({
        name: config.name,
        version: config.version,
      });

      // Register all tools (now async to support plugin loading)
      await registerTools(server);

      // Connect server to transport
      await server.connect(transport);
      logger.info('New MCP server instance created and connected');
    } else {
      return res.status(400).json({
        error: { message: 'Bad Request: No valid session ID provided' },
      });
    }

    // Handle the request
    const startTime = Date.now();
    await transport.handleRequest(req, res, req.body);
    const duration = Date.now() - startTime;
    
    logger.info(
      {
        sessionId,
        method,
        requestId,
        duration,
        statusCode: res.statusCode,
      },
      '✅ MCP request handled successfully'
    );
  } catch (error) {
    logger.error(
      {
        sessionId,
        method,
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      '❌ Error handling MCP request'
    );
    res.status(500).json({
      error: { message: 'Internal server error' },
    });
  }
});

// MCP endpoint - GET for server-to-client stream
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  if (!sessionId || !transports[sessionId]) {
    return res.status(404).send('Session not found');
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// MCP endpoint - DELETE for session termination
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  if (!sessionId || !transports[sessionId]) {
    return res.status(404).send('Session not found');
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// List all available tools
app.get('/tools', (req, res) => {
  // This would list all registered tools
  // For now, return a simple response
  res.json({
    tools: [
      'showSimpleHtml',
      'showInteractiveForm',
      'showComplexLayout',
      'showAnimatedContent',
      'showResponsiveCard',
      'showExampleSite',
      'showCustomUrl',
      'showApiDocs',
      'showRemoteDomButton',
      'showRemoteDomForm',
      'showRemoteDomChart',
      'showRemoteDomWebComponents',
      'showWithPreferredSize',
      'showWithRenderData',
      'showResponsiveLayout',
      'showAsyncToolCall',
      'showProgressIndicator',
    ],
  });
});

// Start server
app.listen(config.port, config.host, () => {
  const cliArgs = process.argv.slice(2);
  const examplesEnabled = cliArgs.includes('--enable-examples') || cliArgs.includes('--with-examples');
  
  logger.info(
    {
      port: config.port,
      host: config.host,
      name: config.name,
      version: config.version,
      examplePlugins: examplesEnabled ? 'enabled' : 'disabled',
    },
    `🚀 MCP-UI Test Server running at http://${config.host}:${config.port}`
  );
  logger.info('📡 MCP endpoint: POST/GET/DELETE /mcp');
  logger.info('❤️  Health check: GET /health');
  logger.info('🔧 Tools list: GET /tools');
  if (examplesEnabled) {
    logger.info('📝 Example plugins: ENABLED (use --no-examples to disable)');
  } else {
    logger.info('📝 Example plugins: DISABLED (use --enable-examples to enable)');
  }
});
