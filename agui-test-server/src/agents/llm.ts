/**
 * LLM Agent - Integrates with LiteLLM or DeepSeek
 */

import { BaseAgent } from './base.js';
import type {
  RunAgentInput,
  BaseEvent,
  Message,
  AssistantMessage,
  ToolMessage,
  RunStartedEvent,
  RunFinishedEvent,
  RunErrorEvent,
  TextMessageChunkEvent,
  TextMessageStartEvent,
  TextMessageEndEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  CustomEvent,
} from '@ag-ui/core';
import { EventType } from '@ag-ui/core';
import { fetch } from 'undici';
import type { Response } from 'undici';
import { logger } from '../utils/logger.js';
import { mcpClientManager } from '../mcp/client.js';

interface LLMConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  mcpServerId?: string;
}

interface ToolConversionResult {
  tools: any[];
  sanitizedToOriginal: Map<string, string>;
  originalToSanitized: Map<string, string>;
}

interface ChatMessage {
  role: string;
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

interface ChatCompletionChunk {
  choices: Array<{
    delta: {
      content?: string;
      tool_calls?: Array<{
        id?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string;
  }>;
}

const SYSTEM_PROMPT = 'You are a helpful assistant.';

export class LLMAgent extends BaseAgent {
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly timeoutMs: number;

  constructor(private config: LLMConfig) {
    super();
    this.maxRetries = config.maxRetries ?? 2;
    this.retryDelayMs = config.retryDelayMs ?? 1000;
    this.timeoutMs = config.timeoutMs ?? 30000;
  }

  /**
   * Fetch with retry logic and timeout
   */
  private async fetchWithRetry(
    url: string,
    options: any
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.maxRetries) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt);
          logger.warn(
            {
              attempt: attempt + 1,
              maxRetries: this.maxRetries,
              delayMs,
              error: lastError.message,
            },
            'Fetch failed, retrying with exponential backoff'
          );
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new Error('Fetch failed after retries');
  }

  async *run(input: RunAgentInput): AsyncGenerator<BaseEvent> {
    const { threadId, runId, messages, tools, context } = input;

    logger.info(
      { 
        threadId, 
        runId, 
        model: this.config.model,
        messageCount: messages.length,
        toolCount: tools?.length || 0,
      },
      'Running LLM agent'
    );

    // Start run
    const started: RunStartedEvent = {
      type: EventType.RUN_STARTED,
      threadId,
      runId,
    };
    yield started;

    try {
      // Fetch available tools from MCP server if configured
      let mcpTools: any[] = [];
      if (this.config.mcpServerId && mcpClientManager.isConnected(this.config.mcpServerId)) {
        try {
          logger.info(
            { threadId, runId, mcpServerId: this.config.mcpServerId },
            'Fetching available tools from MCP server'
          );
          
          const toolsList = await mcpClientManager.listTools(this.config.mcpServerId);
          mcpTools = toolsList.map(tool => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description || `Tool: ${tool.name}`,
              parameters: tool.inputSchema || {},
            },
          }));
          
          logger.info(
            {
              threadId,
              runId,
              toolCount: mcpTools.length,
              toolNames: toolsList.map(t => t.name),
            },
            'Retrieved tools from MCP server'
          );
        } catch (error) {
          logger.warn(
            {
              threadId,
              runId,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            'Failed to fetch tools from MCP server, continuing without tools'
          );
        }
      }
      
      // Use tools from request if provided, otherwise use MCP tools
      const toolsToUse = tools && tools.length > 0 ? tools : [];
      const llmTools = toolsToUse.length > 0
        ? toolsToUse.map(tool => ({
            type: 'function' as const,
            function: {
              name: tool.name,
              description: tool.description || `Tool: ${tool.name}`,
              parameters: tool.parameters || {},
            },
          }))
        : mcpTools;
      
      // Log available tools
      if (llmTools.length > 0) {
        logger.info(
          {
            threadId,
            runId,
            toolCount: llmTools.length,
            toolNames: llmTools.map(t => t.function.name),
            source: toolsToUse.length > 0 ? 'request' : 'mcp',
          },
          'Tools available for LLM'
        );
      } else {
        logger.warn(
          { threadId, runId },
          'No tools available - LLM will not be able to make tool calls'
        );
      }

      // Build full chat message sequence including system prompt and context summary
      const chatMessages = this.buildChatMessages(
        messages,
        undefined // No tool name sanitization needed
      );
      logger.debug(
        { threadId, runId, messageCount: chatMessages.length },
        'Converted messages to OpenAI format'
      );

      // Call LLM API with tools
      const requestBody: any = {
        model: this.config.model,
        messages: chatMessages,
        stream: true,
        temperature: this.config.temperature ?? 0.7,
      };
      
      // Add tools to request if available
      if (llmTools.length > 0) {
        requestBody.tools = llmTools;
        logger.info(
          {
            threadId,
            runId,
            toolCount: llmTools.length,
          },
          'Including tools in LLM API request'
        );
      }

      this.logPrompt(
        threadId,
        runId,
        chatMessages,
        context,
        llmTools.length > 0 ? {
          tools: llmTools,
          sanitizedToOriginal: new Map(),
          originalToSanitized: new Map(),
        } : undefined
      );

      logger.debug(
        {
          threadId,
          runId,
          endpoint: this.config.endpoint,
          requestBody: JSON.stringify(requestBody),
          maxRetries: this.maxRetries,
          timeoutMs: this.timeoutMs,
        },
        'Sending request to LLM API'
      );

      const response = await this.fetchWithRetry(
        `${this.config.endpoint}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unable to read error body');
        logger.error(
          {
            threadId,
            runId,
            status: response.status,
            statusText: response.statusText,
            errorBody,
            requestBody: JSON.stringify(requestBody),
          },
          'LLM API returned error response'
        );
        throw new Error(
          `LLM API error: ${response.status} ${response.statusText}. Body: ${errorBody}`
        );
      }

      logger.info(
        { 
          threadId, 
          runId,
          status: response.status,
          contentType: response.headers.get('content-type'),
        },
        'Received successful response from LLM API, starting to parse stream'
      );

      // Stream the response
      const messageId = this.generateMessageId();
      let currentToolCall: { id: string; name: string; args: string } | null = null;
      let textMessageStarted = false;
      let accumulatedText = '';
      let chunkCount = 0;
      const toolCalls: Array<{ id: string; name: string; args: string }> = [];

      for await (const chunk of this.parseSSEStream(response.body!)) {
        chunkCount++;
        
        if (!chunk.choices?.[0]?.delta) {
          const finishReason = chunk.choices?.[0]?.finish_reason;
          if (finishReason) {
            logger.debug(
              { threadId, runId, chunkCount, finishReason },
              'LLM response finished'
            );
          }
          continue;
        }

        // Log raw chunk only if it has meaningful content (for debugging)
        const delta = chunk.choices[0].delta;
        const finishReason = chunk.choices[0].finish_reason;
        
        if (delta.content || delta.tool_calls) {
          logger.debug(
            {
              threadId,
              runId,
              chunkCount,
              hasContent: !!delta.content,
              hasToolCalls: !!delta.tool_calls,
              contentPreview: delta.content?.substring(0, 50),
              toolCallPreview: delta.tool_calls?.[0]?.function?.name,
            },
            'LLM response chunk with content'
          );
        }

        // Handle text content
        if (delta.content) {
          accumulatedText += delta.content;
          logger.debug(
            {
              threadId,
              runId,
              chunkCount,
              contentDelta: delta.content,
              accumulatedLength: accumulatedText.length,
            },
            'LLM text content chunk'
          );
          // Send TEXT_MESSAGE_START before first chunk
          if (!textMessageStarted) {
            const startEvt: TextMessageStartEvent = {
              type: EventType.TEXT_MESSAGE_START,
              messageId,
              role: 'assistant',
            };
            yield startEvt;
            textMessageStarted = true;
          }

          const chunkEvt: TextMessageChunkEvent = {
            type: EventType.TEXT_MESSAGE_CHUNK,
            messageId,
            delta: delta.content,
          };
          yield chunkEvt;
        }

        // Handle tool calls
        if (delta.tool_calls?.[0]) {
          const toolCall = delta.tool_calls[0];

          if (toolCall.id) {
            logger.info(
              {
                threadId,
                runId,
                chunkCount,
                toolCallId: toolCall.id,
                toolName: toolCall.function?.name,
              },
              'LLM tool call detected'
            );

            // Start new tool call
            if (currentToolCall) {
              // End previous tool call
              toolCalls.push({ ...currentToolCall });
              const endPrev: ToolCallEndEvent = {
                type: EventType.TOOL_CALL_END,
                toolCallId: currentToolCall.id,
              };
              yield endPrev;
            }

            const sanitizedName = toolCall.function?.name || '';
            // In demo mode, no tool name sanitization
            const originalName = sanitizedName;

            currentToolCall = {
              id: toolCall.id,
              name: originalName,
              args: '',
            };

            const startCall: ToolCallStartEvent = {
              type: EventType.TOOL_CALL_START,
              toolCallId: currentToolCall.id,
              toolCallName: currentToolCall.name,
              parentMessageId: messageId,
            };
            yield startCall;
          }

          // Accumulate arguments
          if (toolCall.function?.arguments && currentToolCall) {
            const argsDelta = toolCall.function.arguments;
            currentToolCall.args += argsDelta;
            logger.debug(
              {
                threadId,
                runId,
                chunkCount,
                toolCallId: currentToolCall.id,
                toolName: currentToolCall.name,
                argsDelta,
                accumulatedArgs: currentToolCall.args,
              },
              'LLM tool call arguments chunk'
            );
            const argsEvt: ToolCallArgsEvent = {
              type: EventType.TOOL_CALL_ARGS,
              toolCallId: currentToolCall.id,
              delta: argsDelta,
            };
            yield argsEvt;
          }
        }

        // Log finish reason if present
        if (finishReason) {
          logger.info(
            {
              threadId,
              runId,
              chunkCount,
              finishReason,
              hasText: accumulatedText.length > 0,
              hasToolCalls: toolCalls.length > 0 || currentToolCall !== null,
            },
            'LLM response finished'
          );
        }
      }

      // Log summary of complete response
      if (currentToolCall) {
        toolCalls.push({ ...currentToolCall });
      }

      logger.info(
        {
          threadId,
          runId,
          messageId,
          totalChunks: chunkCount,
          textLength: accumulatedText.length,
          textPreview: accumulatedText.length > 0 
            ? (accumulatedText.length > 200 
                ? accumulatedText.substring(0, 200) + '...' 
                : accumulatedText)
            : undefined,
          toolCallCount: toolCalls.length,
          toolCalls: toolCalls.map(tc => ({
            id: tc.id,
            name: tc.name,
            argsLength: tc.args.length,
            argsPreview: tc.args.length > 100 
              ? tc.args.substring(0, 100) + '...' 
              : tc.args,
          })),
        },
        'LLM response parsing completed'
      );

      // End any pending tool call
      if (currentToolCall) {
        logger.info(
          {
            threadId,
            runId,
            toolCallId: currentToolCall.id,
            toolName: currentToolCall.name,
            finalArgs: currentToolCall.args,
          },
          'Completing final tool call from LLM response'
        );

        const endEvt: ToolCallEndEvent = {
          type: EventType.TOOL_CALL_END,
          toolCallId: currentToolCall.id,
        };
        yield endEvt;

        // Execute MCP tool if configured
        if (this.config.mcpServerId && mcpClientManager.isConnected(this.config.mcpServerId)) {
          try {
            logger.info(
              {
                toolCallId: currentToolCall.id,
                toolName: currentToolCall.name,
                mcpServerId: this.config.mcpServerId,
              },
              'Executing tool via MCP'
            );

            // Parse tool arguments
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = JSON.parse(currentToolCall.args || '{}');
            } catch (parseError) {
              logger.warn(
                {
                  toolCallId: currentToolCall.id,
                  args: currentToolCall.args,
                  error: parseError instanceof Error ? parseError.message : 'Unknown error',
                },
                'Failed to parse tool arguments, using empty object'
              );
            }

            // Call MCP tool
            logger.info(
              {
                threadId,
                runId,
                toolCallId: currentToolCall.id,
                toolName: currentToolCall.name,
                toolArgs: parsedArgs,
                mcpServerId: this.config.mcpServerId,
              },
              'Calling MCP tool with parsed arguments'
            );

            const mcpResult = await mcpClientManager.callTool(
              this.config.mcpServerId,
              currentToolCall.name,
              parsedArgs
            );

            logger.info(
              {
                threadId,
                runId,
                toolCallId: currentToolCall.id,
                toolName: currentToolCall.name,
                resultContentTypes: mcpResult.content?.map((c: any) => c.type) || [],
                resultContentCount: mcpResult.content?.length || 0,
                isError: mcpResult.isError,
                resultPreview: JSON.stringify(mcpResult).substring(0, 500),
              },
              'MCP tool call completed'
            );

            // Generate result message ID
            const resultMessageId = this.generateMessageId();

            // Emit TOOL_CALL_RESULT with text content
            const textContent = mcpResult.content
              ?.filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join('\n') || 'Tool executed successfully';

            const resultEvt: ToolCallResultEvent = {
              type: EventType.TOOL_CALL_RESULT,
              toolCallId: currentToolCall.id,
              messageId: resultMessageId,
              content: textContent,
              role: 'tool',
            };
            yield resultEvt;

            // Emit CUSTOM event for each UI resource
            const uiResources = mcpResult.content?.filter((c: any) => c.type === 'resource') || [];
            for (const resource of uiResources) {
              const customEvt: CustomEvent = {
                type: EventType.CUSTOM,
                name: 'mcp-ui-resource',
                value: resource,
              };
              yield customEvt;

              logger.info(
                {
                  toolCallId: currentToolCall.id,
                  resourceUri: (resource as any).resource?.uri,
                  resourceMimeType: (resource as any).resource?.mimeType,
                },
                'Emitted MCP UI resource as CUSTOM event'
              );
            }
          } catch (mcpError) {
            logger.error(
              {
                toolCallId: currentToolCall.id,
                toolName: currentToolCall.name,
                error: mcpError instanceof Error ? mcpError.message : 'Unknown error',
              },
              'Failed to execute MCP tool'
            );

            // Emit error result
            const errorMessageId = this.generateMessageId();
            const errorResultEvt: ToolCallResultEvent = {
              type: EventType.TOOL_CALL_RESULT,
              toolCallId: currentToolCall.id,
              messageId: errorMessageId,
              content: `Error executing tool: ${mcpError instanceof Error ? mcpError.message : 'Unknown error'}`,
              role: 'tool',
            };
            yield errorResultEvt;
          }
        }
      }

      // Send TEXT_MESSAGE_END if we started a text message
      if (textMessageStarted) {
        logger.info(
          {
            threadId,
            runId,
            messageId,
            textLength: accumulatedText.length,
            completeText: accumulatedText,
          },
          'LLM text message completed'
        );

        const endEvt: TextMessageEndEvent = {
          type: EventType.TEXT_MESSAGE_END,
          messageId,
        };
        yield endEvt;
      }

      // Finish run
      logger.info(
        {
          threadId,
          runId,
          totalChunks: chunkCount,
          textMessageLength: accumulatedText.length,
          toolCallCount: toolCalls.length,
        },
        'LLM agent run completed successfully'
      );

      const finished: RunFinishedEvent = {
        type: EventType.RUN_FINISHED,
        threadId,
        runId,
      };
      yield finished;
    } catch (error) {
      // Enhanced error logging with full details
      const errorDetails: any = {
        threadId,
        runId,
        messageCount: messages.length,
        toolCount: tools?.length || 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'UnknownError',
      };

      // Add stack trace if available
      if (error instanceof Error && error.stack) {
        errorDetails.stack = error.stack;
      }

      // Add input details for debugging
      if (tools && tools.length > 0) {
        errorDetails.tools = tools.map(t => ({
          name: t.name,
          description: t.description,
        }));
      }

      // Log the full error for debugging
      logger.error(errorDetails, 'LLM agent error - detailed information');

      const errorEvt: RunErrorEvent = {
        type: EventType.RUN_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      yield errorEvt;
    }
  }

  private convertMessages(
    messages: Message[],
    nameMap?: Map<string, string>
  ): ChatMessage[] {
    const mapRole = (role: string): string => {
      switch (role) {
        case 'agent':
          return 'assistant';
        case 'client':
          return 'user';
        default:
          return role;
      }
    };

    const isSupportedRole = (role: string): boolean =>
      role === 'system' || role === 'user' || role === 'assistant' || role === 'tool';

    return messages.map((msg, index) => {
      try {
        const content =
          'content' in msg && typeof (msg as any).content === 'string'
            ? ((msg as any).content as string)
            : '';

        const mappedRole = mapRole(msg.role);
        if (!isSupportedRole(mappedRole)) {
          logger.warn(
            { messageIndex: index, originalRole: msg.role, mappedRole },
            'Unsupported role detected when converting message; defaulting to "user"'
          );
        }

        const chatMessage: ChatMessage = {
          role: isSupportedRole(mappedRole) ? mappedRole : 'user',
          content,
        };

        if (msg.role === 'assistant') {
          const assistantMsg = msg as AssistantMessage;
          if (assistantMsg.toolCalls) {
            chatMessage.tool_calls = assistantMsg.toolCalls.map((toolCall) => {
              const originalName = toolCall.function.name;
              const sanitizedName = nameMap?.get(originalName) ?? originalName;
              return {
                id: toolCall.id,
                type: 'function',
                function: {
                  name: sanitizedName,
                  arguments: toolCall.function.arguments ?? '',
                },
              };
            });
          }
        }

        if (msg.role === 'tool') {
          const toolMsg = msg as ToolMessage;
          if (toolMsg.toolCallId) {
            chatMessage.tool_call_id = toolMsg.toolCallId;
          }
        }

        return chatMessage;
      } catch (error) {
        logger.error(
          {
            messageIndex: index,
            messageRole: msg.role,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Error converting message to OpenAI format'
        );
        throw error;
      }
    });
  }

  private buildChatMessages(
    messages: Message[],
    nameMap?: Map<string, string>
  ): ChatMessage[] {
    const sequence: ChatMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
    ];

    /*
    if (contextSummary.length > 0) {
      const summaryContent = ['Context summary:', ...contextSummary.map((line) => `- ${line}`)].join('\n');
      sequence.push({
        role: 'user',
        content: summaryContent,
      });
    }
    */
   
    const converted = this.convertMessages(messages, nameMap);
    sequence.push(...converted);
    return sequence;
  }

  // Note: Tool conversion methods removed as tools are not passed to LLM in demo mode
  // When needed in the future, implement proper tool handling with MCP integration


  // @ts-ignore - Unused method kept for future use
  private getContextSummaryLines(_context: RunAgentInput['context']): string[] {
    if (!_context || _context.length === 0) {
      return [];
    }

    const previewLimit = 200;
    const lines: string[] = [];

    for (const entry of _context as any[]) {
      const key = entry?.key ?? 'unknown';
      const description = typeof entry?.value?.description === 'string'
        ? entry.value.description as string
        : undefined;

      if (description && description.length > 0) {
        lines.push(description);
        continue;
      }

      if (entry?.value?.data !== undefined) {
        try {
          const serialized = JSON.stringify(entry.value.data);
          const trimmed = serialized.length > previewLimit
            ? `${serialized.slice(0, previewLimit)}…`
            : serialized;
          lines.push(`${key}: ${trimmed}`);
        } catch {
          lines.push(`${key}: [unserializable data]`);
        }
        continue;
      }

      lines.push(`Context ${key} provided.`);
    }

    return lines;
  }

  private logPrompt(
    threadId: string,
    runId: string,
    messages: ChatMessage[],
    context: RunAgentInput['context'],
    toolConversion?: ToolConversionResult
  ): void {
    const previewLimit = 200;
    const sanitizedMap = toolConversion?.sanitizedToOriginal;

    const logMessages = messages.map((message) => {
      const content = message.content ?? '';
      const formatted: Record<string, unknown> = {
        role: message.role,
        content:
          content.length > previewLimit
            ? `${content.slice(0, previewLimit)}…`
            : content,
      };

      if (message.tool_calls?.length) {
        formatted.toolCalls = message.tool_calls.map((toolCall) => {
          const sanitizedName = toolCall.function?.name || '';
          const originalName = sanitizedMap?.get(sanitizedName) ?? sanitizedName;
          return {
            id: toolCall.id,
            name: originalName,
            sanitizedName,
            hasArguments: Boolean(toolCall.function?.arguments),
          };
        });
      }

      if (message.tool_call_id) {
        formatted.toolCallId = message.tool_call_id;
      }

      return formatted;
    });

    const contextLog = context?.map((ctx) => {
      const description =
        typeof (ctx as any).value?.description === 'string'
          ? (ctx as any).value.description
          : undefined;
      const data = (ctx as any).value?.data;
      let dataPreview: string | undefined;
      if (data !== undefined) {
        try {
          const serialized = JSON.stringify(data);
          dataPreview =
            serialized.length > previewLimit
              ? `${serialized.slice(0, previewLimit)}…`
              : serialized;
        } catch (error) {
          dataPreview = '[unserializable]';
        }
      }

      return {
        key: (ctx as any).key,
        hasDescription: Boolean(description),
        description:
          description && description.length > previewLimit
            ? `${description.slice(0, previewLimit)}…`
            : description,
        hasData: data !== undefined,
        dataPreview,
      };
    });

    const toolsLog = toolConversion?.tools.map((tool) => {
      const sanitizedName = tool.function?.name || '';
      const originalName = sanitizedMap?.get(sanitizedName) ?? sanitizedName;
      return {
        name: originalName,
        sanitizedName,
        description: tool.function?.description,
      };
    });

    logger.info(
      {
        threadId,
        runId,
        messages: logMessages,
        context: contextLog,
        tools: toolsLog,
      },
      'Prepared LLM request payload'
    );
  }

  private async *parseSSEStream(
    body: ReadableStream<Uint8Array>
  ): AsyncGenerator<ChatCompletionChunk> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          logger.debug({ chunkCount }, 'Finished parsing SSE stream');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              logger.debug('Received [DONE] marker from SSE stream');
              continue;
            }

            try {
              const chunk = JSON.parse(data);
              chunkCount++;
              yield chunk;
            } catch (error) {
              logger.warn(
                {
                  line,
                  error: error instanceof Error ? error.message : 'Unknown error',
                },
                'Failed to parse SSE chunk'
              );
            }
          }
        }
      }
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          chunkCount,
        },
        'Error while parsing SSE stream'
      );
      throw error;
    } finally {
      reader.releaseLock();
    }
  }
}
