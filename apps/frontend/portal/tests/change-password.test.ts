import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validatePassword } from '../src/utils/password.ts';

const readSource = (relativePath: string) =>
  readFileSync(new URL(`../../src/${relativePath}`, import.meta.url), 'utf8');

test('密码校验沿用注册规则：空值、不足 6 个字符和超过 32 个字符均不通过', () => {
  assert.equal(PASSWORD_MIN_LENGTH, 6);
  assert.equal(PASSWORD_MAX_LENGTH, 32);
  assert.equal(validatePassword(''), '密码不能为空');
  assert.ok(validatePassword('12345'));
  assert.ok(validatePassword('a'.repeat(33)));
  assert.equal(validatePassword('secret'), null);
  assert.equal(validatePassword('abcdef'), null);
  assert.equal(validatePassword('p'.repeat(32)), null);
});

test('设置页提供改密和退出全部设备，成功改密后保持登录，退出全部设备后回到登录', () => {
  const source = readSource('views/settings/index.tsx');
  assert.match(source, /登录密码/);
  assert.match(source, /updateCurrentUserPassword/);
  assert.match(source, /requestLogoutAllDevices/);
  assert.match(source, /validatePassword/);
  assert.match(source, /两次输入的新密码不一致/);
  assert.match(source, /密码已修改/);
  assert.match(source, /退出全部设备/);
  assert.match(source, /useUserStore\.getState\(\)\.logout\(\)/);
  assert.doesNotMatch(source, /头像上传|换绑|API Key|找回密码|第三方登录|二次验证/);
  assert.doesNotMatch(source, /revokeAllSessions/);
});

test('改密接口只提交当前用户的密码字段，退出全部设备调用已有 logoutAll', () => {
  const source = readSource('services/api/auth.ts');
  assert.match(source, /\/api\/auth\/password/);
  assert.match(source, /updateCurrentUserPassword/);
  assert.match(
    source,
    /requestPut\('\/api\/auth\/password', \{\s*currentPassword: payload\.currentPassword,\s*newPassword: payload\.newPassword,\s*confirmNewPassword: payload\.confirmNewPassword\s*\}\)/
  );
  assert.match(source, /requestPost\('\/api\/auth\/logoutAll'\)/);
  assert.doesNotMatch(source, /updateCurrentUserPassword[\s\S]*userId/);
});

test('外观、账号资料和默认模型仍保留在设置页', () => {
  const source = readSource('views/settings/index.tsx');
  assert.match(source, /账号资料/);
  assert.match(source, /requestUserProfile/);
  assert.match(source, /updateUserProfile/);
  assert.match(source, /外观/);
  assert.match(source, /ThemeSwitch/);
  assert.match(source, /默认模型/);
  assert.match(source, /requestUserDefaultModel/);
  assert.match(source, /updateUserDefaultModel/);
});
