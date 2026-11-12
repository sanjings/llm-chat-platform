export type AssistantStreamProvider = 'dashscope' | 'openai_compatible';

export type AssistantSseState = {
  lineBuf: string;
  /** 助手正文。思考过程不写入这里。 */
  content: string;
  reasoning: string;
  /** 已接收的思考全文，用来识别后续整段快照里新增的部分 */
  reasoningCursor: string;
};

export type AssistantSsePiece = {
  contentDelta: string;
  /** 通义 output.text：截至当前的整段正文。出现时覆盖 content，而不是再追加。 */
  contentFull?: string;
  reasoningDelta: string;
  /** message / output 上的思考。可能是增量，也可能是整段。 */
  reasoningSnapshot?: string;
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

/**
 * 思考字段两种形态都收：
 * - 比已有内容更长、且以前缀衔接：视为整段快照，只取新增尾巴
 * - 否则视为增量片段，直接接上
 * 更短的前缀快照忽略，避免回答阶段的空字段把已收到的思考清掉。
 */
export const absorbReasoning = (previous: string, incoming: string) => {
  if (!incoming) return { next: previous, delta: '' };
  if (incoming.startsWith(previous)) {
    return { next: incoming, delta: incoming.slice(previous.length) };
  }
  if (previous.startsWith(incoming)) {
    return { next: previous, delta: '' };
  }
  return { next: previous + incoming, delta: incoming };
};

/**
 * 从一条 SSE JSON 里拆出正文和思考。
 * 增量字段：delta.content、delta.reasoning_content（没有则用 delta.reasoning）。
 * 通义旧格式：output.text 是整段正文。思考快照不并进正文。
 */
export const readAssistantSseJson = (
  json: Record<string, unknown>,
  options?: { dashscopeOutput?: boolean }
): AssistantSsePiece => {
  const choice = firstChoice(json);
  const delta = choice?.delta;
  const output = dashscopeOutput(json);
  const contentDelta = nonEmpty(delta?.content);
  const reasoningDelta = nonEmpty(delta?.reasoning_content) || nonEmpty(delta?.reasoning);

  let contentFull: string | undefined;
  if (!contentDelta && options?.dashscopeOutput) {
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

export const appendReasoningPiece = (
  state: Pick<AssistantSseState, 'reasoning' | 'reasoningCursor'>,
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

/** 边收供应商 SSE，边分开累积正文和思考。半行 JSON 留在 lineBuf。 */
export const accumulateAssistantFromSseChunk = (
  provider: AssistantStreamProvider,
  state: AssistantSseState,
  chunk: Buffer | string
) => {
  state.lineBuf += typeof chunk === 'string' ? chunk : chunk.toString();
  const lines = state.lineBuf.split('\n');
  state.lineBuf = lines.pop() ?? '';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('data:')) continue;
    const jsonStr = line.replace(/^data:\s*/, '').trim();
    if (!jsonStr || jsonStr === '[DONE]') continue;
    try {
      const piece = readAssistantSseJson(JSON.parse(jsonStr) as Record<string, unknown>, {
        dashscopeOutput: provider === 'dashscope'
      });
      if (piece.contentFull !== undefined) state.content = piece.contentFull;
      else state.content += piece.contentDelta;
      appendReasoningPiece(state, piece);
    } catch {
      // 半行 JSON，忽略
    }
  }
};
