#!/bin/bash
# Manual test script for MCP integration
# This demonstrates the end-to-end flow without requiring a real LLM

set -e

echo "=== MCP Integration Manual Test ==="
echo ""

# Check if servers are built
if [ ! -d "agui-test-server/dist" ]; then
  echo "Building agui-test-server..."
  cd agui-test-server && npm run build && cd ..
fi

if [ ! -d "mcpui-test-server/dist" ]; then
  echo "Building mcpui-test-server..."
  cd mcpui-test-server && npm run build && cd ..
fi

echo "✓ Servers built"
echo ""

# Create test .env for agui-test-server
echo "Creating test configuration..."
cat > agui-test-server/.env.test << EOF
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=debug
LOG_PRETTY=true
AGENT_MODE=emulated
DEFAULT_SCENARIO=tool-call
MCP_SERVER_COMMAND=node
MCP_SERVER_ARGS=../mcpui-test-server/dist/server.js
EOF

echo "✓ Configuration created"
echo ""

echo "=== Test Plan ==="
echo "1. Start agui-test-server with MCP configuration"
echo "2. Verify MCP client initializes"
echo "3. Use scenario agent to test event flow"
echo "4. Check logs for MCP connection"
echo ""

echo "To test manually:"
echo "  1. Build both servers: npm run build (in each directory)"
echo "  2. Configure MCP in agui-test-server/.env:"
echo "     MCP_SERVER_COMMAND=node"
echo "     MCP_SERVER_ARGS=../mcpui-test-server/dist/server.js"
echo "  3. Start server: cd agui-test-server && npm start"
echo "  4. Check startup logs for: 'MCP client initialized successfully'"
echo "  5. Test with scenario: curl http://localhost:3000/scenarios/tool-call"
echo ""

echo "For full LLM integration test:"
echo "  1. Start LiteLLM proxy: litellm --model deepseek/deepseek-chat"
echo "  2. Configure AGENT_MODE=llm and LiteLLM settings in .env"
echo "  3. Send request with tool call prompt:"
echo "     curl -X POST http://localhost:3000/agent \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"threadId\":\"test\",\"runId\":\"1\",\"messages\":[{\"id\":\"1\",\"role\":\"user\",\"content\":\"Show me a simple HTML page\"}]}'"
echo ""

# Cleanup
rm -f agui-test-server/.env.test

echo "=== Test script complete ==="
