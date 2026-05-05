import { Role, type MessageRoleWire } from '../constants/role.const';

export function roleToLowerCase(role: Role): MessageRoleWire {
  const map: Record<Role, MessageRoleWire> = {
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
