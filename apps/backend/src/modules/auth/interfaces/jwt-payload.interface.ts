export type UserId = string;

export interface JwtPayload {
  sub: UserId;
  sid: string;
  jti: string;
  ver: number;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
