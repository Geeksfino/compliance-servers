# LiteLLM 集成指南

[English](./litellm-guide.md) | [中文](./litellm-guide.zh.md)

本指南介绍如何在 compliance-servers 的 AG-UI 服务器模板中使用 LiteLLM。

## 什么是 LiteLLM？

[LiteLLM](https://github.com/BerriAI/litellm) 是一个代理服务器，通过单一的 OpenAI 兼容 API 提供统一接口来访问多个 LLM 提供商（OpenAI、Anthropic、DeepSeek、Google 等）。这使您能够：

- **在 LLM 提供商之间切换**而无需更改代码
- **在同一应用程序中使用多个提供商**
- **访问没有官方 SDK 的提供商**
- **将 LLM 集成标准化**为 OpenAI API 格式

## LiteLLM 在本项目中的使用方式

compliance-servers 模板包含 LiteLLM 集成作为默认的 LLM 提供商选项。工作原理如下：

1. **LiteLLM 代理服务器**：作为独立服务运行（通常在端口 4000），将请求转换为各种 LLM 提供商
2. **AG-UI 服务器**：使用 OpenAI 兼容的 API 格式连接到 LiteLLM 代理
3. **内置脚本**：方便的 `start-litellm.sh` 脚本自动处理设置和启动

## 架构

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  AG-UI      │         │   LiteLLM     │         │   LLM        │
│  服务器     │────────▶│   代理        │────────▶│   提供商     │
│  (端口 3000)│         │  (端口 4000)  │         │ (DeepSeek,   │
│             │         │               │         │  OpenAI 等)  │
└─────────────┘         └──────────────┘         └─────────────┘
```

AG-UI 服务器向 LiteLLM 发送 OpenAI 格式的请求，然后 LiteLLM 将它们转发给实际的 LLM 提供商。

## 快速开始

### 步骤 1: 创建项目

```bash
npx @finogeek/agui-mcpui-servers my-project
cd my-project
pnpm install
```

### 步骤 2: 设置 LiteLLM（仅首次）

创建 Python 虚拟环境并安装 LiteLLM：

```bash
# 从项目根目录
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install 'litellm[proxy]'
```

> **重要**：使用引号包裹 `'litellm[proxy]'` 以确保安装所有代理依赖。

### 步骤 3: 获取 API 密钥

从您首选的 LLM 提供商获取 API 密钥：
- **DeepSeek**: https://platform.deepseek.com/
- **OpenAI**: https://platform.openai.com/
- **Anthropic**: https://console.anthropic.com/
- **Google**: https://makersuite.google.com/

### 步骤 4: 启动 LiteLLM 代理

使用内置脚本（推荐）：

```bash
# 从项目根目录
DEEPSEEK_API_KEY=your-api-key ./scripts/start-litellm.sh
```

或先设置环境变量：

```bash
export DEEPSEEK_API_KEY=your-api-key
./scripts/start-litellm.sh
```

脚本将：
- 自动查找并激活 `.venv` 虚拟环境
- 验证 LiteLLM 是否已安装
- 在 `http://localhost:4000` 上启动代理服务器

### 步骤 5: 配置 AG-UI 服务器

在 `agui-server/` 目录中创建或更新 `.env`：

```env
# 代理模式
AGENT_MODE=llm
LLM_PROVIDER=litellm

# LiteLLM 配置
LITELLM_ENDPOINT=http://localhost:4000/v1
LITELLM_API_KEY=your-key  # 可以是任何值（LiteLLM 使用提供商 API 密钥）
LITELLM_MODEL=deepseek-chat
```

### 步骤 6: 启动 AG-UI 服务器

```bash
cd agui-server
pnpm run dev
```

AG-UI 服务器现在将使用 LiteLLM 与您的 LLM 提供商通信！

## 配置选项

### 环境变量

| 变量 | 描述 | 默认值 | 必需 |
|------|------|--------|------|
| `LLM_PROVIDER` | LLM 提供商（`litellm` 或 `deepseek`） | `litellm` | 否 |
| `LITELLM_ENDPOINT` | LiteLLM 代理端点 | - | 是（如果使用 LiteLLM） |
| `LITELLM_API_KEY` | API 密钥（可以是任何值） | - | 是（如果使用 LiteLLM） |
| `LITELLM_MODEL` | 要使用的模型名称 | `deepseek-chat` | 否 |

### LiteLLM 代理配置

`start-litellm.sh` 脚本使用以下默认值：
- **端口**: 4000
- **模型**: `deepseek/deepseek-chat`
- **API 密钥**: 通过 `DEEPSEEK_API_KEY` 环境变量传递

要自定义，请编辑 `templates/scripts/start-litellm.sh` 或手动启动 LiteLLM。

## 使用不同的 LLM 提供商

LiteLLM 支持许多提供商。要使用不同的提供商：

### 选项 1: 修改启动脚本

编辑 `scripts/start-litellm.sh` 并更改模型：

```bash
# 对于 OpenAI
OPENAI_API_KEY=your-key litellm --model gpt-4 --port 4000

# 对于 Anthropic Claude
ANTHROPIC_API_KEY=your-key litellm --model claude-3-opus-20240229 --port 4000

# 对于 Google Gemini
GOOGLE_API_KEY=your-key litellm --model gemini/gemini-pro --port 4000
```

### 选项 2: 使用 LiteLLM 配置文件

创建 `litellm_config.yaml`：

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

然后启动 LiteLLM：

```bash
litellm --config litellm_config.yaml --port 4000
```

### 选项 3: 手动启动

```bash
source .venv/bin/activate

# 设置提供商特定的 API 密钥
export OPENAI_API_KEY=your-key  # 或 ANTHROPIC_API_KEY、GOOGLE_API_KEY 等

# 使用您的模型启动 LiteLLM
litellm --model gpt-4 --port 4000
```

然后更新您的 AG-UI 服务器 `.env`：

```env
LITELLM_MODEL=gpt-4  # 匹配您在 LiteLLM 中启动的模型
```

## 高级用法

### 自定义 LiteLLM 端口

如果您想在不同的端口上运行 LiteLLM：

1. 在自定义端口上启动 LiteLLM：
   ```bash
   litellm --model deepseek/deepseek-chat --port 5000
   ```

2. 更新 AG-UI 服务器 `.env`：
   ```env
   LITELLM_ENDPOINT=http://localhost:5000/v1
   ```

### 多个模型

您可以为不同的模型运行多个 LiteLLM 实例：

```bash
# 终端 1: DeepSeek
DEEPSEEK_API_KEY=key1 litellm --model deepseek/deepseek-chat --port 4000

# 终端 2: OpenAI
OPENAI_API_KEY=key2 litellm --model gpt-4 --port 4001
```

然后通过更改 `.env` 中的 `LITELLM_ENDPOINT` 在它们之间切换。

### 使用 Docker 运行 LiteLLM

您也可以在 Docker 中运行 LiteLLM：

```bash
docker run -d \
  -p 4000:4000 \
  -e DEEPSEEK_API_KEY=your-key \
  ghcr.io/berriai/litellm:latest \
  --model deepseek/deepseek-chat
```

查看 [cloud-deployment-guide.md](./cloud-deployment-guide.md) 了解更多 Docker 示例。

## 故障排除

### 问题："LiteLLM 配置缺失"

**解决方案**：确保设置了所有必需的环境变量：
- `LITELLM_ENDPOINT`
- `LITELLM_API_KEY`
- `LITELLM_MODEL`（可选，默认为 `deepseek-chat`）

### 问题："虚拟环境 .venv 不存在"

**解决方案**：创建虚拟环境：
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install 'litellm[proxy]'
```

### 问题："找不到 litellm 命令"

**解决方案**：确保在虚拟环境中安装了 LiteLLM：
```bash
source .venv/bin/activate
pip install 'litellm[proxy]'
```

确保使用引号：`'litellm[proxy]'` 而不是 `litellm[proxy]`。

### 问题："连接被拒绝" 或 "ECONNREFUSED"

**解决方案**：
1. 验证 LiteLLM 代理是否正在运行：
   ```bash
   curl http://localhost:4000/health
   ```

2. 检查端口是否与您的配置匹配：
   - LiteLLM 默认值：`4000`
   - AG-UI 配置：`LITELLM_ENDPOINT=http://localhost:4000/v1`

3. 确保 LiteLLM 可以从 AG-UI 服务器访问（同一台机器或网络）

### 问题："401 未授权" 或 "无效的 API 密钥"

**解决方案**：
1. 验证您的 API 密钥是否正确
2. 对于 DeepSeek，确保在启动 LiteLLM 时设置了 `DEEPSEEK_API_KEY`
3. 对于其他提供商，使用适当的环境变量：
   - OpenAI: `OPENAI_API_KEY`
   - Anthropic: `ANTHROPIC_API_KEY`
   - Google: `GOOGLE_API_KEY`

### 问题："找不到模型" 或 "无效模型"

**解决方案**：
1. 检查模型名称格式：
   - DeepSeek: `deepseek/deepseek-chat`
   - OpenAI: `gpt-4`、`gpt-3.5-turbo`
   - Anthropic: `claude-3-opus-20240229`

2. 验证模型在您的提供商账户中是否可用

3. 确保 AG-UI `.env` 中的 `LITELLM_MODEL` 与 LiteLLM 中启动的模型匹配

## 使用 LiteLLM 的优势

1. **提供商灵活性**：无需更改代码即可在提供商之间切换
2. **统一 API**：所有提供商使用相同的 OpenAI 兼容接口
3. **成本管理**：LiteLLM 可以跟踪跨提供商的使用情况和成本
4. **回退支持**：配置自动回退到备用提供商
5. **速率限制**：内置速率限制和重试逻辑
6. **监控**：请求日志记录和分析

## 替代方案：直接提供商集成

如果您不想使用 LiteLLM，可以直接使用 `deepseek` 提供商。这更简单，无需额外设置：

### DeepSeek 直接集成

**优势：**
- ✅ 无需额外服务（无需 LiteLLM 代理）
- ✅ 更简单的设置 - 只需设置环境变量
- ✅ 更低的延迟（直接连接）
- ✅ 更少的组件

**设置：**

1. 从 https://platform.deepseek.com/ 获取您的 DeepSeek API 密钥

2. 配置您的 `.env` 文件：
```env
AGENT_MODE=llm
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat
```

3. 启动服务器：
```bash
pnpm run dev
```

就这样！服务器直接连接到 DeepSeek 的 API，无需 LiteLLM。

**何时选择：**

| 使用场景 | 推荐 |
|----------|------|
| 只需要 DeepSeek，想要最简单的设置 | **DeepSeek 直接** |
| 需要在多个提供商之间切换 | **LiteLLM** |
| 想要提供商抽象层 | **LiteLLM** |
| 需要高级功能（回退、速率限制） | **LiteLLM** |
| 简单项目，单一提供商 | **DeepSeek 直接** |

查看 [AG-UI 服务器 README](../templates/agui-server/README.md) 了解有关 DeepSeek 直接集成的更多详细信息。

## 其他资源

- [LiteLLM 文档](https://docs.litellm.ai/)
- [LiteLLM GitHub](https://github.com/BerriAI/litellm)
- [支持的提供商](https://docs.litellm.ai/docs/providers)
- [LiteLLM 配置](https://docs.litellm.ai/docs/proxy/configs)
- [AG-UI 服务器 README](../templates/agui-server/README.md)
- [脚本 README](../templates/scripts/README.md)

## 示例：完整设置

这是使用 DeepSeek 设置 LiteLLM 的完整示例：

```bash
# 1. 创建项目
npx @finogeek/agui-mcpui-servers my-agent
cd my-agent
pnpm install

# 2. 设置 Python 环境
python3 -m venv .venv
source .venv/bin/activate
pip install 'litellm[proxy]'

# 3. 启动 LiteLLM（在一个终端中）
DEEPSEEK_API_KEY=sk-your-key ./scripts/start-litellm.sh

# 4. 配置 AG-UI 服务器（在另一个终端中）
cd agui-server
cat > .env << EOF
AGENT_MODE=llm
LLM_PROVIDER=litellm
LITELLM_ENDPOINT=http://localhost:4000/v1
LITELLM_API_KEY=any-value
LITELLM_MODEL=deepseek-chat
MCP_SERVER_URL=http://localhost:3100/mcp
EOF

# 5. 启动 AG-UI 服务器
pnpm run dev
```

您的 AG-UI 服务器现在正在使用 LiteLLM 与 DeepSeek 通信！

