export interface SSEDelta {
  content?: string;
}

export interface SSEChunk {
  choices?: Array<{ delta?: SSEDelta; index?: number }>;
}

/**
 * 解析 OpenAI 格式的 SSE 流，逐块提取 delta.content
 */
export async function* parseSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed: SSEChunk = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // 忽略解析错误
        }
      }
    }
  }
}
