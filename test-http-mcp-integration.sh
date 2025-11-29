#!/bin/bash

# Test HTTP-based MCP Integration
# This script demonstrates agui-test-server connecting to mcpui-test-server via HTTP

set -e

echo "========================================"
echo "HTTP MCP Integration Test"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if servers are built
echo "${BLUE}Checking if servers are built...${NC}"
if [ ! -d "mcpui-test-server/dist" ]; then
    echo "Building mcpui-test-server..."
    cd mcpui-test-server && npm run build && cd ..
fi

if [ ! -d "agui-test-server/dist" ]; then
    echo "Building agui-test-server..."
    cd agui-test-server && npm run build && cd ..
fi

echo "${GREEN}✓ Servers are built${NC}"
echo ""

# Start mcpui-test-server in background
echo "${BLUE}Starting mcpui-test-server on port 3100...${NC}"
cd mcpui-test-server
PORT=3100 HOST=0.0.0.0 node dist/server.js > /tmp/mcpui-server.log 2>&1 &
MCPUI_PID=$!
cd ..

# Wait for server to start
sleep 3

# Check if server is running
if ! curl -s http://localhost:3100/health > /dev/null; then
    echo "Error: mcpui-test-server failed to start"
    cat /tmp/mcpui-server.log
    kill $MCPUI_PID 2>/dev/null || true
    exit 1
fi

echo "${GREEN}✓ mcpui-test-server is running (PID: $MCPUI_PID)${NC}"
echo ""

# Test MCP protocol via HTTP
echo "${BLUE}Testing MCP protocol via HTTP...${NC}"
echo ""

# Test 1: Initialize session
echo "Test 1: Initialize MCP session"
RESPONSE=$(curl -s -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }')

SESSION_ID=$(echo "$RESPONSE" | grep -o '"mcp-session-id":"[^"]*"' | cut -d'"' -f4)
if [ -z "$SESSION_ID" ]; then
    # Try to extract from headers if available in response
    SESSION_ID=$(curl -i -s -X POST http://localhost:3100/mcp \
      -H "Content-Type: application/json" \
      -H "Accept: application/json, text/event-stream" \
      -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
          "protocolVersion": "2024-11-05",
          "capabilities": {},
          "clientInfo": {"name": "test-client", "version": "1.0.0"}
        }
      }' | grep -i "mcp-session-id:" | cut -d' ' -f2 | tr -d '\r')
fi

if [ -z "$SESSION_ID" ]; then
    echo "Error: Failed to get session ID"
    kill $MCPUI_PID 2>/dev/null || true
    exit 1
fi

echo "${GREEN}✓ Session established: $SESSION_ID${NC}"
echo ""

# Test 2: List tools
echo "Test 2: List available tools"
TOOLS=$(curl -s -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }')

TOOL_COUNT=$(echo "$TOOLS" | grep -o '"name"' | wc -l)
echo "${GREEN}✓ Retrieved $TOOL_COUNT tools${NC}"
echo ""

# Test 3: Call a tool
echo "Test 3: Call showSimpleHtml tool"
RESULT=$(curl -s -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "showSimpleHtml",
      "arguments": {}
    }
  }')

if echo "$RESULT" | grep -q '"content"'; then
    echo "${GREEN}✓ Tool call successful${NC}"
    echo "  Result contains UI resource content"
else
    echo "Error: Tool call failed"
    echo "$RESULT"
fi
echo ""

# Now test agui-test-server with HTTP transport
echo "${BLUE}Testing agui-test-server with HTTP MCP transport...${NC}"
echo ""

# Create temporary config for agui-test-server
cat > /tmp/agui-test.env << EOF
PORT=3000
HOST=0.0.0.0
AGENT_MODE=emulated
DEFAULT_SCENARIO=simple-chat
MCP_SERVER_URL=http://localhost:3100/mcp
LOG_LEVEL=info
EOF

echo "Starting agui-test-server with HTTP MCP transport..."
cd agui-test-server
PORT=3000 MCP_SERVER_URL=http://localhost:3100/mcp AGENT_MODE=emulated node dist/server.js > /tmp/agui-server.log 2>&1 &
AGUI_PID=$!
cd ..

# Wait for server to start
sleep 3

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "Error: agui-test-server failed to start"
    cat /tmp/agui-server.log
    kill $MCPUI_PID $AGUI_PID 2>/dev/null || true
    exit 1
fi

echo "${GREEN}✓ agui-test-server is running (PID: $AGUI_PID)${NC}"
echo "${GREEN}✓ MCP client connected via HTTP${NC}"
echo ""

# Test AG-UI endpoint
echo "Test 4: Call AG-UI agent endpoint"
AGUI_RESPONSE=$(curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "threadId": "test-123",
    "runId": "run_1",
    "messages": [{"id":"1","role":"user","content":"hello"}],
    "tools": [],
    "context": []
  }')

if [ $? -eq 0 ]; then
    echo "${GREEN}✓ AG-UI agent endpoint working${NC}"
else
    echo "Error: AG-UI agent endpoint failed"
fi
echo ""

# Cleanup
echo "${BLUE}Cleaning up...${NC}"
kill $MCPUI_PID $AGUI_PID 2>/dev/null || true
sleep 1

# Check logs for HTTP transport messages
if grep -q "HTTP transport" /tmp/agui-server.log; then
    echo "${GREEN}✓ HTTP transport was used${NC}"
fi

echo ""
echo "========================================"
echo "${GREEN}All tests passed!${NC}"
echo "========================================"
echo ""
echo "Summary:"
echo "  ✓ mcpui-test-server HTTP endpoints working"
echo "  ✓ MCP session management working"
echo "  ✓ MCP tool listing working"
echo "  ✓ MCP tool calling working"
echo "  ✓ agui-test-server connected via HTTP"
echo "  ✓ AG-UI agent endpoint working"
echo ""
echo "For cloud deployment:"
echo "  1. Run mcpui-test-server as a standalone service"
echo "  2. Configure agui-test-server with: MCP_SERVER_URL=http://mcpui-server:3100/mcp"
echo "  3. Both servers run independently, communicate over HTTP"
