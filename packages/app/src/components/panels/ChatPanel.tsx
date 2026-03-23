'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { useGraphStore } from '../../stores/graphStore';
import { useChatStore, type ChatMessage } from '../../stores/chatStore';
import { streamSSE, type SSEEvent } from '../../hooks/useSSE';
import { useSuggestionStore, type SuggestionDiff } from '../../stores/suggestionStore';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

function SuggestionActions({
  suggestion,
  onPreview,
  onDismiss,
}: {
  suggestion: Record<string, unknown>;
  onPreview: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        marginTop: 8,
        padding: 8,
        background: '#16162A',
        borderRadius: 6,
        border: '1px solid #2D2D3F',
      }}
    >
      <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6, fontWeight: 600 }}>
        Suggestion: {(suggestion as any).description ?? 'Alternative design'}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onPreview}
          style={{
            padding: '4px 10px',
            background: '#3B82F6',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Preview on canvas
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: '4px 10px',
            background: '#2D2D3F',
            color: '#94A3B8',
            border: 'none',
            borderRadius: 4,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const setSuggestion = useSuggestionStore((s) => s.setSuggestion);

  const suggestion = message.toolResults?.find(
    (r) => r.tool === 'suggest_alternative',
  );

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '8px 12px',
          borderRadius: 12,
          background: isUser ? '#3B82F6' : '#2D2D3F',
          color: '#E2E8F0',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <Markdown
          components={{
            p: ({ children }) => <p style={{ margin: '4px 0' }}>{children}</p>,
            code: ({ children }) => (
              <code
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '1px 4px',
                  borderRadius: 3,
                  fontSize: 12,
                }}
              >
                {children}
              </code>
            ),
          }}
        >
          {message.content}
        </Markdown>
        {suggestion && (
          <SuggestionActions
            suggestion={suggestion.input}
            onPreview={() => {
              setSuggestion(suggestion.input as unknown as SuggestionDiff);
            }}
            onDismiss={() => {
              // No-op for individual message dismiss
            }}
          />
        )}
      </div>
    </div>
  );
}

function StreamingBubble({ content }: { content: string }) {
  if (!content) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 12,
            background: '#2D2D3F',
            color: '#64748B',
            fontSize: 13,
          }}
        >
          Thinking...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
      <div
        style={{
          maxWidth: '85%',
          padding: '8px 12px',
          borderRadius: 12,
          background: '#2D2D3F',
          color: '#E2E8F0',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
}

export function ChatPanel() {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const startAssistantMessage = useChatStore((s) => s.startAssistantMessage);
  const appendStreamContent = useChatStore((s) => s.appendStreamContent);
  const finishAssistantMessage = useChatStore((s) => s.finishAssistantMessage);
  const setStreamError = useChatStore((s) => s.setStreamError);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, streamingContent]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setInput('');
    addUserMessage(trimmed);
    startAssistantMessage();

    const { nodes, edges } = useGraphStore.getState();

    // Build history from last 10 messages
    const recentMessages = useChatStore
      .getState()
      .messages.slice(-10)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamSSE(
        `${SERVER_URL}/api/analyze`,
        {
          graph: { nodes, edges },
          message: trimmed,
          history: recentMessages,
        },
        (event: SSEEvent) => {
          if (event.type === 'text') {
            appendStreamContent(event.content ?? '');
          }
          if (event.type === 'done') {
            finishAssistantMessage(event.tool_results);
          }
          if (event.type === 'error') {
            setStreamError(event.content ?? 'Unknown error');
          }
        },
        controller.signal,
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStreamError(err.message ?? 'Connection failed');
      }
    }
  }, [
    input,
    isStreaming,
    addUserMessage,
    startAssistantMessage,
    appendStreamContent,
    finishAssistantMessage,
    setStreamError,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
        }}
      >
        {messages.length === 0 && !isStreaming && (
          <div style={{ textAlign: 'center', color: '#64748B', fontSize: 13, padding: 20 }}>
            Ask questions about your agent design
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && <StreamingBubble content={streamingContent} />}
      </div>

      {/* Input */}
      <div
        style={{
          padding: 12,
          borderTop: '1px solid #2D2D3F',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your design..."
            disabled={isStreaming}
            style={{
              flex: 1,
              padding: '8px 10px',
              background: '#16162A',
              border: '1px solid #2D2D3F',
              borderRadius: 8,
              color: '#E2E8F0',
              fontSize: 13,
              resize: 'none',
              outline: 'none',
              minHeight: 36,
              maxHeight: 100,
              fontFamily: 'inherit',
            }}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            style={{
              padding: '8px 14px',
              background: isStreaming || !input.trim() ? '#2D2D3F' : '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              cursor: isStreaming || !input.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              alignSelf: 'flex-end',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
