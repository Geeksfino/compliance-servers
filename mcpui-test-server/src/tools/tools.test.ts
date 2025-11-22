import { describe, it, expect } from 'vitest';
import { registerHTMLTools } from './html.js';
import { registerURLTools } from './url.js';
import { registerRemoteDOMTools } from './remote-dom.js';
import { registerMetadataTools } from './metadata.js';
import { registerAsyncTools } from './async.js';

// Mock McpServer for testing
class MockMcpServer {
  tools: Map<string, any> = new Map();
  
  registerTool(name: string, definition: any, handler: any) {
    this.tools.set(name, { name, definition, handler });
  }
}

describe('MCP-UI Tools Compliance', () => {
  describe('Tool Registration', () => {
    it('should register all HTML tools', () => {
      const server = new MockMcpServer();
      registerHTMLTools(server as any);
      
      expect(server.tools.has('showSimpleHtml')).toBe(true);
      expect(server.tools.has('showRawHtml')).toBe(true);
      expect(server.tools.has('showInteractiveForm')).toBe(true);
      expect(server.tools.has('showComplexLayout')).toBe(true);
    });

    it('should register all URL tools', () => {
      const server = new MockMcpServer();
      registerURLTools(server as any);
      
      expect(server.tools.has('showExampleSite')).toBe(true);
      expect(server.tools.has('showCustomUrl')).toBe(true);
      expect(server.tools.has('showApiDocs')).toBe(true);
    });

    it('should register all Remote DOM tools', () => {
      const server = new MockMcpServer();
      registerRemoteDOMTools(server as any);
      
      expect(server.tools.has('showRemoteDomButton')).toBe(true);
      expect(server.tools.has('showRemoteDomForm')).toBe(true);
    });

    it('should register all metadata tools', () => {
      const server = new MockMcpServer();
      registerMetadataTools(server as any);
      
      expect(server.tools.has('showWithPreferredSize')).toBe(true);
      expect(server.tools.has('showWithRenderData')).toBe(true);
    });

    it('should register all async tools', () => {
      const server = new MockMcpServer();
      registerAsyncTools(server as any);
      
      expect(server.tools.has('showAsyncToolCall')).toBe(true);
      expect(server.tools.has('processAsyncRequest')).toBe(true);
    });
  });

  describe('HTML Tools - MCP-UI Resource Format', () => {
    it('showSimpleHtml should return valid MCP-UI resource', async () => {
      const server = new MockMcpServer();
      registerHTMLTools(server as any);
      
      const tool = server.tools.get('showSimpleHtml');
      const result = await tool.handler({});
      
      expect(result.content).toHaveLength(1);
      const resource = result.content[0];
      
      // Check MCP-UI resource structure
      expect(resource.type).toBe('resource');
      expect(resource.resource).toBeDefined();
      expect(resource.resource.uri).toMatch(/^ui:\/\//);
      expect(resource.resource.mimeType).toBe('text/html');
      expect(resource.resource.text).toBeDefined();
      expect(resource.resource.text).toContain('<!DOCTYPE html>');
    });

    it('showRawHtml should return valid minimal HTML resource', async () => {
      const server = new MockMcpServer();
      registerHTMLTools(server as any);
      
      const tool = server.tools.get('showRawHtml');
      const result = await tool.handler({});
      
      const resource = result.content[0];
      expect(resource.type).toBe('resource');
      expect(resource.resource.uri).toMatch(/^ui:\/\//);
      expect(resource.resource.text).toContain('<h1>Hello from Raw HTML</h1>');
    });

    it('showInteractiveForm should return valid form resource', async () => {
      const server = new MockMcpServer();
      registerHTMLTools(server as any);
      
      const tool = server.tools.get('showInteractiveForm');
      const result = await tool.handler({});
      
      const resource = result.content[0];
      expect(resource.type).toBe('resource');
      // This tool uses blob encoding, so it has blob property with base64 encoded content
      expect(resource.resource.blob).toBeDefined();
      expect(resource.resource.mimeType).toBe('text/html');
    });

    it('showComplexLayout should return valid layout resource', async () => {
      const server = new MockMcpServer();
      registerHTMLTools(server as any);
      
      const tool = server.tools.get('showComplexLayout');
      const result = await tool.handler({});
      
      const resource = result.content[0];
      expect(resource.type).toBe('resource');
      expect(resource.resource.text).toContain('grid');
    });
  });

  describe('URL Tools - External URL Format', () => {
    it('showExampleSite should return external URL resource', async () => {
      const server = new MockMcpServer();
      registerURLTools(server as any);
      
      const tool = server.tools.get('showExampleSite');
      const result = await tool.handler({});
      
      const resource = result.content[0];
      expect(resource.type).toBe('resource');
      expect(resource.resource.mimeType).toBe('text/uri-list');
      expect(resource.resource.text).toContain('https://example.com');
    });

    it('showCustomUrl should validate HTTPS requirement', async () => {
      const server = new MockMcpServer();
      registerURLTools(server as any);
      
      const tool = server.tools.get('showCustomUrl');
      
      // Should work with HTTPS
      const result = await tool.handler({ url: 'https://example.com' });
      expect(result.content[0].type).toBe('resource');
      
      // Should throw with HTTP
      await expect(tool.handler({ url: 'http://example.com' })).rejects.toThrow();
    });

    it('showApiDocs should return docs URL resource', async () => {
      const server = new MockMcpServer();
      registerURLTools(server as any);
      
      const tool = server.tools.get('showApiDocs');
      const result = await tool.handler({});
      
      const resource = result.content[0];
      expect(resource.type).toBe('resource');
      expect(resource.resource.text).toContain('https://mcpui.dev');
    });
  });

  describe('Remote DOM Tools - Framework Compliance', () => {
    it('showRemoteDomButton should return valid remote DOM resource', async () => {
      const server = new MockMcpServer();
      registerRemoteDOMTools(server as any);
      
      const tool = server.tools.get('showRemoteDomButton');
      const result = await tool.handler({});
      
      const resource = result.content[0];
      expect(resource.type).toBe('resource');
      expect(resource.resource.mimeType).toContain('application/vnd.mcp-ui.remote-dom+javascript');
      expect(resource.resource.mimeType).toContain('framework=react');
      expect(resource.resource.text).toContain('document.createElement');
    });

    it('showRemoteDomForm should return valid remote DOM form resource', async () => {
      const server = new MockMcpServer();
      registerRemoteDOMTools(server as any);
      
      const tool = server.tools.get('showRemoteDomForm');
      const result = await tool.handler({});
      
      const resource = result.content[0];
      expect(resource.type).toBe('resource');
      expect(resource.resource.mimeType).toContain('remote-dom');
      expect(resource.resource.text).toContain('ui-text-field');
    });
  });

  describe('Metadata Tools - Convention Compliance', () => {
    it('showWithPreferredSize should include preferred-frame-size metadata', async () => {
      const server = new MockMcpServer();
      registerMetadataTools(server as any);
      
      const tool = server.tools.get('showWithPreferredSize');
      const result = await tool.handler({});
      
      const resource = result.content[0];
      expect(resource.type).toBe('resource');
      expect(resource.resource._meta).toBeDefined();
      expect(resource.resource._meta?.['mcpui.dev/ui-preferred-frame-size']).toEqual(['400', '300']);
    });

    it('showWithRenderData should include initial-render-data metadata', async () => {
      const server = new MockMcpServer();
      registerMetadataTools(server as any);
      
      const tool = server.tools.get('showWithRenderData');
      const result = await tool.handler({});
      
      const resource = result.content[0];
      expect(resource.type).toBe('resource');
      expect(resource.resource._meta).toBeDefined();
      expect(resource.resource._meta?.['mcpui.dev/ui-initial-render-data']).toBeDefined();
      expect(resource.resource._meta?.['mcpui.dev/ui-initial-render-data']).toHaveProperty('userId');
    });
  });

  describe('Async Tools - Protocol Support', () => {
    it('showAsyncToolCall should return UI with async protocol support', async () => {
      const server = new MockMcpServer();
      registerAsyncTools(server as any);
      
      const tool = server.tools.get('showAsyncToolCall');
      const result = await tool.handler({});
      
      const resource = result.content[0];
      expect(resource.type).toBe('resource');
      expect(resource.resource.text).toContain('messageId');
      expect(resource.resource.text).toContain('ui-message-received');
      expect(resource.resource.text).toContain('ui-message-response');
    });

    it('processAsyncRequest should process requests with delay', async () => {
      const server = new MockMcpServer();
      registerAsyncTools(server as any);
      
      const tool = server.tools.get('processAsyncRequest');
      const startTime = Date.now();
      
      const result = await tool.handler({
        data: 'test data',
        timestamp: Date.now()
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least 1000ms due to simulated processing
      expect(duration).toBeGreaterThanOrEqual(1000);
      
      // Should return text content
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const payload = JSON.parse(result.content[0].text);
      expect(payload.status).toBe('completed');
      expect(payload.received.data).toBe('test data');
    });
  });

  describe('MCP-UI JavaScript Bridge Compliance', () => {
    it('HTML resources should include window.mcpUI.reportSize()', async () => {
      const server = new MockMcpServer();
      registerHTMLTools(server as any);
      
      const tool = server.tools.get('showSimpleHtml');
      const result = await tool.handler({});
      
      const resource = result.content[0];
      expect(resource.resource.text).toContain('window.mcpUI.reportSize');
    });

    it('Interactive HTML should use correct mcpUI API methods', async () => {
      const server = new MockMcpServer();
      registerHTMLTools(server as any);
      
      const tool = server.tools.get('showSimpleHtml');
      const result = await tool.handler({});
      
      const html = result.content[0].resource.text;
      
      // Check for correct API usage
      expect(html).toContain('window.mcpUI.callTool');
      expect(html).toContain('window.mcpUI.triggerIntent');
      expect(html).toContain('window.mcpUI.submitPrompt');
      expect(html).toContain('window.mcpUI.notify');
    });

    it('Async tools should listen for correct message types', async () => {
      const server = new MockMcpServer();
      registerAsyncTools(server as any);
      
      const tool = server.tools.get('showAsyncToolCall');
      const result = await tool.handler({});
      
      const html = result.content[0].resource.text;
      expect(html).toContain("event.data.type === 'ui-message-received'");
      expect(html).toContain("event.data.type === 'ui-message-response'");
    });
  });

  describe('Input Schema Validation', () => {
    it('all tools should have valid inputSchema definitions', () => {
      const server = new MockMcpServer();
      registerHTMLTools(server as any);
      registerURLTools(server as any);
      registerRemoteDOMTools(server as any);
      registerMetadataTools(server as any);
      registerAsyncTools(server as any);
      
      server.tools.forEach((tool: any) => {
        expect(tool.definition.inputSchema).toBeDefined();
      });
    });

    it('tools with required params should specify them in schema', () => {
      const server = new MockMcpServer();
      registerURLTools(server as any);
      
      const tool = server.tools.get('showCustomUrl');
      expect(tool.definition.inputSchema.url).toBeDefined();
    });

    it('processAsyncRequest should have required data and timestamp', () => {
      const server = new MockMcpServer();
      registerAsyncTools(server as any);
      
      const tool = server.tools.get('processAsyncRequest');
      expect(tool.definition.inputSchema.data).toBeDefined();
      expect(tool.definition.inputSchema.timestamp).toBeDefined();
    });
  });

  describe('URI Format Compliance', () => {
    it('all UI resources should have ui:// URI scheme', async () => {
      const server = new MockMcpServer();
      registerHTMLTools(server as any);
      registerURLTools(server as any);
      registerRemoteDOMTools(server as any);
      registerMetadataTools(server as any);
      registerAsyncTools(server as any);
      
      const toolNames = [
        'showSimpleHtml',
        'showRawHtml',
        'showInteractiveForm',
        'showComplexLayout',
        'showExampleSite',
        'showCustomUrl',
        'showApiDocs',
        'showRemoteDomButton',
        'showRemoteDomForm',
        'showWithPreferredSize',
        'showWithRenderData',
        'showAsyncToolCall',
      ];
      
      for (const toolName of toolNames) {
        const tool = server.tools.get(toolName);
        const params = toolName === 'showCustomUrl' 
          ? { url: 'https://example.com' } 
          : {};
        const result = await tool.handler(params);
        
        const resource = result.content[0];
        expect(resource.resource.uri).toMatch(/^ui:\/\//);
      }
    });
  });
});
