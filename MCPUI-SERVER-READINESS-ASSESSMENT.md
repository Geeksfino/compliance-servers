# MCP-UI Server Readiness Assessment

**Date:** November 22, 2025  
**Server:** mcpui-test-server v1.0.0  
**Purpose:** Assess readiness as an MCP server and recommend optimal access method for cloud deployment

---

## Executive Summary

The `mcpui-test-server` is **production-ready as an MCP server** with HTTP transport support. However, the current configuration is optimized for direct client connections (iOS app, browser) rather than server-to-server communication. For cloud deployment where `agui-test-server` needs to access `mcpui-test-server`, we recommend implementing **HTTP-based MCP client transport** instead of stdio.

### Key Findings

✅ **Strengths:**
- Full MCP protocol compliance with 11+ UI resource tools
- HTTP-based transport (StreamableHTTPServerTransport) already implemented
- Session management and health monitoring in place
- Well-tested with zero vulnerabilities
- Scalable Express-based architecture

⚠️ **Current Limitations:**
- Only HTTP transport implemented (no stdio server support yet)
- Current agui-test-server MCP integration uses stdio transport
- Stdio transport not suitable for cloud/network deployment

---

## Part 1: Current Access Methods

### 1.1 HTTP Transport (Currently Implemented) ✅

The `mcpui-test-server` currently exposes MCP protocol via HTTP endpoints:

**Endpoints:**
```
POST /mcp     - Client-to-server messages (JSON-RPC)
GET /mcp      - Server-to-client streaming
DELETE /mcp   - Session termination
GET /health   - Health check
GET /tools    - List available tools
```

**Protocol Flow:**
```
Client → POST /mcp (initialize) → Server creates session
      ← Response with mcp-session-id header
      
Client → POST /mcp (tools/list) with session header
      ← Tool definitions

Client → POST /mcp (tools/call) with session header
      ← UI resources in response

Client → GET /mcp with session header
      ← SSE stream for server-initiated messages
```

**Current Configuration:**
```env
PORT=3100
HOST=0.0.0.0
SERVER_NAME=mcpui-test-server
CORS_ORIGIN=*
SESSION_TIMEOUT=3600000
```

**Access Example:**
```bash
# Initialize session
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'

# Response includes: mcp-session-id header
# All subsequent requests must include this header
```

### 1.2 Stdio Transport (Not Implemented) ❌

The MCP SDK supports `StdioServerTransport`, but `mcpui-test-server` does not currently implement it. This transport:
- Reads from stdin, writes to stdout
- Suitable for process-based communication
- Used by agui-test-server's current MCP client

**Why Not Currently Available:**
The server is built as an Express HTTP server, not a stdio-based process. To add stdio support would require:
1. Creating a separate entry point for stdio mode
2. Replacing Express with stdio transport
3. Maintaining two different server modes

---

## Part 2: Best Communication Method for Cloud Deployment

### 2.1 Problem Analysis

**Current Situation:**
```
agui-test-server (port 3000)
    └─ MCPClientManager uses StdioClientTransport
       └─ Spawns: node ../mcpui-test-server/dist/server.js
           └─ Problem: This starts HTTP server on port 3100, not stdio
```

**Why Stdio is Inappropriate for Cloud:**

1. **Process Coupling**: Stdio requires parent-child process relationship
2. **No Network Communication**: Cannot communicate across containers/hosts
3. **Scaling Issues**: Each agui-test-server instance would spawn its own mcpui-test-server
4. **Resource Waste**: Multiple instances of mcpui-test-server instead of shared service
5. **Port Conflicts**: Spawned processes try to bind to same port 3100

### 2.2 Recommended Solution: HTTP Client Transport

**Architecture:**
```
┌─────────────────────────┐
│  agui-test-server       │
│  (port 3000)            │
│                         │
│  MCPClientManager       │
│  HTTPClientTransport ←──┼──┐
└─────────────────────────┘  │
                             │ HTTP/HTTPS
                             │ (network communication)
                             │
┌────────────────────────────▼─┐
│  mcpui-test-server          │
│  (port 3100)                │
│                             │
│  StreamableHTTPServer       │
│  Transport                  │
└─────────────────────────────┘
```

**Benefits:**

✅ **Network Native**: Works across containers, hosts, clouds  
✅ **Scalable**: Single mcpui-test-server serves multiple clients  
✅ **Long-Running**: Both servers as independent persistent services  
✅ **Load Balancing**: Can put multiple mcpui-test-server instances behind LB  
✅ **Cloud-Ready**: Standard HTTP/HTTPS, works with any cloud provider  
✅ **Secure**: Can use TLS, API keys, OAuth  
✅ **Observable**: Standard HTTP metrics, logging, tracing

**Implementation Requirements:**

1. Create `HTTPClientTransport` for agui-test-server
2. Update MCPClientManager to support HTTP transport
3. Configure HTTP endpoint URL instead of command
4. Handle session management with mcp-session-id header

### 2.3 Alternative: Stdio with Dedicated Entry Point

If stdio is required for some use cases, we could add a separate stdio entry point:

**New file:** `mcpui-test-server/src/stdio-server.ts`
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';

const server = new McpServer({
  name: 'mcpui-test-server',
  version: '1.0.0',
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Pros:**
- Supports both HTTP and stdio modes
- Compatible with current agui-test-server implementation

**Cons:**
- Maintains two server implementations
- Stdio still unsuitable for cloud deployment
- Doesn't solve the fundamental architectural issue

---

## Part 3: Recommended Implementation

### 3.1 HTTP Client Transport for agui-test-server

**New file:** `agui-test-server/src/mcp/http-client.ts`

```typescript
/**
 * HTTP-based MCP Client for network communication with MCP servers
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

export interface HTTPClientTransportConfig {
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export class HTTPClientTransport implements Transport {
  private url: string;
  private headers: Record<string, string>;
  private timeout: number;
  private sessionId?: string;
  private abortController?: AbortController;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(config: HTTPClientTransportConfig) {
    this.url = config.url;
    this.headers = config.headers || {};
    this.timeout = config.timeout || 30000;
  }

  async start(): Promise<void> {
    // HTTP transport doesn't need explicit start
    // Connection established on first request
  }

  async send(message: JSONRPCMessage): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.headers,
    };

    if (this.sessionId) {
      headers['mcp-session-id'] = this.sessionId;
    }

    const abortController = new AbortController();
    this.abortController = abortController;

    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.timeout);

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      // Capture session ID from response header
      const sessionId = response.headers.get('mcp-session-id');
      if (sessionId) {
        this.sessionId = sessionId;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      if (this.onmessage) {
        this.onmessage(responseData as JSONRPCMessage);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (this.onerror) {
        this.onerror(error as Error);
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }
    
    if (this.sessionId) {
      // Send DELETE request to close session
      try {
        await fetch(this.url, {
          method: 'DELETE',
          headers: {
            'mcp-session-id': this.sessionId,
          },
        });
      } catch (error) {
        // Ignore errors on close
      }
    }

    if (this.onclose) {
      this.onclose();
    }
  }
}
```

### 3.2 Updated MCPClientManager

**Update:** `agui-test-server/src/mcp/client.ts`

```typescript
export interface MCPClientConfig {
  // For stdio transport
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  
  // For HTTP transport
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

async connect(serverId: string, config: MCPClientConfig): Promise<void> {
  if (this.clients.has(serverId)) {
    logger.debug({ serverId }, 'MCP client already connected');
    return;
  }

  try {
    let transport;
    
    if (config.url) {
      // Use HTTP transport
      transport = new HTTPClientTransport({
        url: config.url,
        headers: config.headers,
        timeout: config.timeout,
      });
    } else if (config.command) {
      // Use stdio transport
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });
    } else {
      throw new Error('Either url or command must be provided');
    }

    const client = new Client(
      {
        name: 'agui-test-server',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    this.clients.set(serverId, client);

    logger.info({ serverId, transport: config.url ? 'http' : 'stdio' }, 
                 'Connected to MCP server');
  } catch (error) {
    logger.error(
      {
        serverId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to connect to MCP server'
    );
    throw error;
  }
}
```

### 3.3 Configuration Updates

**agui-test-server/.env.example:**

```env
# MCP Server Configuration (choose one transport method)

# Option 1: HTTP Transport (Recommended for cloud deployment)
MCP_TRANSPORT=http
MCP_SERVER_URL=http://localhost:3100/mcp

# Option 2: Stdio Transport (for local/development)
# MCP_TRANSPORT=stdio
# MCP_SERVER_COMMAND=node
# MCP_SERVER_ARGS=../mcpui-test-server/dist/server.js
```

### 3.4 Deployment Configuration

**Docker Compose Example:**

```yaml
version: '3.8'

services:
  mcpui-test-server:
    build: ./mcpui-test-server
    ports:
      - "3100:3100"
    environment:
      - PORT=3100
      - HOST=0.0.0.0
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3100/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  agui-test-server:
    build: ./agui-test-server
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - HOST=0.0.0.0
      - MCP_TRANSPORT=http
      - MCP_SERVER_URL=http://mcpui-test-server:3100/mcp
      - AGENT_MODE=llm
      - LITELLM_ENDPOINT=http://litellm:4000/v1
    depends_on:
      mcpui-test-server:
        condition: service_healthy
```

**Kubernetes Example:**

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: mcpui-test-server
spec:
  selector:
    app: mcpui-test-server
  ports:
    - port: 3100
      targetPort: 3100
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcpui-test-server
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
        image: mcpui-test-server:1.0.0
        ports:
        - containerPort: 3100
        env:
        - name: PORT
          value: "3100"
        - name: HOST
          value: "0.0.0.0"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: agui-config
data:
  MCP_TRANSPORT: "http"
  MCP_SERVER_URL: "http://mcpui-test-server:3100/mcp"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agui-test-server
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
        image: agui-test-server:1.0.0
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: agui-config
```

---

## Part 4: Security Considerations

### 4.1 Current Security Posture

✅ **Implemented:**
- CORS configuration
- Session timeout management
- Input validation via Zod schemas
- Structured logging

⚠️ **Missing for Production:**
- Authentication/Authorization
- Rate limiting
- TLS/HTTPS enforcement
- API key validation

### 4.2 Recommended Security Enhancements

**For HTTP-based communication:**

1. **Add API Key Authentication**
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

2. **Enable TLS in Production**
   ```env
   # Use HTTPS in production
   MCP_SERVER_URL=https://mcpui-server.internal.company.com/mcp
   ```

3. **Network Segmentation**
   - Keep MCP servers in internal network
   - Don't expose directly to internet
   - Use service mesh or VPN for communication

4. **Rate Limiting**
   ```typescript
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/mcp', limiter);
   ```

---

## Part 5: Testing Strategy

### 5.1 HTTP Transport Testing

**Unit Tests:**
```typescript
// Test HTTP client transport
describe('HTTPClientTransport', () => {
  it('should establish connection and maintain session', async () => {
    const transport = new HTTPClientTransport({
      url: 'http://localhost:3100/mcp'
    });
    
    const initMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { /* ... */ }
    };
    
    await transport.send(initMessage);
    expect(transport.sessionId).toBeDefined();
  });
});
```

**Integration Tests:**
```bash
# Terminal 1: Start mcpui-test-server
cd mcpui-test-server && npm start

# Terminal 2: Start agui-test-server with HTTP transport
cd agui-test-server
export MCP_TRANSPORT=http
export MCP_SERVER_URL=http://localhost:3100/mcp
npm start

# Terminal 3: Test the integration
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "test-123",
    "runId": "run_1",
    "messages": [{
      "id": "1",
      "role": "user",
      "content": "Show me a simple HTML page"
    }]
  }'
```

### 5.2 Load Testing

```bash
# Test scalability of HTTP-based communication
ab -n 1000 -c 10 http://localhost:3100/health

# Test MCP tool calls
hey -n 100 -c 5 -m POST \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: <session-id>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  http://localhost:3100/mcp
```

---

## Conclusions and Recommendations

### Summary

1. **mcpui-test-server is MCP-ready** with HTTP transport
2. **Current stdio approach is incompatible** with cloud deployment
3. **HTTP transport is the optimal solution** for server-to-server communication
4. **Both servers can run as long-running processes** independently

### Implementation Priority

**Phase 1: HTTP Client Transport** (Critical - addresses core issue)
- [ ] Implement HTTPClientTransport class
- [ ] Update MCPClientManager to support both transports
- [ ] Add configuration for transport selection
- [ ] Test HTTP-based integration

**Phase 2: Documentation** (High priority)
- [ ] Update deployment guides
- [ ] Add Docker Compose examples
- [ ] Document security best practices
- [ ] Create troubleshooting guide

**Phase 3: Security Hardening** (Medium priority)
- [ ] Add API key authentication
- [ ] Implement rate limiting
- [ ] Add TLS support
- [ ] Network security documentation

**Phase 4: Optional Stdio Support** (Low priority)
- [ ] Add stdio entry point for development
- [ ] Maintain both modes if needed

### Final Recommendation

**Implement HTTP-based MCP client transport in agui-test-server** to enable proper cloud deployment of both servers as independent, long-running services. This approach:

- ✅ Solves the cloud deployment challenge
- ✅ Enables scalability and load balancing
- ✅ Maintains clean separation of concerns
- ✅ Follows cloud-native best practices
- ✅ Supports both servers as persistent services

The stdio transport, while functional for local development, is fundamentally unsuitable for the described cloud deployment scenario where both servers should be independent, scalable, long-running processes.
