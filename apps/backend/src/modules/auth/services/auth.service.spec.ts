import { BadRequestException, NotFoundException } from '@nestjs/common';
import { compare, hashSync } from 'bcryptjs';
import { AuthService, REGISTRATION_CLOSED_MESSAGE } from './auth.service';
import type { RegisterDto } from '../dtos/auth.dto';

const ENV_KEY = 'AUTH_REGISTRATION_ENABLED';

const setRegistrationEnv = (value: string | undefined) => {
  if (value === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = value;
};

const registerBody = (): RegisterDto => ({
  phone: '13800138000',
  password: 'secret12',
  nickname: '测试用户'
});

const createService = (userService: Record<string, jest.Mock>) => {
  const multi = {
    set: jest.fn().mockReturnThis(),
    sadd: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([])
  };
  const jwtService = {
    sign: jest.fn((payload: { type: string }) => `${payload.type}-token`)
  };
  const configService = { get: jest.fn().mockReturnValue(undefined) };
  const redisService = {
    getClient: () => ({
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      multi: jest.fn().mockReturnValue(multi)
    })
  };
  return new AuthService(jwtService as never, userService as never, configService as never, redisService as never);
};

describe('registration switch', () => {
  const saved = process.env[ENV_KEY];

  afterEach(() => {
    setRegistrationEnv(saved);
  });

  it('keeps registration open when AUTH_REGISTRATION_ENABLED is unset', async () => {
    setRegistrationEnv(undefined);
    const created = {
      id: 'user-1',
      phone: '13800138000',
      nickname: '测试用户',
      avatar: null
    };
    const createUser = jest.fn().mockResolvedValue(created);
    const service = createService({ createUser });

    expect(service.getPublicConfig()).toEqual({ registrationEnabled: true });
    await expect(service.register(registerBody())).resolves.toBeUndefined();
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(createUser.mock.calls[0][0].phone).toBe(registerBody().phone);
    expect(createUser.mock.calls[0][0].password).not.toBe(registerBody().password);

    const result = await service.registerLogin(registerBody());
    expect(createUser).toHaveBeenCalledTimes(2);
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.userInfo).toEqual(created);
  });

  it('rejects new registration when AUTH_REGISTRATION_ENABLED is false', async () => {
    setRegistrationEnv('false');
    const createUser = jest.fn();
    const service = createService({ createUser });

    expect(service.getPublicConfig()).toEqual({ registrationEnabled: false });
    await expect(service.register(registerBody())).rejects.toThrow(BadRequestException);
    await expect(service.register(registerBody())).rejects.toThrow(REGISTRATION_CLOSED_MESSAGE);
    await expect(service.registerLogin(registerBody())).rejects.toThrow(REGISTRATION_CLOSED_MESSAGE);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('treats false ignoring case and surrounding whitespace as disabled, and other values as open', () => {
    const service = createService({});
    for (const value of ['false', 'FALSE', ' false ']) {
      setRegistrationEnv(value);
      expect(service.getPublicConfig()).toEqual({ registrationEnabled: false });
    }
    for (const value of [undefined, '', 'true']) {
      setRegistrationEnv(value);
      expect(service.getPublicConfig()).toEqual({ registrationEnabled: true });
    }
  });

  it('still logs in an existing account when registration is disabled', async () => {
    setRegistrationEnv('false');
    const password = 'secret12';
    const user = {
      id: 'user-1',
      phone: '13800138000',
      nickname: '测试用户',
      avatar: null,
      password: hashSync(password, 4)
    };
    const createUser = jest.fn();
    const getUserByPhoneOrThrowForLogin = jest.fn().mockResolvedValue(user);
    const service = createService({ createUser, getUserByPhoneOrThrowForLogin });

    const result = await service.login({ phone: user.phone, password });

    expect(getUserByPhoneOrThrowForLogin).toHaveBeenCalledWith(user.phone);
    expect(createUser).not.toHaveBeenCalled();
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.userInfo).toEqual({
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar: null
    });
    await expect(service.register(registerBody())).rejects.toThrow(REGISTRATION_CLOSED_MESSAGE);
  });
});

describe('change password', () => {
  const currentPassword = 'secret12';
  const newPassword = 'newpass99';
  const user = {
    id: 'user-1',
    password: hashSync(currentPassword, 4)
  };

  const body = (overrides?: Partial<{ currentPassword: string; newPassword: string; confirmNewPassword: string }>) => ({
    currentPassword,
    newPassword,
    confirmNewPassword: newPassword,
    ...overrides
  });

  it('writes a hashed new password and does not revoke sessions', async () => {
    const getUserByIdWithPassword = jest.fn().mockResolvedValue(user);
    const updatePasswordHash = jest.fn().mockResolvedValue(undefined);
    const service = createService({ getUserByIdWithPassword, updatePasswordHash });
    const revoke = jest.spyOn(service, 'revokeAllSessions');

    await expect(service.changePassword(user.id, body())).resolves.toBeUndefined();

    expect(getUserByIdWithPassword).toHaveBeenCalledWith(user.id);
    expect(updatePasswordHash).toHaveBeenCalledTimes(1);
    expect(updatePasswordHash.mock.calls[0][0]).toBe(user.id);
    const stored = updatePasswordHash.mock.calls[0][1] as string;
    expect(stored).not.toBe(newPassword);
    await expect(compare(newPassword, stored)).resolves.toBe(true);
    await expect(compare(currentPassword, stored)).resolves.toBe(false);
    expect(revoke).not.toHaveBeenCalled();
  });

  it('rejects a wrong current password and does not write', async () => {
    const getUserByIdWithPassword = jest.fn().mockResolvedValue(user);
    const updatePasswordHash = jest.fn();
    const service = createService({ getUserByIdWithPassword, updatePasswordHash });

    await expect(service.changePassword(user.id, body({ currentPassword: 'wrong-password' }))).rejects.toThrow(
      BadRequestException
    );
    await expect(service.changePassword(user.id, body({ currentPassword: 'wrong-password' }))).rejects.toThrow(
      '当前密码错误'
    );
    expect(updatePasswordHash).not.toHaveBeenCalled();
  });

  it('rejects mismatched confirmation and does not write', async () => {
    const getUserByIdWithPassword = jest.fn();
    const updatePasswordHash = jest.fn();
    const service = createService({ getUserByIdWithPassword, updatePasswordHash });

    await expect(service.changePassword(user.id, body({ confirmNewPassword: 'newpass88' }))).rejects.toThrow(
      '两次输入的新密码不一致'
    );
    expect(getUserByIdWithPassword).not.toHaveBeenCalled();
    expect(updatePasswordHash).not.toHaveBeenCalled();
  });

  it('rejects an empty or out-of-range new password and does not write', async () => {
    const getUserByIdWithPassword = jest.fn();
    const updatePasswordHash = jest.fn();
    const service = createService({ getUserByIdWithPassword, updatePasswordHash });

    await expect(service.changePassword(user.id, body({ newPassword: '', confirmNewPassword: '' }))).rejects.toThrow(
      '密码不能为空'
    );
    await expect(
      service.changePassword(user.id, body({ newPassword: '12345', confirmNewPassword: '12345' }))
    ).rejects.toThrow('密码长度需为 6～32 个字符');
    await expect(
      service.changePassword(user.id, body({ newPassword: 'a'.repeat(33), confirmNewPassword: 'a'.repeat(33) }))
    ).rejects.toThrow('密码长度需为 6～32 个字符');
    expect(getUserByIdWithPassword).not.toHaveBeenCalled();
    expect(updatePasswordHash).not.toHaveBeenCalled();
  });

  it('accepts new passwords of 6 and 32 characters', async () => {
    const getUserByIdWithPassword = jest.fn().mockResolvedValue(user);
    const updatePasswordHash = jest.fn().mockResolvedValue(undefined);
    const service = createService({ getUserByIdWithPassword, updatePasswordHash });

    const short = 'abcdef';
    const long = 'p'.repeat(32);
    await expect(service.changePassword(user.id, body({ newPassword: short, confirmNewPassword: short }))).resolves.toBeUndefined();
    await expect(service.changePassword(user.id, body({ newPassword: long, confirmNewPassword: long }))).resolves.toBeUndefined();
    expect(updatePasswordHash).toHaveBeenCalledTimes(2);
  });

  it('does not write when the account is missing', async () => {
    const getUserByIdWithPassword = jest.fn().mockRejectedValue(new NotFoundException('用户不存在'));
    const updatePasswordHash = jest.fn();
    const service = createService({ getUserByIdWithPassword, updatePasswordHash });

    await expect(service.changePassword('missing', body())).rejects.toThrow(NotFoundException);
    expect(updatePasswordHash).not.toHaveBeenCalled();
  });
});
