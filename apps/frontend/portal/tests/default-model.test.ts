import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { resolveEffectiveModelId, unavailableReasons } from '../src/utils/defaultModel.ts';

const readSource = (relativePath: string) =>
  readFileSync(new URL(`../../src/${relativePath}`, import.meta.url), 'utf8');

const models = [
  { id: 'qwen3.7-plus', available: true, unavailableReason: null },
  { id: 'qwen3.8-flash', available: true, unavailableReason: null },
  { id: 'deepseek-flash', available: false, unavailableReason: '未配置 DeepSeek API Key，DeepSeek 模型不可选' }
];

test('已保存且当前可用时，生效值就是个人默认', () => {
  assert.equal(resolveEffectiveModelId('qwen3.8-flash', models, 'qwen3.7-plus'), 'qwen3.8-flash');
});

test('未设置个人默认时，回退到可用的系统默认', () => {
  assert.equal(resolveEffectiveModelId(null, models, 'qwen3.7-plus'), 'qwen3.7-plus');
  assert.equal(resolveEffectiveModelId('  ', models, 'qwen3.7-plus'), 'qwen3.7-plus');
});

test('已保存但当前不可用或不在列表时，回退到系统默认或第一个可用模型', () => {
  assert.equal(resolveEffectiveModelId('deepseek-flash', models, 'qwen3.7-plus'), 'qwen3.7-plus');
  assert.equal(resolveEffectiveModelId('gone-model', models, 'qwen3.7-plus'), 'qwen3.7-plus');
  assert.equal(resolveEffectiveModelId('deepseek-flash', models, 'deepseek-flash'), 'qwen3.7-plus');
});

test('不可用原因去重后供设置和新会话展示', () => {
  assert.deepEqual(unavailableReasons(models), ['未配置 DeepSeek API Key，DeepSeek 模型不可选']);
});

test('设置页提供默认模型，列表来自当前部署的模型接口，并展示实际生效值', () => {
  const source = readSource('views/settings/index.tsx');
  assert.match(source, /默认模型/);
  assert.match(source, /requestChatModels/);
  assert.match(source, /requestUserDefaultModel/);
  assert.match(source, /updateUserDefaultModel/);
  assert.match(source, /resolveEffectiveModelId/);
  assert.match(source, /新会话实际使用/);
  assert.doesNotMatch(source, /DASHSCOPE_API_KEY|LLM_DASHSCOPE_MODELS/);
});

test('新会话选择器以个人默认为准，临时改选不写回设置中的默认', () => {
  const source = readSource('views/chat/components/Window/Model/index.tsx');
  assert.match(source, /requestUserDefaultModel/);
  assert.match(source, /requestChatModels/);
  assert.match(source, /resolveEffectiveModelId/);
  assert.match(source, /pickedByUser/);
  assert.doesNotMatch(source, /updateUserDefaultModel/);
});
