import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: { tool: string; input: Record<string, unknown> }[];
}

export interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
}

export interface ChatActions {
  addUserMessage: (content: string) => void;
  startAssistantMessage: () => void;
  appendStreamContent: (text: string) => void;
  finishAssistantMessage: (toolResults?: ChatMessage['toolResults']) => void;
  setStreamError: (error: string) => void;
  clearMessages: () => void;
}

export type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>()((set, get) => ({
  messages: [],
  isStreaming: false,
  streamingContent: '',

  addUserMessage: (content) => {
    set((s) => ({
      messages: [
        ...s.messages,
        { id: crypto.randomUUID(), role: 'user', content },
      ],
    }));
  },

  startAssistantMessage: () => {
    set({ isStreaming: true, streamingContent: '' });
  },

  appendStreamContent: (text) => {
    set((s) => ({ streamingContent: s.streamingContent + text }));
  },

  finishAssistantMessage: (toolResults) => {
    const { streamingContent } = get();
    set((s) => ({
      isStreaming: false,
      streamingContent: '',
      messages: [
        ...s.messages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: streamingContent,
          toolResults,
        },
      ],
    }));
  },

  setStreamError: (error) => {
    set((s) => ({
      isStreaming: false,
      streamingContent: '',
      messages: [
        ...s.messages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${error}`,
        },
      ],
    }));
  },

  clearMessages: () => {
    set({ messages: [], isStreaming: false, streamingContent: '' });
  },
}));
