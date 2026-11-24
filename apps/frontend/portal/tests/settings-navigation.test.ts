import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  createSettingsEntryState,
  resolveSettingsReturnPath,
  SETTINGS_EMPTY_DESCRIPTION,
  SETTINGS_PATH
} from '../src/views/settings/settingsNavigation.ts';

const readSource = (relativePath: string) =>
  readFileSync(new URL(`../../src/${relativePath}`, import.meta.url), 'utf8');

test('设置入口记录当前对话路由，返回时保留 sessionId', () => {
  assert.equal(SETTINGS_PATH, '/settings');
  assert.deepEqual(createSettingsEntryState('/chat/session-1'), { from: '/chat/session-1' });
  assert.equal(resolveSettingsReturnPath(createSettingsEntryState('/chat/session-1')), '/chat/session-1');
  assert.equal(resolveSettingsReturnPath(createSettingsEntryState('/chat')), '/chat');
});

test('刷新或直接访问后没有来源状态，返回新对话页而不是外部地址', () => {
  assert.equal(resolveSettingsReturnPath(undefined), '/chat');
  assert.equal(resolveSettingsReturnPath(null), '/chat');
  assert.equal(resolveSettingsReturnPath({}), '/chat');
  assert.equal(resolveSettingsReturnPath({ from: '/settings' }), '/chat');
  assert.equal(resolveSettingsReturnPath({ from: 'https://example.com' }), '/chat');
  assert.equal(resolveSettingsReturnPath({ from: '/chat/a/b' }), '/chat');
  assert.equal(resolveSettingsReturnPath({ from: '/login' }), '/chat');
});

test('设置页提供明确的空状态文案', () => {
  assert.match(SETTINGS_EMPTY_DESCRIPTION, /暂无可配置项/);
  assert.match(readSource('views/settings/index.tsx'), /description=\{SETTINGS_EMPTY_DESCRIPTION\}/);
});

test('用户菜单不再弹出 TO DO，并导航到设置路由', () => {
  const source = readSource('views/chat/components/User/index.tsx');
  assert.doesNotMatch(source, /TO DO/);
  assert.match(source, /navigate\(SETTINGS_PATH, \{ state: createSettingsEntryState\(location\.pathname\) \}\)/);
});

test('设置路由挂在现有登录鉴权 layout 下，可直接刷新访问', () => {
  const source = readSource('router/routes.tsx');
  const protectedStart = source.indexOf("path: '/'");
  const settingsStart = source.indexOf("path: 'settings'");
  const notFoundStart = source.indexOf("path: '*'");

  assert.ok(protectedStart >= 0, '缺少 / 鉴权 layout');
  assert.ok(settingsStart > protectedStart, '设置路由必须位于鉴权 layout 内');
  assert.ok(notFoundStart > settingsStart, '设置路由必须位于兜底路由之前');
  assert.match(source.slice(protectedStart, settingsStart), /loader:[\s\S]*isLogin\(\)[\s\S]*children:/);
  assert.match(source, /import Settings from '@\/views\/settings'/);
  assert.match(source, /element: <Settings \/>/);
});
