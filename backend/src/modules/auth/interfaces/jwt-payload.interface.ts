export interface JwtPayload {
  sub: string;
  phone: string;
  nickname: string;
  avatar?: string | null;
}
