export const SETTINGS_PATH = '/settings';

export const SETTINGS_EMPTY_DESCRIPTION = '暂无可配置项，后续版本会陆续开放。';

export type SettingsLocationState = {
  /** 进入设置前所在的对话路由，返回时原样跳回。 */
  from?: string;
};

/** 只接受对话路由，避免把用户带回登录页或外部地址。 */
const CHAT_PATH_REG = /^\/chat(?:\/[^/?#]+)?$/;

export const createSettingsEntryState = (from: string): SettingsLocationState => ({ from });

/** 直接访问或刷新设置页时 state 会丢失，此时回到新对话页。 */
export const resolveSettingsReturnPath = (state: unknown): string => {
  const from = (state as SettingsLocationState | null)?.from;
  return typeof from === 'string' && CHAT_PATH_REG.test(from) ? from : '/chat';
};
