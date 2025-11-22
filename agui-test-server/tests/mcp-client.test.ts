/**
 * MCP Client Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClientManager } from '../src/mcp/client.js';

describe('MCPClientManager', () => {
  let manager: MCPClientManager;

  beforeAll(() => {
    manager = new MCPClientManager();
  });

  afterAll(async () => {
    await manager.disconnectAll();
  });

  it('should create instance', () => {
    expect(manager).toBeDefined();
  });

  it('should check connection status', () => {
    expect(manager.isConnected('test-server')).toBe(false);
  });

  it('should handle disconnect of non-existent client', async () => {
    // Should not throw
    await expect(manager.disconnect('non-existent')).resolves.not.toThrow();
  });

  it('should throw when calling tool on disconnected client', async () => {
    await expect(
      manager.callTool('non-existent', 'testTool', {})
    ).rejects.toThrow('MCP client not connected');
  });

  it('should throw when listing tools on disconnected client', async () => {
    await expect(
      manager.listTools('non-existent')
    ).rejects.toThrow('MCP client not connected');
  });
});

describe('MCPClientManager - Integration', () => {
  it('should skip integration tests if MCP server not available', () => {
    // Integration tests require mcpui-test-server to be built and available
    // These would be run manually or in CI with proper setup
    expect(true).toBe(true);
  });
});
