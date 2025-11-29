# LiteLLM Integration Guide

[English](./litellm-guide.md) | [中文](./litellm-guide.zh.md)

This guide explains how to use LiteLLM with the AG-UI server templates in compliance-servers.

## What is LiteLLM?

[LiteLLM](https://github.com/BerriAI/litellm) is a proxy server that provides a unified interface to access multiple LLM providers (OpenAI, Anthropic, DeepSeek, Google, etc.) through a single OpenAI-compatible API. This allows you to:

- **Switch between LLM providers** without changing your code
- **Use multiple providers** in the same application
- **Access providers** that don't have official SDKs
- **Standardize** your LLM integration on the OpenAI API format

## How LiteLLM is Used in This Project

The compliance-servers templates include LiteLLM integration as the default LLM provider option. Here's how it works:

1. **LiteLLM Proxy Server**: Runs as a separate service (typically on port 4000) that translates requests to various LLM providers
2. **AG-UI Server**: Connects to the LiteLLM proxy using the OpenAI-compatible API format
3. **Built-in Script**: A convenient `start-litellm.sh` script handles setup and startup automatically

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  AG-UI      │         │   LiteLLM     │         │   LLM        │
│  Server     │────────▶│   Proxy       │────────▶│   Provider   │
│  (Port 3000)│         │  (Port 4000)  │         │ (DeepSeek,   │
│             │         │               │         │  OpenAI, etc)│
└─────────────┘         └──────────────┘         └─────────────┘
```

The AG-UI server sends OpenAI-format requests to LiteLLM, which then forwards them to the actual LLM provider.

## Quick Start

### Step 1: Create a Project

```bash
npx @finogeek/agui-mcpui-servers my-project
cd my-project
pnpm install
```

### Step 2: Set Up LiteLLM (First Time Only)

Create a Python virtual environment and install LiteLLM:

```bash
# From your project root
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install 'litellm[proxy]'
```

> **Important**: Use quotes around `'litellm[proxy]'` to ensure all proxy dependencies are installed.

### Step 3: Get Your API Key

Get an API key from your preferred LLM provider:
- **DeepSeek**: https://platform.deepseek.com/
- **OpenAI**: https://platform.openai.com/
- **Anthropic**: https://console.anthropic.com/
- **Google**: https://makersuite.google.com/

### Step 4: Start LiteLLM Proxy

Use the built-in script (recommended):

```bash
# From your project root
DEEPSEEK_API_KEY=your-api-key ./scripts/start-litellm.sh
```

Or set the environment variable first:

```bash
export DEEPSEEK_API_KEY=your-api-key
./scripts/start-litellm.sh
```

The script will:
- Automatically find and activate the `.venv` virtual environment
- Verify LiteLLM is installed
- Start the proxy server on `http://localhost:4000`

### Step 5: Configure AG-UI Server

Create or update `.env` in your `agui-server/` directory:

```env
# Agent mode
AGENT_MODE=llm
LLM_PROVIDER=litellm

# LiteLLM configuration
LITELLM_ENDPOINT=http://localhost:4000/v1
LITELLM_API_KEY=your-key  # Can be any value (LiteLLM uses provider API key)
LITELLM_MODEL=deepseek-chat
```

### Step 6: Start AG-UI Server

```bash
cd agui-server
pnpm run dev
```

The AG-UI server will now use LiteLLM to communicate with your LLM provider!

## Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LLM_PROVIDER` | LLM provider (`litellm` or `deepseek`) | `litellm` | No |
| `LITELLM_ENDPOINT` | LiteLLM proxy endpoint | - | Yes (if using LiteLLM) |
| `LITELLM_API_KEY` | API key (can be any value) | - | Yes (if using LiteLLM) |
| `LITELLM_MODEL` | Model name to use | `deepseek-chat` | No |

### LiteLLM Proxy Configuration

The `start-litellm.sh` script uses these defaults:
- **Port**: 4000
- **Model**: `deepseek/deepseek-chat`
- **API Key**: Passed via `DEEPSEEK_API_KEY` environment variable

To customize, edit `templates/scripts/start-litellm.sh` or start LiteLLM manually.

## Using Different LLM Providers

LiteLLM supports many providers. To use a different provider:

### Option 1: Modify the Startup Script

Edit `scripts/start-litellm.sh` and change the model:

```bash
# For OpenAI
OPENAI_API_KEY=your-key litellm --model gpt-4 --port 4000

# For Anthropic Claude
ANTHROPIC_API_KEY=your-key litellm --model claude-3-opus-20240229 --port 4000

# For Google Gemini
GOOGLE_API_KEY=your-key litellm --model gemini/gemini-pro --port 4000
```

### Option 2: Use LiteLLM Config File

Create a `litellm_config.yaml`:

```yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: gpt-4
      api_key: os.environ/OPENAI_API_KEY
  - model_name: claude-3
    litellm_params:
      model: claude-3-opus-20240229
      api_key: os.environ/ANTHROPIC_API_KEY
```

Then start LiteLLM:

```bash
litellm --config litellm_config.yaml --port 4000
```

### Option 3: Manual Startup

```bash
source .venv/bin/activate

# Set provider-specific API key
export OPENAI_API_KEY=your-key  # or ANTHROPIC_API_KEY, GOOGLE_API_KEY, etc.

# Start LiteLLM with your model
litellm --model gpt-4 --port 4000
```

Then update your AG-UI server `.env`:

```env
LITELLM_MODEL=gpt-4  # Match the model you started LiteLLM with
```

## Advanced Usage

### Custom LiteLLM Port

If you want to run LiteLLM on a different port:

1. Start LiteLLM on custom port:
   ```bash
   litellm --model deepseek/deepseek-chat --port 5000
   ```

2. Update AG-UI server `.env`:
   ```env
   LITELLM_ENDPOINT=http://localhost:5000/v1
   ```

### Multiple Models

You can run multiple LiteLLM instances for different models:

```bash
# Terminal 1: DeepSeek
DEEPSEEK_API_KEY=key1 litellm --model deepseek/deepseek-chat --port 4000

# Terminal 2: OpenAI
OPENAI_API_KEY=key2 litellm --model gpt-4 --port 4001
```

Then switch between them by changing `LITELLM_ENDPOINT` in your `.env`.

### Using LiteLLM with Docker

You can also run LiteLLM in Docker:

```bash
docker run -d \
  -p 4000:4000 \
  -e DEEPSEEK_API_KEY=your-key \
  ghcr.io/berriai/litellm:latest \
  --model deepseek/deepseek-chat
```

See [cloud-deployment-guide.md](./cloud-deployment-guide.md) for more Docker examples.

## Troubleshooting

### Issue: "LiteLLM configuration missing"

**Solution**: Ensure all required environment variables are set:
- `LITELLM_ENDPOINT`
- `LITELLM_API_KEY`
- `LITELLM_MODEL` (optional, defaults to `deepseek-chat`)

### Issue: "Virtual environment .venv does not exist"

**Solution**: Create the virtual environment:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install 'litellm[proxy]'
```

### Issue: "litellm command not found"

**Solution**: Ensure LiteLLM is installed in the virtual environment:
```bash
source .venv/bin/activate
pip install 'litellm[proxy]'
```

Make sure to use quotes: `'litellm[proxy]'` not `litellm[proxy]`.

### Issue: "Connection refused" or "ECONNREFUSED"

**Solution**: 
1. Verify LiteLLM proxy is running:
   ```bash
   curl http://localhost:4000/health
   ```

2. Check the port matches your configuration:
   - LiteLLM default: `4000`
   - AG-UI config: `LITELLM_ENDPOINT=http://localhost:4000/v1`

3. Ensure LiteLLM is accessible from the AG-UI server (same machine or network)

### Issue: "401 Unauthorized" or "Invalid API Key"

**Solution**:
1. Verify your API key is correct
2. For DeepSeek, ensure `DEEPSEEK_API_KEY` is set when starting LiteLLM
3. For other providers, use the appropriate environment variable:
   - OpenAI: `OPENAI_API_KEY`
   - Anthropic: `ANTHROPIC_API_KEY`
   - Google: `GOOGLE_API_KEY`

### Issue: "Model not found" or "Invalid model"

**Solution**: 
1. Check the model name format:
   - DeepSeek: `deepseek/deepseek-chat`
   - OpenAI: `gpt-4`, `gpt-3.5-turbo`
   - Anthropic: `claude-3-opus-20240229`

2. Verify the model is available in your provider account

3. Ensure `LITELLM_MODEL` in AG-UI `.env` matches the model started in LiteLLM

## Benefits of Using LiteLLM

1. **Provider Flexibility**: Switch between providers without code changes
2. **Unified API**: All providers use the same OpenAI-compatible interface
3. **Cost Management**: LiteLLM can track usage and costs across providers
4. **Fallback Support**: Configure automatic fallback to backup providers
5. **Rate Limiting**: Built-in rate limiting and retry logic
6. **Monitoring**: Request logging and analytics

## Alternative: Direct Provider Integration

If you prefer not to use LiteLLM, you can use the `deepseek` provider directly. This is simpler and requires no additional setup:

### DeepSeek Direct Integration

**Advantages:**
- ✅ No additional services required (no LiteLLM proxy)
- ✅ Simpler setup - just set environment variables
- ✅ Lower latency (direct connection)
- ✅ Fewer moving parts

**Setup:**

1. Get your DeepSeek API key from https://platform.deepseek.com/

2. Configure your `.env` file:
```env
AGENT_MODE=llm
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat
```

3. Start the server:
```bash
pnpm run dev
```

That's it! The server connects directly to DeepSeek's API without needing LiteLLM.

**When to Choose:**

| Use Case | Recommendation |
|----------|---------------|
| Only need DeepSeek, want simplest setup | **DeepSeek Direct** |
| Need to switch between multiple providers | **LiteLLM** |
| Want provider abstraction layer | **LiteLLM** |
| Need advanced features (fallback, rate limiting) | **LiteLLM** |
| Simple project, single provider | **DeepSeek Direct** |

See the [AG-UI server README](../templates/agui-server/README.md) for more details on DeepSeek direct integration.

## Additional Resources

- [LiteLLM Documentation](https://docs.litellm.ai/)
- [LiteLLM GitHub](https://github.com/BerriAI/litellm)
- [Supported Providers](https://docs.litellm.ai/docs/providers)
- [LiteLLM Configuration](https://docs.litellm.ai/docs/proxy/configs)
- [AG-UI Server README](../templates/agui-server/README.md)
- [Scripts README](../templates/scripts/README.md)

## Example: Complete Setup

Here's a complete example of setting up LiteLLM with DeepSeek:

```bash
# 1. Create project
npx @finogeek/agui-mcpui-servers my-agent
cd my-agent
pnpm install

# 2. Set up Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install 'litellm[proxy]'

# 3. Start LiteLLM (in one terminal)
DEEPSEEK_API_KEY=sk-your-key ./scripts/start-litellm.sh

# 4. Configure AG-UI server (in another terminal)
cd agui-server
cat > .env << EOF
AGENT_MODE=llm
LLM_PROVIDER=litellm
LITELLM_ENDPOINT=http://localhost:4000/v1
LITELLM_API_KEY=any-value
LITELLM_MODEL=deepseek-chat
MCP_SERVER_URL=http://localhost:3100/mcp
EOF

# 5. Start AG-UI server
pnpm run dev
```

Your AG-UI server is now using LiteLLM to communicate with DeepSeek!

