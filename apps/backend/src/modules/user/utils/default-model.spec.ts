import { resolveEffectiveModelId } from './default-model';

const models = [
  { id: 'qwen3.7-plus', available: true },
  { id: 'qwen3.8-flash', available: true },
  { id: 'deepseek-flash', available: false }
];

describe('resolveEffectiveModelId', () => {
  it('已保存且当前可用时使用个人默认', () => {
    expect(resolveEffectiveModelId('qwen3.8-flash', models, 'qwen3.7-plus')).toBe('qwen3.8-flash');
  });

  it('未设置个人默认时回退到可用的系统默认', () => {
    expect(resolveEffectiveModelId(null, models, 'qwen3.7-plus')).toBe('qwen3.7-plus');
    expect(resolveEffectiveModelId('  ', models, 'qwen3.7-plus')).toBe('qwen3.7-plus');
  });

  it('已保存但当前不可用或不在列表时回退到系统默认', () => {
    expect(resolveEffectiveModelId('deepseek-flash', models, 'qwen3.7-plus')).toBe('qwen3.7-plus');
    expect(resolveEffectiveModelId('gone-model', models, 'qwen3.7-plus')).toBe('qwen3.7-plus');
  });

  it('系统默认也不可用时使用第一个可用模型', () => {
    expect(resolveEffectiveModelId('deepseek-flash', models, 'deepseek-flash')).toBe('qwen3.7-plus');
  });

  it('没有任何可用模型时回退到系统默认或已保存值', () => {
    const none = [{ id: 'deepseek-flash', available: false }];
    expect(resolveEffectiveModelId('deepseek-flash', none, 'qwen3.7-plus')).toBe('qwen3.7-plus');
    expect(resolveEffectiveModelId(null, none, '')).toBe('');
  });
});
