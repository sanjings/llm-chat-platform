export type SelectableModelLike = {
  id: string;
  available: boolean;
};

/**
 * 新会话实际使用的模型：个人默认（当前可用）优先，否则系统默认（当前可用），否则第一个可用模型。
 */
export const resolveEffectiveModelId = (
  savedDefaultId: string | null | undefined,
  models: readonly SelectableModelLike[],
  systemDefaultId: string
): string => {
  const saved = savedDefaultId?.trim() || '';
  if (saved && models.some((item) => item.id === saved && item.available)) return saved;

  const system = systemDefaultId?.trim() || '';
  if (system && models.some((item) => item.id === system && item.available)) return system;

  const firstAvailable = models.find((item) => item.available)?.id;
  if (firstAvailable) return firstAvailable;

  return system || saved;
};

export const unavailableReasons = (models: readonly { available: boolean; unavailableReason?: string | null }[]) => {
  const seen = new Set<string>();
  const reasons: string[] = [];
  for (const item of models) {
    const reason = item.unavailableReason?.trim();
    if (item.available || !reason || seen.has(reason)) continue;
    seen.add(reason);
    reasons.push(reason);
  }
  return reasons;
};
