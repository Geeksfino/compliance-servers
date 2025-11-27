#!/bin/bash
# Start script for combined AG-UI and MCP-UI servers
# This script starts the MCP-UI server first, then the AG-UI server with MCP connection

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command-line arguments
ENABLE_EXAMPLES=false
for arg in "$@"; do
  case $arg in
    --mcpui-examples-enabled|--enable-mcpui-examples)
      ENABLE_EXAMPLES=true
      shift
      ;;
    --help|-h)
      echo "Usage: ./start.sh [options]"
      echo ""
      echo "Options:"
      echo "  --mcpui-examples-enabled, --enable-mcpui-examples"
      echo "    Enable example plugins for MCP-UI server (for testing)"
      echo ""
      echo "  --help, -h"
      echo "    Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  MCPUI_EXAMPLES_ENABLED=true    Enable example plugins"
      echo "  MCPUI_PORT=3100                MCP-UI server port"
      echo "  AGUI_PORT=3000                 AG-UI server port"
      echo ""
      exit 0
      ;;
    *)
      # Unknown option
      ;;
  esac
done

# Configuration
MCPUI_PORT=${MCPUI_PORT:-3100}
AGUI_PORT=${AGUI_PORT:-3000}
MCP_SERVER_URL="http://localhost:${MCPUI_PORT}/mcp"

# Check environment variable for example plugins (CLI flag takes precedence)
if [ "${ENABLE_EXAMPLES}" != "true" ]; then
  if [ "${MCPUI_EXAMPLES_ENABLED:-}" = "true" ] || [ "${MCPUI_EXAMPLES_ENABLED:-}" = "1" ]; then
    ENABLE_EXAMPLES=true
  fi
fi

# Build MCP-UI server command with optional --enable-examples flag
MCPUI_CMD="pnpm run dev"
if [ "${ENABLE_EXAMPLES}" = "true" ]; then
  MCPUI_CMD="${MCPUI_CMD} --enable-examples"
fi

# Function to cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down servers...${NC}"
  kill $MCPUI_PID 2>/dev/null || true
  kill $AGUI_PID 2>/dev/null || true
  wait $MCPUI_PID 2>/dev/null || true
  wait $AGUI_PID 2>/dev/null || true
  echo -e "${GREEN}Servers stopped.${NC}"
  exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}Error: pnpm is not installed. Please install pnpm first.${NC}"
  echo "Install with: npm install -g pnpm"
  exit 1
fi

# Check if dependencies are installed
if [ ! -d "agui-server/node_modules" ] || [ ! -d "mcpui-server/node_modules" ]; then
  echo -e "${YELLOW}Dependencies not installed. Installing...${NC}"
  pnpm install
fi

# Build servers if needed
if [ ! -d "agui-server/dist" ] || [ ! -d "mcpui-server/dist" ]; then
  echo -e "${YELLOW}Building servers...${NC}"
  pnpm build
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting Combined AG-UI + MCP-UI Servers${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}MCP-UI Server:${NC} http://localhost:${MCPUI_PORT}"
if [ "${ENABLE_EXAMPLES}" = "true" ]; then
  echo -e "${YELLOW}Example Plugins:${NC} ENABLED"
fi
echo -e "${GREEN}AG-UI Server:${NC}  http://localhost:${AGUI_PORT}"
echo -e "${GREEN}MCP Connection:${NC} ${MCP_SERVER_URL}"
echo ""

# Start MCP-UI server
echo -e "${YELLOW}Starting MCP-UI server...${NC}"
if [ "${ENABLE_EXAMPLES}" = "true" ]; then
  echo -e "${BLUE}  → Example plugins enabled${NC}"
fi
cd mcpui-server
${MCPUI_CMD} > ../mcpui-server.log 2>&1 &
MCPUI_PID=$!
cd ..

# Wait for MCP-UI server to be ready
echo -e "${YELLOW}Waiting for MCP-UI server to start...${NC}"
for i in {1..30}; do
  if curl -s http://localhost:${MCPUI_PORT}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MCP-UI server is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}✗ MCP-UI server failed to start within 30 seconds${NC}"
    kill $MCPUI_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Determine AG-UI agent mode (defaults to emulated if not specified)
AGENT_MODE_VALUE="${AGENT_MODE:-}"
if [ -z "${AGENT_MODE_VALUE}" ] && [ -f "agui-server/.env" ]; then
  AGENT_MODE_VALUE=$(grep -E '^AGENT_MODE=' agui-server/.env | tail -1 | cut -d'=' -f2 | tr -d '\"' | tr -d '\r')
fi

AGUI_MODE_FLAG=""
AGUI_MODE_LABEL="default"
if [ "${AGENT_MODE_VALUE}" = "llm" ]; then
  AGUI_MODE_FLAG="--use-llm"
  AGUI_MODE_LABEL="LLM"
elif [ "${AGENT_MODE_VALUE}" = "emulated" ]; then
  AGUI_MODE_FLAG="--emulated"
  AGUI_MODE_LABEL="emulated"
fi

# Start AG-UI server with MCP connection
echo -e "${YELLOW}Starting AG-UI server (${AGUI_MODE_LABEL} mode)...${NC}"
cd agui-server
MCP_SERVER_URL=${MCP_SERVER_URL} pnpm run dev ${AGUI_MODE_FLAG} > ../agui-server.log 2>&1 &
AGUI_PID=$!
cd ..

# Wait for AG-UI server to be ready
echo -e "${YELLOW}Waiting for AG-UI server to start...${NC}"
for i in {1..30}; do
  if curl -s http://localhost:${AGUI_PORT}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ AG-UI server is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}✗ AG-UI server failed to start within 30 seconds${NC}"
    kill $MCPUI_PID 2>/dev/null || true
    kill $AGUI_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Both servers are running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "MCP-UI Server logs: ${BLUE}tail -f mcpui-server.log${NC}"
echo -e "AG-UI Server logs:  ${BLUE}tail -f agui-server.log${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for processes
wait $MCPUI_PID $AGUI_PID

