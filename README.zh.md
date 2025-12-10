# Compliance Servers - AG-UI 和 MCP-UI 模板

[English](./README.md) | [中文](./README.zh.md)

本仓库包含用于创建 AG-UI 和 MCP-UI 服务器的生产就绪模板和脚手架工具。

## 快速开始

### 创建新项目

**使用脚手架创建项目：**

```bash
# 创建包含 AG-UI 和 MCP-UI 服务器的组合项目
npx @finogeek/agui-mcpui-servers my-project
```

然后：

```bash
cd my-project
pnpm install
./start.sh
# 或: pnpm dev
```

这将创建一个自动协同工作的双服务器项目！

## 包含内容

### 模板

`templates/` 目录包含一个组合项目模板，其中 AG-UI 和 MCP-UI 服务器协同工作。模板确保两个服务器始终配置为协同工作，并自动设置 MCP 连接。

### 示例服务器

- **`agui-test-server`**: AG-UI 服务器的参考实现（用于测试）
- **`mcpui-test-server`**: MCP-UI 服务器的参考实现（用于测试）

**注意**：这些是用于开发的测试服务器。对于新项目，请使用脚手架工具，它会创建一个包含两个服务器的组合项目。

### 自定义 LLM Server 示例

`templates/llm-custom-server/` 目录包含一个自定义 LLM 服务器示例，演示如何为自定义 LLM API 创建 OpenAI 兼容的代理服务。当您需要将自定义 LLM 提供商与 AG-UI 或其他 OpenAI 兼容的客户端集成时，这非常有用。

**功能特性：**
- OpenAI 兼容的 `/v1/chat/completions` 端点
- SSE 流式传输支持
- 支持 Docker 部署
- 详细用法请参见 `templates/README.md`

### 脚手架工具

用于从模板创建新项目的 CLI 工具，具有：
- 交互式提示
- 项目名称验证
- 自动 git 初始化
- 可选的依赖安装
- 全面的文档

## 功能特性

### AG-UI 服务器模板

- ✅ AG-UI 协议合规
- ✅ LLM 提供商集成（LiteLLM、DeepSeek、OpenAI）
- ✅ MCP 服务器连接
- ✅ 可配置的系统提示
- ✅ 服务器发送事件（SSE）流式传输
- ✅ 会话管理
- ✅ 基于场景的测试
- ✅ 完整的 TypeScript 支持

**关键自定义点：**
- 系统提示配置（`src/config/system-prompt.ts`）
- LLM 设置（`src/routes/agent-factory.ts`）
- 自定义路由和端点
- 基于环境的配置

### MCP-UI 服务器模板

- ✅ MCP 协议合规
- ✅ 内置工具类别（HTML、URL、远程 DOM、元数据、异步）
- ✅ 自定义工具插件系统
- ✅ 可配置的工具注册
- ✅ UI 资源生成
- ✅ 会话管理
- ✅ 完整的 TypeScript 支持

**关键自定义点：**
- 工具配置（`src/config/tools.ts`）
- 自定义工具插件（`src/tools/plugins/`）
- 工具类别（启用/禁用）
- 基于环境的配置

## 安装

### 通过 npx（推荐）

无需安装：

```bash
npx @finogeek/agui-mcpui-servers <project-name>
```

### 全局安装

```bash
npm install -g @finogeek/agui-mcpui-servers
scaffold my-project
```

### 本地开发

```bash
git clone <repo>
cd compliance-servers
pnpm install
pnpm scaffold my-project
```

## 使用方法

### 基本命令

```bash
scaffold <project-name> [options]
```

### 选项

| 选项 | 描述 |
|------|------|
| `--description` | 项目描述 |
| `--author` | 作者名称 |
| `--output` | 输出目录 |
| `--install` | 自动安装依赖 |
| `--no-git` | 跳过 git 初始化 |
| `--help` | 显示帮助信息 |

### 示例

```bash
# 基本组合项目
npx @finogeek/agui-mcpui-servers coding-assistant

# 带选项
npx @finogeek/agui-mcpui-servers my-agent \
  --description "我的 AI 代理，带自定义工具" \
  --author "您的姓名" \
  --install

# 自定义输出目录
npx @finogeek/agui-mcpui-servers financial-bot \
  --output ./agents/financial \
  --install
```

## 文档

### 中文 (Chinese)
- **[docs/litellm-guide.zh.md](./docs/litellm-guide.zh.md)** - LiteLLM 集成指南

### English
- **[docs/scaffold-guide.md](./docs/scaffold-guide.md)** - Comprehensive scaffold tool guide
- **[docs/litellm-guide.md](./docs/litellm-guide.md)** - LiteLLM integration guide (recommended for LLM setup)
- **[docs/testing-guide.md](./docs/testing-guide.md)** - Testing strategies
- **[docs/cloud-deployment-guide.md](./docs/cloud-deployment-guide.md)** - Deployment instructions
- **[docs/mcp-logging-guide.md](./docs/mcp-logging-guide.md)** - MCP logging reference

### 模板
- **[templates/agui-server/CUSTOMIZATION.md](./templates/agui-server/CUSTOMIZATION.md)** - AG-UI 自定义指南
- **[templates/mcpui-server/CUSTOMIZATION.md](./templates/mcpui-server/CUSTOMIZATION.md)** - MCP-UI 自定义指南
- **[templates/README.md](./templates/README.md)** - 模板 README（包含自定义 LLM Server 示例）

## 模板结构

### AG-UI 服务器

```
agui-server-template/
├── src/
│   ├── config/
│   │   └── system-prompt.ts     # 🎯 自定义系统提示
│   ├── agents/
│   │   └── llm.ts               # LLM 代理逻辑
│   ├── routes/
│   │   ├── agent.ts             # 主端点
│   │   └── agent-factory.ts     # 🎯 LLM 配置
│   └── server.ts                # 服务器入口点
├── CUSTOMIZATION.md             # 详细自定义指南
└── README.md
```

### MCP-UI 服务器

```
mcpui-server-template/
├── src/
│   ├── config/
│   │   └── tools.ts             # 🎯 工具配置
│   ├── tools/
│   │   ├── index.ts             # 工具注册
│   │   └── plugins/             # 🎯 自定义插件
│   ├── plugins/
│   │   └── tool-plugin.ts       # 插件接口
│   └── server.ts                # 服务器入口点
├── CUSTOMIZATION.md             # 详细自定义指南
└── README.md
```

🎯 = 主要自定义点

## 配置

### AG-UI 服务器环境变量

```env
# 服务器
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=*

# 代理模式
AGENT_MODE=llm  # 或 'emulated'

# LLM 提供商 - 选择以下选项之一：

# 选项 1: 直接使用 DeepSeek（最简单，无需额外服务）
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat

# 选项 2: 使用 LiteLLM（推荐用于多个提供商）
# 查看 docs/litellm-guide.md 了解详细的 LiteLLM 设置说明
# LLM_PROVIDER=litellm
# LITELLM_ENDPOINT=http://localhost:4000/v1
# LITELLM_API_KEY=your-key
# LITELLM_MODEL=deepseek-chat

# MCP 连接
MCP_SERVER_URL=http://localhost:3100/mcp

# 自定义系统提示
AGUI_SYSTEM_PROMPT="你是一个有用的助手"
```

### MCP-UI 服务器环境变量

```env
# 服务器
PORT=3100
HOST=0.0.0.0
CORS_ORIGIN=*

# 工具配置
MCPUI_ENABLED_CATEGORIES=html,url,remote-dom,metadata,async
MCPUI_CUSTOM_TOOLS=./custom/tool1.js,./custom/tool2.js
MCPUI_TOOL_PLUGINS=my-plugin.js
```

## 开发

### 运行模板服务器

```bash
# AG-UI 测试服务器
cd agui-test-server
pnpm install
MCP_SERVER_URL=http://localhost:3100/mcp pnpm run dev --use-llm

# MCP-UI 测试服务器
cd mcpui-test-server
pnpm install
pnpm run dev
```

### 测试

```bash
# AG-UI 服务器
cd agui-test-server
pnpm test

# MCP-UI 服务器
cd mcpui-test-server
pnpm test
```

### 构建脚手架工具

```bash
# 在 compliance-servers 根目录
pnpm install
pnpm run build
```

## 集成

### 连接 AG-UI 和 MCP-UI 服务器

1. 启动 MCP-UI 服务器：
   ```bash
   cd mcpui-test-server
   pnpm run dev  # 在端口 3100 上运行
   ```

2. 启动带 MCP 连接的 AG-UI 服务器：
   ```bash
   cd agui-test-server
   MCP_SERVER_URL=http://localhost:3100/mcp pnpm run dev --use-llm
   ```

3. LLM 代理现在可以调用 MCP-UI 工具了！

### 测试集成

```bash
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "threadId": "test",
    "runId": "1",
    "messages": [{"id":"1","role":"user","content":"显示一个简单的 HTML 表单"}],
    "tools": [],
    "context": []
  }'
```

## 部署

查看 [docs/cloud-deployment-guide.md](./docs/cloud-deployment-guide.md) 了解以下部署说明：
- Docker
- Kubernetes
- 云平台（AWS、GCP、Azure）
- 无服务器

## 架构

### AG-UI 协议流程

```
客户端 → AG-UI 服务器 → LLM 提供商
                ↓
         MCP-UI 服务器（工具）
```

### MCP-UI 协议流程

```
AG-UI 服务器 → MCP-UI 服务器
                    ↓
              工具执行
                    ↓
              UI 资源
```

## 贡献

1. Fork 仓库
2. 创建功能分支
3. 进行更改
4. 添加测试
5. 提交拉取请求

## 支持

- 查看 [docs/scaffold-guide.md](./docs/scaffold-guide.md) 了解详细用法
- 查看模板 `CUSTOMIZATION.md` 文件了解自定义指南
- 查看示例服务器了解参考实现
- 查阅官方文档：
  - [AG-UI 文档](https://docs.ag-ui.com)
  - [MCP 文档](https://docs.modelcontextprotocol.io)
  - [MCP-UI 文档](https://docs.mcp-ui.dev)

## 许可证

MIT

## 更新日志

### v1.0.3

- 重构 LiteLLM 集成：重新组织脚本，更新到 .venv，改进错误处理
- 添加服务器端验证和自动修复工具参数以防止 400 错误
- 修复脚手架模板路径解析
- 添加脚本目录检测以修复从不同位置运行脚本时的相对路径问题
- 改进日志记录：start.sh 日志现在写入 templates/logs 目录
- 修复 LLM 代理日志测试中的超时问题
- 增强 HTTP MCP 集成测试，添加 SSE 友好的 Accept 头
- 修复 npx 兼容性的 CLI 执行

### v1.0.1

- 初始发布
- 带可配置系统提示的 AG-UI 服务器模板
- 带插件系统的 MCP-UI 服务器模板
- 带 npx 支持的脚手架 CLI 工具
- 全面的文档
- 示例服务器供参考

