import { accumulateAssistantFromSseChunk, type AssistantSseState } from './assistant-sse';

const createState = (): AssistantSseState => ({
  lineBuf: '',
  content: '',
  reasoning: '',
  reasoningCursor: ''
});

const feed = (provider: 'dashscope' | 'openai_compatible', lines: unknown[]) => {
  const state = createState();
  const chunk = lines.map((item) => (typeof item === 'string' ? item : `data: ${JSON.stringify(item)}\n`)).join('');
  accumulateAssistantFromSseChunk(provider, state, chunk);
  if (state.lineBuf.trim()) {
    accumulateAssistantFromSseChunk(provider, state, '\n');
  }
  return state;
};

describe('assistant sse accumulation', () => {
  it('keeps plain content deltas unchanged for models without reasoning', () => {
    const state = feed('openai_compatible', [
      { choices: [{ delta: { content: '你' } }] },
      { choices: [{ delta: { content: '好' } }] },
      'data: [DONE]\n'
    ]);

    expect(state.content).toBe('你好');
    expect(state.reasoning).toBe('');
  });

  it('stores reasoning separately and keeps the full answer', () => {
    const state = feed('openai_compatible', [
      { choices: [{ delta: { content: null, reasoning_content: '先' } }] },
      { choices: [{ delta: { content: null, reasoning_content: '想清楚' } }] },
      { choices: [{ delta: { content: '答案', reasoning_content: null } }] },
      { choices: [{ delta: { content: '在这里' } }] }
    ]);

    expect(state.reasoning).toBe('先想清楚');
    expect(state.content).toBe('答案在这里');
    expect(state.content).not.toContain('想');
  });

  it('reads OpenAI-compatible delta.reasoning when reasoning_content is absent', () => {
    const state = feed('openai_compatible', [
      { choices: [{ delta: { reasoning: '推', content: '' } }] },
      { choices: [{ delta: { reasoning: '理', content: '正文' } }] }
    ]);

    expect(state.reasoning).toBe('推理');
    expect(state.content).toBe('正文');
  });

  it('keeps qwen compatible-mode reasoning out of the answer', () => {
    const state = feed('dashscope', [
      { choices: [{ delta: { content: null, reasoning_content: '想' } }] },
      { choices: [{ delta: { reasoning_content: '', content: '回答' } }] }
    ]);

    expect(state.reasoning).toBe('想');
    expect(state.content).toBe('回答');
  });

  it('prefers reasoning_content over reasoning in the same delta', () => {
    const state = feed('openai_compatible', [
      { choices: [{ delta: { reasoning_content: '思考', reasoning: '不要重复' } }] }
    ]);

    expect(state.reasoning).toBe('思考');
  });

  it('accepts a later reasoning snapshot without duplicating streamed thinking', () => {
    const state = feed('openai_compatible', [
      { choices: [{ delta: { reasoning_content: '先想' } }] },
      { choices: [{ message: { reasoning_content: '先想清楚' }, delta: { content: '好' } }] }
    ]);

    expect(state.reasoning).toBe('先想清楚');
    expect(state.content).toBe('好');
  });

  it('appends native reasoning pieces and does not mix them into content', () => {
    const state = feed('dashscope', [
      { output: { text: '', choices: [{ message: { reasoning_content: '通义' } }] } },
      { output: { text: '', choices: [{ message: { reasoning_content: '思考' } }] } },
      { output: { text: '正文' } }
    ]);

    expect(state.reasoning).toBe('通义思考');
    expect(state.content).toBe('正文');
  });

  it('treats a growing dashscope reasoning snapshot as the full thought so far', () => {
    const state = feed('dashscope', [
      { output: { reasoning_content: '思考', text: '' } },
      { output: { reasoning_content: '思考过程', text: '最终回答' } }
    ]);

    expect(state.reasoning).toBe('思考过程');
    expect(state.content).toBe('最终回答');
  });

  it('replaces assistant text with dashscope output.text', () => {
    const grown = feed('dashscope', [{ output: { text: '你' } }, { output: { text: '你好' } }]);
    expect(grown.content).toBe('你好');
    expect(grown.reasoning).toBe('');

    const replaced = feed('dashscope', [{ output: { text: '你好世界' } }, { output: { text: '嗨' } }]);
    expect(replaced.content).toBe('嗨');
  });

  it('does not let dashscope output.text affect openai-compatible content', () => {
    const withDelta = feed('openai_compatible', [
      { output: { text: '不应写入' }, choices: [{ delta: { content: '正文' } }] }
    ]);
    expect(withDelta.content).toBe('正文');

    const outputOnly = feed('openai_compatible', [{ output: { text: '不应写入' } }]);
    expect(outputOnly.content).toBe('');
  });

  it('joins a JSON line split across chunks', () => {
    const state = createState();
    const raw = `data: ${JSON.stringify({ choices: [{ delta: { content: '你好', reasoning_content: '想' } }] })}\n`;
    const mid = Math.floor(raw.length / 2);
    accumulateAssistantFromSseChunk('openai_compatible', state, raw.slice(0, mid));
    expect(state.content).toBe('');
    accumulateAssistantFromSseChunk('openai_compatible', state, raw.slice(mid));
    expect(state.content).toBe('你好');
    expect(state.reasoning).toBe('想');
  });

  it('ignores a trailing partial line until it is flushed', () => {
    const state = createState();
    accumulateAssistantFromSseChunk(
      'openai_compatible',
      state,
      `data: ${JSON.stringify({ choices: [{ delta: { content: '完整' } }] })}\ndata: {"choices":[{"delta":{"content":"半`
    );
    expect(state.content).toBe('完整');
    accumulateAssistantFromSseChunk('openai_compatible', state, '行"}}]}\n');
    expect(state.content).toBe('完整半行');
    expect(state.reasoning).toBe('');
  });
});
