# Tools Handling Logic Fix

## Problem Statement

The original code at lines 193-204 had a bug where it couldn't distinguish between:
- **Not providing tools** (should use MCP tools)
- **Explicitly providing empty array** (should disable tools)

## Original Code (Buggy)

```typescript
const toolsToUse = tools && tools.length > 0 ? tools : [];
const llmTools = toolsToUse.length > 0
  ? toolsToUse.map(tool => ({...}))
  : mcpTools;
```

### Truth Table (Original - Buggy)

| Input `tools` | `tools && tools.length > 0` | `toolsToUse` | `toolsToUse.length > 0` | `llmTools` | Expected | Correct? |
|---------------|----------------------------|--------------|------------------------|------------|----------|----------|
| `undefined`   | `false`                    | `[]`         | `false`                | `mcpTools` | `mcpTools` | ✅ |
| `null`        | `false`                    | `[]`         | `false`                | `mcpTools` | `mcpTools` | ✅ |
| `[]`          | `false`                    | `[]`         | `false`                | `mcpTools` | `[]` | ❌ **BUG!** |
| `[tool1]`     | `true`                     | `[tool1]`    | `true`                 | `[tool1]` | `[tool1]` | ✅ |

**Bug**: When client sends `tools: []`, the code incorrectly falls back to `mcpTools` instead of respecting the explicit intent to disable tools.

## Fixed Code

```typescript
const llmTools = tools !== undefined && tools !== null
  ? tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description || `Tool: ${tool.name}`,
        parameters: tool.parameters || {},
      },
    }))
  : mcpTools;
```

### Truth Table (Fixed)

| Input `tools` | `tools !== undefined && tools !== null` | `llmTools` | Expected | Correct? |
|---------------|----------------------------------------|------------|----------|----------|
| `undefined`   | `false`                                | `mcpTools` | `mcpTools` | ✅ |
| `null`        | `false`                                | `mcpTools` | `mcpTools` | ✅ |
| `[]`          | `true`                                 | `[]` (empty map) | `[]` | ✅ |
| `[tool1]`     | `true`                                 | `[tool1]` (mapped) | `[tool1]` | ✅ |

## Use Cases

### Use Case 1: Default Behavior (Use MCP Tools)
**Request**: No `tools` property
```json
{
  "messages": [...],
  "context": []
}
```
**Result**: `llmTools = mcpTools` ✅

### Use Case 2: Explicitly Disable Tools
**Request**: Empty `tools` array
```json
{
  "messages": [...],
  "tools": [],
  "context": []
}
```
**Result**: `llmTools = []` ✅ (Fixed!)

### Use Case 3: Use Specific Tools
**Request**: Provided `tools` array
```json
{
  "messages": [...],
  "tools": [
    {"name": "customTool", "description": "...", "parameters": {...}}
  ],
  "context": []
}
```
**Result**: `llmTools = [customTool]` ✅

## Impact

This fix ensures that clients have full control over tool usage:
- Omitting `tools` → Use default MCP tools
- Sending `tools: []` → Explicitly disable all tools
- Sending `tools: [...]` → Use only specified tools

This is critical for scenarios where clients want to prevent the LLM from making any tool calls (e.g., for pure conversation, or when testing without tool execution).

