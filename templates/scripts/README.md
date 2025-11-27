# Scripts Directory

This directory contains utility scripts for the project.

## Scripts

### start-litellm.sh

Script to start the LiteLLM proxy server.

**Usage:**

```bash
# Method 1: Specify API key directly
DEEPSEEK_API_KEY=your-api-key ./scripts/start-litellm.sh

# Method 2: Set environment variable first
export DEEPSEEK_API_KEY=your-api-key
./scripts/start-litellm.sh
```

**Prerequisites:**

1. Create Python virtual environment in project root:
   ```bash
   cd /Users/wubingjie/Documents/Code/compliance-servers
   python3 -m venv .venv
   source .venv/bin/activate
   pip install 'litellm[proxy]'
   ```
   
   **Note:** Use `'litellm[proxy]'` (with quotes) to install the proxy server dependencies, not just `litellm`.

2. Get DeepSeek API Key from https://platform.deepseek.com/

**Notes:**

- The script automatically finds the `.venv` virtual environment in the project root
- LiteLLM proxy runs on `http://localhost:4000` by default
- API key is passed via environment variable, not command-line arguments

## Directory Structure

```
templates/
├── scripts/
│   ├── start-litellm.sh    # LiteLLM startup script
│   └── README.md           # This file
└── test-server.sh          # Server testing script
```

## Notes

- All scripts should be run from the `templates/` directory
- Python virtual environment `.venv` should be in the project root (`compliance-servers/.venv`)
- Ensure required dependencies are installed in the virtual environment
