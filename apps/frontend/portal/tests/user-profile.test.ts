import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { NICKNAME_MAX_LENGTH, NICKNAME_MIN_LENGTH, validateNickname } from '../src/utils/nickname.ts';

const readSource = (relativePath: string) =>
  readFileSync(new URL(`../../src/${relativePath}`, import.meta.url), 'utf8');

test('昵称校验沿用注册规则：空值、不足 2 个字符和超过 20 个字符均不通过', () => {
  assert.equal(NICKNAME_MIN_LENGTH, 2);
  assert.equal(NICKNAME_MAX_LENGTH, 20);
  assert.equal(validateNickname(''), '昵称不能为空');
  assert.ok(validateNickname('甲'));
  assert.ok(validateNickname('啊'.repeat(21)));
  assert.equal(validateNickname('小明'), null);
  assert.equal(validateNickname('啊'.repeat(2)), null);
  assert.equal(validateNickname('啊'.repeat(20)), null);
});

test('设置页展示当前账号资料，可改昵称，手机号只读，保存成功后更新侧栏', () => {
  const source = readSource('views/settings/index.tsx');
  assert.match(source, /账号资料/);
  assert.match(source, /requestUserProfile/);
  assert.match(source, /updateUserProfile/);
  assert.match(source, /setUserInfo/);
  assert.match(source, /disabled readOnly/);
  assert.match(source, /validateNickname/);
  assert.doesNotMatch(source, /userId/);
  assert.doesNotMatch(source, /头像上传|换绑|API Key/);
});

test('当前用户资料接口只读写自己的昵称，不按任意 userId 更新，也不提交手机号', () => {
  const source = readSource('services/api/user.ts');
  assert.match(source, /\/api\/user\/profile/);
  assert.match(source, /requestUserProfile/);
  assert.match(source, /updateUserProfile/);
  assert.match(source, /requestPut<UserProfile>\('\/api\/user\/profile', \{ nickname \}\)/);
  assert.doesNotMatch(source, /user\/info\?userId/);
  assert.doesNotMatch(source, /updateUserProfile[\s\S]*userId/);
});

test('外观和默认模型仍保留在设置页', () => {
  const source = readSource('views/settings/index.tsx');
  assert.match(source, /外观/);
  assert.match(source, /ThemeSwitch/);
  assert.match(source, /默认模型/);
  assert.match(source, /requestUserDefaultModel/);
  assert.match(source, /updateUserDefaultModel/);
});
