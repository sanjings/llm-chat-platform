/**
 * 解析后端转发的 SSE。
 * 与后端 assistant-sse 同一规则：
 * - choices[0].delta.content：正文增量
 * - choices[0].delta.reasoning_content，没有则用 delta.reasoning：思考增量
 * - 通义 output.text：正文整段，只把变长的部分交给界面
 * - 思考快照不并进正文
 */
export type StreamTextDelta = {
  content: string;
  reasoning: string;
};

type AssistantSsePiece = {
  contentDelta: string;
  contentFull?: string;
  reasoningDelta: string;
  reasoningSnapshot?: string;
};

type ReasoningCursor = {
  reasoning: string;
  reasoningCursor: string;
};

const nonEmpty = (value: unknown) => (typeof value === 'string' && value ? value : '');

const asText = (value: unknown) => (typeof value === 'string' ? value : undefined);

type StreamChoice = {
  delta?: Record<string, unknown>;
  message?: Record<string, unknown>;
};

type DashscopeOutput = {
  text?: unknown;
  reasoning_content?: unknown;
  choices?: { message?: { reasoning_content?: unknown } }[];
};

const firstChoice = (json: Record<string, unknown>): StreamChoice | undefined => {
  if (!Array.isArray(json.choices)) return undefined;
  const choice = json.choices[0];
  if (!choice || typeof choice !== 'object') return undefined;
  return choice as StreamChoice;
};

const dashscopeOutput = (json: Record<string, unknown>): DashscopeOutput | undefined => {
  if (!json.output || typeof json.output !== 'object') return undefined;
  return json.output as DashscopeOutput;
};

const absorbReasoning = (previous: string, incoming: string) => {
  if (!incoming) return { next: previous, delta: '' };
  if (incoming.startsWith(previous)) {
    return { next: incoming, delta: incoming.slice(previous.length) };
  }
  if (previous.startsWith(incoming)) {
    return { next: previous, delta: '' };
  }
  return { next: previous + incoming, delta: incoming };
};

const readAssistantSseJson = (json: Record<string, unknown>): AssistantSsePiece => {
  const choice = firstChoice(json);
  const delta = choice?.delta;
  const output = dashscopeOutput(json);
  const contentDelta = nonEmpty(delta?.content);
  const reasoningDelta = nonEmpty(delta?.reasoning_content) || nonEmpty(delta?.reasoning);

  let contentFull: string | undefined;
  if (!contentDelta) {
    const full = asText(output?.text);
    if (full !== undefined) contentFull = full;
  }

  let reasoningSnapshot: string | undefined;
  if (!reasoningDelta) {
    const snapshot =
      asText(choice?.message?.reasoning_content) ||
      asText(output?.choices?.[0]?.message?.reasoning_content) ||
      asText(output?.reasoning_content);
    if (snapshot) reasoningSnapshot = snapshot;
  }

  return {
    contentDelta,
    ...(contentFull !== undefined ? { contentFull } : {}),
    reasoningDelta,
    ...(reasoningSnapshot ? { reasoningSnapshot } : {})
  };
};

const appendReasoningPiece = (
  state: ReasoningCursor,
  piece: Pick<AssistantSsePiece, 'reasoningDelta' | 'reasoningSnapshot'>
) => {
  if (piece.reasoningDelta) {
    state.reasoning += piece.reasoningDelta;
    state.reasoningCursor += piece.reasoningDelta;
    return;
  }
  if (!piece.reasoningSnapshot) return;
  const absorbed = absorbReasoning(state.reasoningCursor, piece.reasoningSnapshot);
  state.reasoning += absorbed.delta;
  state.reasoningCursor = absorbed.next;
};

export async function readStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: (delta: StreamTextDelta) => void
) {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  /** DashScope output.text 已见到的整段正文 */
  let dashscopeContent = '';
  const reasoningState: ReasoningCursor = { reasoning: '', reasoningCursor: '' };

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
        const piece = readAssistantSseJson(JSON.parse(jsonStr) as Record<string, unknown>);
        let content = '';
        if (piece.contentFull !== undefined) {
          if (piece.contentFull.length > dashscopeContent.length) {
            content = piece.contentFull.slice(dashscopeContent.length);
            dashscopeContent = piece.contentFull;
          }
        } else {
          content = piece.contentDelta;
        }
        const reasoningBefore = reasoningState.reasoning.length;
        appendReasoningPiece(reasoningState, piece);
        const reasoning = reasoningState.reasoning.slice(reasoningBefore);
        if (content || reasoning) onDelta({ content, reasoning });
      } catch {
        // 半行 JSON
      }
    }
  }
}
