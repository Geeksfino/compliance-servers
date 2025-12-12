# Finstep LLM Proxy Server

这是一个轻量级的 API 代理服务，用于将 Finstep 的自定义 API 转换为 OpenAI 兼容的格式，以便 AG-UI 或其他支持 OpenAI 协议的客户端可以无缝调用。

## 功能特性

*   **OpenAI 兼容接口**: 提供 `/v1/chat/completions` 接口。
*   **流式响应 (Streaming)**: 支持 Server-Sent Events (SSE) 流式输出，适配 Finstep 特有的状态流。
*   **鉴权管理**: 优先使用环境变量 `FINSTEP_API_KEY`，也支持从客户端请求头透传 Key。
*   **Docker 部署**: 提供一键式 Docker 部署方案。

## 快速开始

### 1. 准备文件

确保当前目录下包含以下文件：
*   `custom_finstep.py` (主程序脚本)
*   `Dockerfile` (构建文件)

### 2. 构建 Docker 镜像

在项目根目录下运行：

```bash
docker build -t finstep-proxy .
```

### 3. 启动服务

运行容器，并将 `4001` 端口映射到主机。请务必替换 `<YOUR_API_KEY>` 为真实的 Finstep API Key。

```bash
docker run -d \
  --name finstep-proxy \
  -p 4001:4001 \
  -e FINSTEP_API_KEY='AI-ONE-xxxxxxxxxxxxxxxxxxxx' \
  --restart always \
  finstep-proxy
```

### 4. 验证服务

使用 curl 测试服务是否正常运行：

```bash
curl http://localhost:4001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "finstep-proxy",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": true
  }'
```

### 5. 客户端配置 (AG-UI)

在 AG-UI Server 的 `.env` 文件中配置：

```env
# 连接到本地运行的 Docker 容器
LITELLM_ENDPOINT=http://localhost:4001/v1

# 模型名称 (可以是任意值，代理服务会忽略此参数，但建议填写)
LITELLM_MODEL=finstep-proxy

# API Key (如果在 Docker 启动时已配置环境变量，这里可以填任意值)
LITELLM_API_KEY=any
```

---

## 接口说明 (内部协议)

本代理服务封装了上游 Finstep API 的细节。以下是上游接口的协议说明，仅供参考。

### 请求格式

*   **URL**: `https://product-backend.finstep.cn/chat/api/chat/v2/completion`
*   **Method**: `POST`
*   **Header**:
    *   `Content-Type`: `application/json`
    *   `Authorization`: `AI-ONE-xxxxxxxxxxxxxxxxxxxx` (API Key)
*   **Body**:

```json
{
  "userId": "12345679",
  "sessionId": "7742d2c9127a4fc7b106a2ed6f790893",
  "query": "分析⼀下药明康德最近会涨么",
  "sessionTitle": "分析⼀下药明康德最近会涨么"
}
```

### 响应格式 (SSE 流式)

上游接口返回标准的 Server-Sent Events (SSE) 数据流，包含不同的状态阶段：

```text
data:{"status": "THINKING"}
data:{"status": "ORGANIZING"}
data:{"status": "MSG_START"}
data:{"status": "RESPONSING", "type": "deepthink", "text": "嗯"}
data:{"status": "RESPONSING", "type": "deepthink", "text": "用户"}
data:{"status": "MSG_DONE"}
data:{"status": "DONE"}
```

代理服务会自动处理这些状态，仅提取 `RESPONSING` 状态下的 `text` 字段，并将其封装为 OpenAI 标准的 `chat.completion.chunk` 格式返回给客户端。

---

## 开发与调试

如果需要查看日志进行调试：

```bash
docker logs -f finstep-proxy
```

停止并删除容器：

```bash
docker stop finstep-proxy
docker rm finstep-proxy
```