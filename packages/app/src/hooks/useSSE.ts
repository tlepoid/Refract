'use client';

export interface SSEEvent {
  type: 'text' | 'tool_input' | 'done' | 'error';
  content?: string;
  tool_results?: { tool: string; input: Record<string, unknown> }[];
  patterns?: { patternId: string; confidence: number }[];
  scores?: Record<string, unknown>;
}

export async function streamSSE(
  url: string,
  body: Record<string, unknown>,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const json = trimmed.slice(6);
      try {
        const event: SSEEvent = JSON.parse(json);
        onEvent(event);
      } catch {
        // skip malformed events
      }
    }
  }
}
