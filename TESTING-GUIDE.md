# Testing Guide: agui-test-server → mcpui-test-server Integration

## Overview

This guide explains how to test that `agui-test-server` makes tool calls to `mcpui-test-server`. The integration works as follows:

1. **agui-test-server** runs an LLM agent that receives tool calls from an LLM
2. When a tool call is detected, it uses the MCP client to call tools on **mcpui-test-server**
3. **mcpui-test-server** executes the tool and returns UI resources
4. **agui-test-server** streams the results back as AG-UI events

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│ agui-test-server │─────────▶│ mcpui-test-server│
│  (Port 3000)    │  HTTP    │   (Port 3100)    │
│                 │◀─────────│                  │
└─────────────────┘         └──────────────────┘
       │
       │ AG-UI Events (SSE)
       ▼
   Client/NeuronKit
```

### Key Components

**agui-test-server:**
- `src/mcp/client.ts` - MCP client manager
- `src/mcp/http-transport.ts` - HTTP transport for MCP protocol
- `src/agents/llm.ts` - LLM agent that calls MCP tools (lines 338-430)
- `src/server.ts` - Initializes MCP connection on startup (lines 78-107)

**mcpui-test-server:**
- `src/server.ts` - Express server with MCP endpoints
- `src/tools/` - All available tools (HTML, URL, Remote DOM, etc.)

## Setup Instructions

### Step 1: Build Both Servers

```bash
# Build mcpui-test-server
cd mcpui-test-server
npm install
npm run build

# Build agui-test-server
cd ../agui-test-server
npm install
npm run build
```

### Step 2: Configure agui-test-server

Create or edit `.env` file in `agui-test-server/`:

**Option A: HTTP Transport (Recommended for Testing)**

```env
# Server configuration
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=debug
LOG_PRETTY=true

# Agent mode - must be 'llm' to enable MCP tool calls
AGENT_MODE=llm

# LLM Configuration (choose one)
# Option 1: LiteLLM
LLM_PROVIDER=litellm
LITELLM_ENDPOINT=http://localhost:4000/v1
LITELLM_API_KEY=your-key-here
LITELLM_MODEL=deepseek-chat

# Option 2: DeepSeek Direct
# LLM_PROVIDER=deepseek
# DEEPSEEK_API_KEY=your-deepseek-key
# DEEPSEEK_MODEL=deepseek-chat

# MCP Configuration - HTTP Transport
MCP_SERVER_URL=http://localhost:3100/mcp
```

**Option B: stdio Transport (Alternative)**

```env
# MCP Configuration - stdio transport
MCP_SERVER_COMMAND=node
MCP_SERVER_ARGS=../mcpui-test-server/dist/server.js
```

### Step 3: Start mcpui-test-server

```bash
cd mcpui-test-server
PORT=3100 npm start
```

You should see:
```
🚀 MCP-UI Test Server running at http://0.0.0.0:3100
📡 MCP endpoint: POST/GET/DELETE /mcp
❤️  Health check: GET /health
🔧 Tools list: GET /tools
```

### Step 4: Start agui-test-server

```bash
cd agui-test-server
npm start
```

**Look for these log messages:**

✅ **Success indicators:**
```
Initializing MCP client with HTTP transport { url: 'http://localhost:3100/mcp' }
Using HTTP transport for MCP connection { serverId: 'mcpui-server', url: 'http://localhost:3100/mcp' }
Connected to MCP server { serverId: 'mcpui-server', transport: 'http' }
MCP client initialized successfully
AG-UI Test Server started
```

❌ **Failure indicators:**
```
Failed to initialize MCP client, continuing without MCP support
```

## Testing Methods

### Method 1: Using the HTTP Integration Test Script

The repository includes a test script:

```bash
cd compliance-servers
chmod +x test-http-mcp-integration.sh
./test-http-mcp-integration.sh
```

This script:
1. Builds both servers
2. Starts mcpui-test-server on port 3100
3. Starts agui-test-server on port 3000
4. Tests MCP protocol directly
5. Tests agui-test-server agent endpoint
6. Verifies HTTP transport usage

### Method 2: Manual Testing with cURL

#### Test 1: Verify mcpui-test-server is Running

```bash
curl http://localhost:3100/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "uptime": 123.45,
  "sessions": 0,
  "version": "1.0.0"
}
```

#### Test 2: Verify agui-test-server Connected to MCP

```bash
curl http://localhost:3000/health
```

Check the agui-test-server logs - you should see MCP connection messages.

#### Test 3: Trigger Tool Call via LLM Agent

**Prerequisites:** You need a working LLM (LiteLLM or DeepSeek API key)

```bash
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "threadId": "test-123",
    "runId": "run_1",
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "Show me a simple HTML page"
      }
    ],
    "tools": [],
    "context": []
  }'
```

**What to look for in the response:**

1. **TOOL_CALL_START** event with tool name (e.g., `showSimpleHtml`)
2. **TOOL_CALL_ARGS** events with arguments
3. **TOOL_CALL_END** event
4. **TOOL_CALL_RESULT** event with text content
5. **CUSTOM** event with `name: "mcp-ui-resource"` containing the UI resource

**Expected event flow:**
```
event: message
data: {"type":"RUN_STARTED","threadId":"test-123","runId":"run_1"}

event: message
data: {"type":"TEXT_MESSAGE_START","messageId":"msg_xxx","role":"assistant"}

event: message
data: {"type":"TEXT_MESSAGE_CHUNK","messageId":"msg_xxx","delta":"I'll show you..."}

event: message
data: {"type":"TOOL_CALL_START","toolCallId":"call_xxx","toolCallName":"showSimpleHtml","parentMessageId":"msg_xxx"}

event: message
data: {"type":"TOOL_CALL_ARGS","toolCallId":"call_xxx","delta":"{}"}

event: message
data: {"type":"TOOL_CALL_END","toolCallId":"call_xxx"}

event: message
data: {"type":"TOOL_CALL_RESULT","toolCallId":"call_xxx","messageId":"msg_result_xxx","content":"Tool executed successfully","role":"tool"}

event: message
data: {"type":"CUSTOM","name":"mcp-ui-resource","value":{"type":"resource","resource":{"uri":"mcp-ui://html/...","mimeType":"text/html"}}}

event: message
data: {"type":"RUN_FINISHED","threadId":"test-123","runId":"run_1"}
```

### Method 3: Testing Without LLM (Emulated Mode)

If you don't have an LLM configured, you can test the MCP connection directly:

#### Test MCP Connection Status

Check if the MCP client is connected by looking at server logs on startup. The connection happens in `src/server.ts` lines 78-107.

#### Test Direct MCP Tool Call (Bypassing LLM)

You can modify the scenario agent to test MCP calls, or create a test endpoint. However, the current implementation only calls MCP tools when:
1. Agent mode is `llm` (not `emulated`)
2. LLM returns a tool call
3. MCP server ID is configured (`mcpServerId: 'mcpui-server'`)

## Monitoring and Debugging

### Key Log Messages to Watch

**agui-test-server logs:**

1. **On startup:**
   ```
   Initializing MCP client with HTTP transport
   Using HTTP transport for MCP connection
   Connected to MCP server
   MCP client initialized successfully
   ```

2. **When tool call happens:**
   ```
   Executing tool via MCP { toolCallId: '...', toolName: 'showSimpleHtml', mcpServerId: 'mcpui-server' }
   Calling MCP tool { serverId: 'mcpui-server', toolName: 'showSimpleHtml', args: {...} }
   MCP tool call completed { serverId: 'mcpui-server', toolName: 'showSimpleHtml', contentCount: 1 }
   Emitted MCP UI resource as CUSTOM event
   ```

3. **On errors:**
   ```
   Failed to execute MCP tool { toolCallId: '...', toolName: '...', error: '...' }
   ```

**mcpui-test-server logs:**

1. **On connection:**
   ```
   Received MCP POST request
   MCP session initialized { sessionId: '...' }
   ```

2. **On tool call:**
   ```
   Tool called: showSimpleHtml
   ```

### Common Issues and Solutions

#### Issue 1: MCP Client Not Initializing

**Symptoms:**
- Log shows "Failed to initialize MCP client"
- No MCP connection messages

**Solutions:**
- Check `MCP_SERVER_URL` is correct: `http://localhost:3100/mcp`
- Verify mcpui-test-server is running: `curl http://localhost:3100/health`
- Check network connectivity between servers
- Review error logs for specific error messages

#### Issue 2: Tool Calls Not Happening

**Symptoms:**
- LLM responds but no tool calls are made
- No `TOOL_CALL_START` events in response

**Solutions:**
- Verify `AGENT_MODE=llm` (not `emulated`)
- Check LLM is configured correctly (API keys, endpoints)
- Ensure LLM actually returns tool calls (some prompts may not trigger tools)
- Check `mcpServerId` is set in agent factory (`src/routes/agent-factory.ts` line 46 or 62)

#### Issue 3: Tool Call Fails

**Symptoms:**
- `TOOL_CALL_START` appears but `TOOL_CALL_RESULT` shows error
- Log shows "Failed to execute MCP tool"

**Solutions:**
- Verify tool name matches available tools: `curl http://localhost:3100/tools`
- Check tool arguments are valid JSON
- Review mcpui-test-server logs for errors
- Verify MCP session is still active

#### Issue 4: HTTP Transport Not Working

**Symptoms:**
- Connection fails with HTTP errors
- Session ID not being maintained

**Solutions:**
- Check `MCP_SERVER_URL` includes `/mcp` path
- Verify CORS is configured correctly in mcpui-test-server
- Check `mcp-session-id` header is being sent/received
- Review HTTP transport implementation (`src/mcp/http-transport.ts`)

## Code Flow Analysis

### How Tool Calls Work

1. **LLM Agent receives tool call** (`src/agents/llm.ts:284-327`)
   - Parses tool call from LLM stream
   - Emits `TOOL_CALL_START`, `TOOL_CALL_ARGS`, `TOOL_CALL_END` events

2. **MCP tool execution** (`src/agents/llm.ts:338-430`)
   - Checks if MCP client is connected: `mcpClientManager.isConnected('mcpui-server')`
   - Parses tool arguments from JSON
   - Calls MCP tool: `mcpClientManager.callTool('mcpui-server', toolName, args)`

3. **MCP client makes HTTP request** (`src/mcp/client.ts:111-153`)
   - Uses HTTP transport to send `tools/call` request
   - Receives response with tool result

4. **HTTP transport** (`src/mcp/http-transport.ts:62-190`)
   - Sends POST request to `http://localhost:3100/mcp`
   - Includes `mcp-session-id` header
   - Parses SSE or JSON response

5. **Results streamed back** (`src/agents/llm.ts:375-408`)
   - Emits `TOOL_CALL_RESULT` with text content
   - Emits `CUSTOM` events for UI resources

### Connection Initialization

**On server startup** (`src/server.ts:78-107`):

```typescript
if (config.mcpServerUrl || config.mcpServerCommand) {
  let mcpConfig: MCPClientConfig;
  
  if (config.mcpServerUrl) {
    mcpConfig = { url: config.mcpServerUrl };
  } else if (config.mcpServerCommand) {
    mcpConfig = { 
      command: config.mcpServerCommand,
      args: config.mcpServerArgs 
    };
  }
  
  await mcpClientManager.connect('mcpui-server', mcpConfig);
}
```

## Available Tools for Testing

The mcpui-test-server provides these tools (check with `curl http://localhost:3100/tools`):

1. `showSimpleHtml` - Simple HTML page
2. `showInteractiveForm` - Form with validation
3. `showComplexLayout` - Multi-column layout
4. `showAnimatedContent` - Animated HTML
5. `showResponsiveCard` - Responsive card layout
6. `showExampleSite` - External URL (example.com)
7. `showCustomUrl` - Custom URL
8. `showApiDocs` - API documentation URL
9. `showRemoteDomButton` - Remote DOM button
10. `showRemoteDomForm` - Remote DOM form
11. `showRemoteDomChart` - Remote DOM chart
12. `showRemoteDomWebComponents` - Web components
13. `showWithPreferredSize` - With preferred size metadata
14. `showWithRenderData` - With render data metadata
15. `showResponsiveLayout` - Responsive layout
16. `showAsyncToolCall` - Async protocol demo
17. `showProgressIndicator` - Progress indicator

## Example Test Prompts

Try these prompts with the LLM agent to trigger different tools:

- "Show me a simple HTML page" → `showSimpleHtml`
- "Display example.com" → `showExampleSite`
- "Show me a form" → `showInteractiveForm`
- "Create a button with counter" → `showRemoteDomButton`
- "Show me a chart" → `showRemoteDomChart`

## Verification Checklist

- [ ] Both servers build successfully
- [ ] mcpui-test-server starts on port 3100
- [ ] agui-test-server starts on port 3000
- [ ] MCP client initializes successfully (check logs)
- [ ] Health endpoints respond correctly
- [ ] LLM agent mode is configured (`AGENT_MODE=llm`)
- [ ] LLM API keys/endpoints are configured
- [ ] Tool calls appear in event stream
- [ ] Tool results are returned correctly
- [ ] UI resources appear as CUSTOM events
- [ ] No errors in server logs

## Next Steps

Once basic testing works:

1. Test with different tools
2. Test error scenarios (invalid tool names, network failures)
3. Test session management (multiple concurrent requests)
4. Test with real NeuronKit client
5. Monitor performance and resource usage
6. Test cloud deployment scenarios

## Additional Resources

- `test-http-mcp-integration.sh` - Automated test script
- `test-mcp-integration.sh` - Manual test guide
- `MCP-INTEGRATION-SUMMARY.md` - Integration documentation
- `CLOUD-DEPLOYMENT-GUIDE.md` - Deployment guide

