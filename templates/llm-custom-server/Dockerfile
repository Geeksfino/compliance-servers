FROM python:3.11-slim

WORKDIR /app

# 安装必要的 Python 依赖
# fastapi: Web 框架
# uvicorn: ASGI 服务器
# requests: 发送 HTTP 请求
RUN pip install --no-cache-dir fastapi uvicorn requests

# 复制应用程序代码
COPY custom_finstep.py .

# 暴露服务端口
EXPOSE 4001

# 启动命令
# 监听所有网络接口 (0.0.0.0) 以允许外部访问
CMD ["python", "custom_finstep.py"]
