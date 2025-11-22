# MCP Logging Guide

This guide explains the logging added to track tool calls between `agui-test-server` and `mcpui-test-server`.

## Overview

Based on your logs, the LLM returned HTML as text instead of making a tool call. The logs show:
- `toolCallCount: 0`
- `toolCalls: []`

This means the LLM didn't actually call any tools - it just generated HTML code in its response text.

## What Logs to Look For

### In agui-test-server Logs

#### 1. LLM Response Logging
Look for these log messages when the LLM responds:

```
[INFO] Received successful response from LLM API, starting to parse stream
[INFO] LLM tool call detected { toolCallId: "...", toolName: "showSimpleHtml" }
[INFO] LLM response parsing completed { toolCallCount: 1, toolCalls: [...] }
```

**If you see `toolCallCount: 0`**, the LLM didn't make any tool calls.

#### 2. MCP Tool Execution Logging
If tool calls are detected, you'll see:

```
[INFO] Completing final tool call from LLM response
[INFO] Executing tool via MCP { toolName: "showSimpleHtml" }
[INFO] Calling MCP tool with parsed arguments { toolName: "showSimpleHtml", toolArgs: {} }
[INFO] MCP tool call completed { resultContentCount: 1 }
```

### In mcpui-test-server Logs

#### 1. MCP Request Logging
Every MCP request will be logged:

```
[INFO] 📥 Received MCP POST request
  sessionId: "..."
  method: "tools/call"
  toolName: "showSimpleHtml"
  toolArguments: {}
```

#### 2. Tool Call Execution Logging
When a tool is actually called:

```
[INFO] 🔧 MCP tools/call request - TOOL CALL RECEIVED
[INFO] 🔧 TOOL CALL: showSimpleHtml - Starting execution
[INFO] 🔧 TOOL CALL: showSimpleHtml - Parameters parsed
[INFO] ✅ TOOL CALL: showSimpleHtml - Execution completed successfully
[INFO] ✅ MCP request handled successfully
```

#### 3. Session Initialization
When agui-test-server connects:

```
[INFO] 🔄 MCP initialize request
[INFO] MCP session initialized { sessionId: "..." }
[INFO] New MCP server instance created and connected
```

## Debugging Steps

### Step 1: Check if MCP Connection is Established

**agui-test-server logs should show:**
```
[INFO] Initializing MCP client with HTTP transport
[INFO] Connected to MCP server { serverId: 'mcpui-server', transport: 'http' }
[INFO] MCP client initialized successfully
```

**If you don't see these**, check:
- `MCP_SERVER_URL` is set correctly in `.env`
- `mcpui-test-server` is running on port 3100
- Network connectivity between servers

### Step 2: Check if LLM is Making Tool Calls

**Look for in agui-test-server logs:**
```
[INFO] LLM tool call detected { toolCallId: "...", toolName: "..." }
```

**If you don't see this**, the LLM is not making tool calls. Possible reasons:
- LLM doesn't have tool definitions in the request
- LLM prompt doesn't trigger tool usage
- LLM model doesn't support tool calling

### Step 3: Check if Tool Calls Reach mcpui-test-server

**Look for in mcpui-test-server logs:**
```
[INFO] 🔧 MCP tools/call request - TOOL CALL RECEIVED
```

**If you don't see this**, tool calls are not reaching mcpui-test-server. Check:
- MCP client connection status
- Network connectivity
- Session ID is being maintained

### Step 4: Check Tool Execution

**Look for in mcpui-test-server logs:**
```
[INFO] 🔧 TOOL CALL: showSimpleHtml - Starting execution
[INFO] ✅ TOOL CALL: showSimpleHtml - Execution completed successfully
```

**If you see errors**, check:
- Tool name matches registered tools
- Tool arguments are valid
- Tool implementation is working

## Example: Successful Tool Call Flow

### agui-test-server logs:
```
[INFO] Received successful response from LLM API
[INFO] LLM tool call detected { toolCallId: "call_123", toolName: "showSimpleHtml" }
[INFO] LLM response parsing completed { toolCallCount: 1 }
[INFO] Completing final tool call from LLM response
[INFO] Executing tool via MCP { toolName: "showSimpleHtml" }
[INFO] Calling MCP tool with parsed arguments { toolArgs: {} }
[INFO] MCP tool call completed { resultContentCount: 1 }
```

### mcpui-test-server logs:
```
[INFO] 📥 Received MCP POST request { method: "tools/call", toolName: "showSimpleHtml" }
[INFO] 🔧 MCP tools/call request - TOOL CALL RECEIVED
[INFO] 🔧 TOOL CALL: showSimpleHtml - Starting execution
[INFO] 🔧 TOOL CALL: showSimpleHtml - Parameters parsed
[INFO] ✅ TOOL CALL: showSimpleHtml - Execution completed successfully
[INFO] ✅ MCP request handled successfully { duration: 15 }
```

## Example: No Tool Call (Your Current Situation)

### agui-test-server logs:
```
[INFO] LLM response parsing completed
  toolCallCount: 0
  toolCalls: []
```

### mcpui-test-server logs:
```
(No logs - no requests received)
```

**This means:** The LLM generated HTML as text instead of calling a tool.

## Why LLM Might Not Make Tool Calls

1. **No tool definitions in request**: The LLM needs tool definitions in the request to know what tools are available
2. **Prompt doesn't trigger tool usage**: The prompt might not be phrased in a way that triggers tool calling
3. **Model limitations**: Some models may not support tool calling well
4. **Tool calling disabled**: Check if tools are being passed to the LLM in the request

## Next Steps

1. **Check LLM request**: Verify that tools are being sent to the LLM
2. **Check LLM response**: Look for `toolCallCount` in logs
3. **Check mcpui-test-server logs**: See if any requests are received
4. **Test with explicit tool prompt**: Try a prompt that explicitly requests a tool call

## Testing Tool Calls Directly

You can test if mcpui-test-server is working by calling it directly:

```bash
# Initialize session
SESSION_ID=$(curl -i -X POST http://localhost:3100/mcp \
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
  }' | grep -i "mcp-session-id" | cut -d' ' -f2 | tr -d '\r')

# Call a tool
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "showSimpleHtml",
      "arguments": {}
    }
  }'
```

Check mcpui-test-server logs - you should see:
```
[INFO] 🔧 MCP tools/call request - TOOL CALL RECEIVED
[INFO] 🔧 TOOL CALL: showSimpleHtml - Starting execution
[INFO] ✅ TOOL CALL: showSimpleHtml - Execution completed successfully
```

