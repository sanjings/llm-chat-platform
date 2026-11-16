import { BadRequestException } from '@nestjs/common';
import { hashSync } from 'bcryptjs';
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
