# Cloud Deployment Guide: HTTP-based MCP Integration

This guide demonstrates how to deploy `mcpui-test-server` and `agui-test-server` as independent long-running processes in a cloud environment, communicating via HTTP.

## Overview

Instead of using stdio (process spawning), both servers run as independent services and communicate over HTTP:

```
┌─────────────────────────┐
│  agui-test-server       │
│  HTTP Client            │
└──────────┬──────────────┘
           │
           │ HTTP/HTTPS
           │ (network)
           │
┌──────────▼──────────────┐
│  mcpui-test-server      │
│  HTTP Server            │
└─────────────────────────┘
```

## Configuration

### mcpui-test-server (.env)

```env
PORT=3100
HOST=0.0.0.0
NODE_ENV=production
SERVER_NAME=mcpui-test-server
SERVER_VERSION=1.0.0
LOG_LEVEL=info
LOG_PRETTY=false
CORS_ORIGIN=*
SESSION_TIMEOUT=3600000
```

### agui-test-server (.env)

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Agent configuration
AGENT_MODE=llm
DEFAULT_AGENT=litellm

# LLM Provider
LLM_PROVIDER=litellm
LITELLM_ENDPOINT=http://litellm:4000/v1
LITELLM_MODEL=deepseek-chat
LITELLM_API_KEY=your-api-key

# MCP Integration - HTTP Transport
MCP_SERVER_URL=http://mcpui-test-server:3100/mcp

# Logging
LOG_LEVEL=info
LOG_PRETTY=false

# CORS
CORS_ORIGIN=*
```

## Deployment Options

### Option 1: Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # MCP-UI Server - Provides MCP tools via HTTP
  mcpui-test-server:
    build: ./mcpui-test-server
    container_name: mcpui-test-server
    ports:
      - "3100:3100"
    environment:
      - PORT=3100
      - HOST=0.0.0.0
      - NODE_ENV=production
      - LOG_LEVEL=info
      - CORS_ORIGIN=*
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3100/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    restart: unless-stopped
    networks:
      - app-network

  # AG-UI Server - Agent server that uses MCP tools
  agui-test-server:
    build: ./agui-test-server
    container_name: agui-test-server
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - HOST=0.0.0.0
      - NODE_ENV=production
      - AGENT_MODE=llm
      - LLM_PROVIDER=litellm
      - LITELLM_ENDPOINT=http://litellm:4000/v1
      - LITELLM_MODEL=deepseek-chat
      - LITELLM_API_KEY=${LITELLM_API_KEY}
      # HTTP MCP Transport
      - MCP_SERVER_URL=http://mcpui-test-server:3100/mcp
      - LOG_LEVEL=info
    depends_on:
      mcpui-test-server:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    restart: unless-stopped
    networks:
      - app-network

  # Optional: LiteLLM Proxy (if using LiteLLM)
  litellm:
    image: ghcr.io/berriai/litellm:latest
    container_name: litellm
    ports:
      - "4000:4000"
    environment:
      - LITELLM_MASTER_KEY=sk-1234
    command: 
      - "--model"
      - "deepseek/deepseek-chat"
      - "--api_key"
      - "${DEEPSEEK_API_KEY}"
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

**Dockerfiles:**

`mcpui-test-server/Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3100/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "dist/server.js"]
```

`agui-test-server/Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "dist/server.js"]
```

**Running:**

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
curl http://localhost:3100/health
curl http://localhost:3000/health

# Stop services
docker-compose down
```

### Option 2: Kubernetes

Create `kubernetes/`:

**mcpui-server-deployment.yaml**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: mcpui-test-server
  labels:
    app: mcpui-test-server
spec:
  type: ClusterIP
  ports:
    - port: 3100
      targetPort: 3100
      protocol: TCP
      name: http
  selector:
    app: mcpui-test-server
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcpui-test-server
  labels:
    app: mcpui-test-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mcpui-test-server
  template:
    metadata:
      labels:
        app: mcpui-test-server
    spec:
      containers:
      - name: mcpui-test-server
        image: your-registry/mcpui-test-server:1.0.0
        ports:
        - containerPort: 3100
          name: http
        env:
        - name: PORT
          value: "3100"
        - name: HOST
          value: "0.0.0.0"
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3100
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3100
          initialDelaySeconds: 5
          periodSeconds: 10
```

**agui-server-deployment.yaml**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: agui-config
data:
  PORT: "3000"
  HOST: "0.0.0.0"
  NODE_ENV: "production"
  AGENT_MODE: "llm"
  LLM_PROVIDER: "litellm"
  LITELLM_ENDPOINT: "http://litellm:4000/v1"
  LITELLM_MODEL: "deepseek-chat"
  MCP_SERVER_URL: "http://mcpui-test-server:3100/mcp"
  LOG_LEVEL: "info"
---
apiVersion: v1
kind: Secret
metadata:
  name: agui-secrets
type: Opaque
stringData:
  LITELLM_API_KEY: "your-api-key-here"
---
apiVersion: v1
kind: Service
metadata:
  name: agui-test-server
  labels:
    app: agui-test-server
spec:
  type: LoadBalancer
  ports:
    - port: 3000
      targetPort: 3000
      protocol: TCP
      name: http
  selector:
    app: agui-test-server
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agui-test-server
  labels:
    app: agui-test-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agui-test-server
  template:
    metadata:
      labels:
        app: agui-test-server
    spec:
      containers:
      - name: agui-test-server
        image: your-registry/agui-test-server:1.0.0
        ports:
        - containerPort: 3000
          name: http
        envFrom:
        - configMapRef:
            name: agui-config
        - secretRef:
            name: agui-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

**Deploying:**

```bash
# Create namespace
kubectl create namespace compliance-servers

# Apply configurations
kubectl apply -f kubernetes/ -n compliance-servers

# Check status
kubectl get pods -n compliance-servers
kubectl get services -n compliance-servers

# View logs
kubectl logs -f deployment/agui-test-server -n compliance-servers
kubectl logs -f deployment/mcpui-test-server -n compliance-servers

# Test connectivity
kubectl port-forward service/agui-test-server 3000:3000 -n compliance-servers
curl http://localhost:3000/health
```

### Option 3: Cloud Platform (AWS ECS, Google Cloud Run, Azure Container Instances)

**AWS ECS Task Definition Example:**

```json
{
  "family": "compliance-servers",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "mcpui-test-server",
      "image": "your-ecr-registry/mcpui-test-server:1.0.0",
      "portMappings": [
        {
          "containerPort": 3100,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "PORT", "value": "3100"},
        {"name": "HOST", "value": "0.0.0.0"},
        {"name": "NODE_ENV", "value": "production"}
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3100/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/mcpui-test-server",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    },
    {
      "name": "agui-test-server",
      "image": "your-ecr-registry/agui-test-server:1.0.0",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "PORT", "value": "3000"},
        {"name": "HOST", "value": "0.0.0.0"},
        {"name": "NODE_ENV", "value": "production"},
        {"name": "AGENT_MODE", "value": "llm"},
        {"name": "MCP_SERVER_URL", "value": "http://localhost:3100/mcp"}
      ],
      "secrets": [
        {
          "name": "LITELLM_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:litellm-api-key"
        }
      ],
      "dependsOn": [
        {
          "containerName": "mcpui-test-server",
          "condition": "HEALTHY"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/agui-test-server",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## Monitoring and Observability

### Health Checks

Both servers expose `/health` endpoints:

```bash
# Check mcpui-test-server
curl http://mcpui-server:3100/health
# Response: {"status":"ok","timestamp":"...","uptime":123.45,"sessions":5}

# Check agui-test-server
curl http://agui-server:3000/health
# Response: {"status":"ok","timestamp":"...","uptime":123.45,"sessions":5}
```

### Logging

Configure structured JSON logging in production:

```env
LOG_LEVEL=info
LOG_PRETTY=false
```

Logs include:
- HTTP MCP transport connection events
- MCP session establishment
- Tool calls and results
- Error conditions

### Metrics

Monitor these key metrics:
- HTTP response times
- MCP session count
- Tool call success/failure rates
- Memory and CPU usage
- Network connectivity between services

### Alerting

Set up alerts for:
- Health check failures
- HTTP 5xx errors
- MCP connection failures
- High latency (>5s for tool calls)
- Memory/CPU limits reached

## Security Best Practices

### 1. Network Security

```yaml
# Use internal networking
networks:
  internal:
    driver: bridge
    internal: true  # No external access
  
  external:
    driver: bridge
```

### 2. API Authentication

Add API key authentication:

```typescript
// mcpui-test-server middleware
app.use('/mcp', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.MCP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

Configure in agui-test-server:
```env
MCP_SERVER_URL=http://mcpui-test-server:3100/mcp
MCP_API_KEY=your-secure-api-key
```

### 3. TLS/HTTPS

Use HTTPS in production:

```env
MCP_SERVER_URL=https://mcpui-server.internal:3100/mcp
```

### 4. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/mcp', limiter);
```

## Troubleshooting

### Connection Issues

```bash
# Test network connectivity
docker exec agui-test-server curl http://mcpui-test-server:3100/health

# Check DNS resolution
docker exec agui-test-server nslookup mcpui-test-server

# View logs
docker logs agui-test-server | grep "HTTP transport"
docker logs mcpui-test-server | grep "MCP"
```

### Common Issues

**Issue: Connection refused**
```
Solution: Ensure mcpui-test-server is running and healthy before starting agui-test-server
Check: docker-compose depends_on with condition: service_healthy
```

**Issue: Session timeout**
```
Solution: Increase SESSION_TIMEOUT in mcpui-test-server
Default: 3600000 (1 hour)
```

**Issue: High latency**
```
Solution: 
- Ensure both services are in same network/region
- Check network policies and firewalls
- Monitor service resources (CPU/memory)
```

## Performance Tuning

### Scaling

**Horizontal Scaling:**
```yaml
# Scale mcpui-test-server
docker-compose up -d --scale mcpui-test-server=3

# Kubernetes
kubectl scale deployment mcpui-test-server --replicas=5
```

**Load Balancing:**
```yaml
# Add load balancer for mcpui-test-server
services:
  mcpui-lb:
    image: nginx:alpine
    ports:
      - "3100:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - mcpui-test-server
```

### Caching

Consider adding Redis for session caching:

```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## Testing Deployment

```bash
# 1. Start services
docker-compose up -d

# 2. Wait for health checks
sleep 10

# 3. Test MCP connection
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# 4. Test AG-UI endpoint
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","runId":"run_1","messages":[{"id":"1","role":"user","content":"hello"}]}'

# 5. Check logs for HTTP transport
docker logs agui-test-server 2>&1 | grep "HTTP transport"
```

## Summary

This deployment approach provides:
- ✅ Independent, scalable services
- ✅ Network-based communication (suitable for cloud)
- ✅ Easy horizontal scaling
- ✅ Standard cloud deployment patterns
- ✅ Proper health monitoring
- ✅ Clean separation of concerns

Both servers run as long-running processes, communicating over HTTP, which is ideal for cloud deployments.
