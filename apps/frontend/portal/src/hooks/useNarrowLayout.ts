import { useEffect, useState } from 'react';

/**
 * 用于布局分支：同时覆盖「真机 UA」和「桌面浏览器仅改视口宽度」两种场景。
 * 与 `utils/env` 的 UA 判断不同：这里以视口宽度为准。
 */
export function useNarrowLayout(query = '(max-width: 768px)') {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
