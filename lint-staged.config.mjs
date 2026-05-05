import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const portalDir = path.join(root, 'apps', 'frontend', 'portal');

function resolveStagedFiles(filenames) {
  return filenames.map((f) => (path.isAbsolute(f) ? f : path.resolve(root, f)));
}

export default {
  '*.{js,jsx,ts,tsx}': ['eslint --fix --cache', 'prettier --write'],
  '*.{html,scss,css,less,sass}': [
    (filenames) => {
      if (!filenames.length) return [];
      const files = resolveStagedFiles(filenames)
        .map((f) => JSON.stringify(f))
        .join(' ');
      const stylelintConfig = path.join(portalDir, '.stylelintrc.js');
      return `pnpm --filter @llm-chat-platform/portal exec stylelint --fix --config ${JSON.stringify(stylelintConfig)} ${files}`;
    },
    'prettier --write'
  ],
  '*.{cjs,json,md}': ['prettier --write']
};
