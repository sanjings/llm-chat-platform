export type UserId = string;

export interface JwtPayload {
  sub: UserId;
}
