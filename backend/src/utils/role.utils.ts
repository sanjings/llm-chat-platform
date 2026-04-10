import { Role } from '../generated/prisma/enums';

export function roleToLowerCase(role: Role): 'user' | 'assistant' | 'system' {
  const map: Record<Role, 'user' | 'assistant' | 'system'> = {
    [Role.USER]: 'user',
    [Role.ASSISTANT]: 'assistant',
    [Role.SYSTEM]: 'system'
  };
  return map[role];
}

export function lowerCaseToRole(role: string): Role {
  const map: Record<string, Role> = {
    user: Role.USER,
    assistant: Role.ASSISTANT,
    system: Role.SYSTEM
  };
  return map[role] ?? Role.USER;
}
