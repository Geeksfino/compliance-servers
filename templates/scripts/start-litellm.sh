#!/bin/bash
# LiteLLM Startup Script

# Get the script directory (templates/scripts)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Get templates directory (parent of scripts)
TEMPLATES_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
# Get project root directory (parent of templates)
PROJECT_ROOT="$(cd "$TEMPLATES_DIR/.." && pwd)"

# Virtual environment path (.venv is in project root)
VENV_PATH="$PROJECT_ROOT/.venv"

# Activate virtual environment
if [ ! -d "$VENV_PATH" ]; then
    echo "Error: Virtual environment .venv does not exist at $VENV_PATH"
    echo "Please create the virtual environment first:"
    echo "  cd $PROJECT_ROOT"
    echo "  python3 -m venv .venv"
    echo "  source .venv/bin/activate"
    echo "  pip install 'litellm[proxy]'"
    exit 1
fi

source "$VENV_PATH/bin/activate"

# Get litellm executable path
LITELLM_CMD="$VENV_PATH/bin/litellm"

# Verify litellm is installed
if [ ! -f "$LITELLM_CMD" ]; then
    echo "Error: litellm command not found in virtual environment at $LITELLM_CMD"
    echo ""
    echo "Please install litellm with proxy support:"
    echo "  cd $PROJECT_ROOT"
    echo "  source .venv/bin/activate"
    echo "  pip install 'litellm[proxy]'"
    exit 1
fi

# Check if API key is provided
if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo "Error: Please set DEEPSEEK_API_KEY environment variable"
    echo ""
    echo "Usage:"
    echo "  DEEPSEEK_API_KEY=your-api-key $0"
    echo ""
    echo "Or set the environment variable first:"
    echo "  export DEEPSEEK_API_KEY=your-api-key"
    echo "  $0"
    exit 1
fi

# Start LiteLLM proxy
# Note: LiteLLM uses environment variables to pass API key, not command-line arguments
echo "Starting LiteLLM proxy server..."
echo "Model: deepseek-chat"
echo "Port: 4000"
echo "API Key: ${DEEPSEEK_API_KEY:0:10}..." # Show only first 10 characters
echo ""

# Pass API key via environment variable
# Use full path to litellm to ensure it's found
DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" "$LITELLM_CMD" \
    --model deepseek/deepseek-chat \
    --port 4000
