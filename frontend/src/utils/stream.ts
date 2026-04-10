/**
 * 解析后端转发的 SSE（与 ChatController 里两家供应商的原始格式一致）
 */
export async function readStream(reader: ReadableStreamDefaultReader<Uint8Array>, onChunk: (text: string) => void) {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  /** DashScope：output.text 是整段累积；OpenAI 兼容：choices[0].delta.content 是增量 */
  let dashscopeLastFull = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('event:') || trimmedLine.startsWith('id:')) {
        continue;
      }

      if (!trimmedLine.startsWith('data:')) continue;

      const jsonStr = trimmedLine.replace(/^data:\s*/, '').trim();
      if (jsonStr === '[DONE]') continue;

      try {
        const json = JSON.parse(jsonStr) as Record<string, unknown>;

        const openaiDelta = (json as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
        if (typeof openaiDelta === 'string' && openaiDelta) {
          onChunk(openaiDelta);
          continue;
        }

        const currentFullText = (json as { output?: { text?: string } }).output?.text || '';
        if (currentFullText.length > dashscopeLastFull.length) {
          onChunk(currentFullText.slice(dashscopeLastFull.length));
          dashscopeLastFull = currentFullText;
        }
      } catch {
        // 半行 JSON
      }
    }
  }
}
