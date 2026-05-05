import { Role } from '../generated/prisma/enums';

export { Role };

/** 与 DB @map(user|assistant|system) 一致 */
export const MESSAGE_ROLE_WIRE = ['user', 'assistant', 'system'] as const;
export type MessageRoleWire = (typeof MESSAGE_ROLE_WIRE)[number];
