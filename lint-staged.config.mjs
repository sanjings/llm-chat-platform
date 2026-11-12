import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const portalDir = path.join(root, 'apps', 'frontend', 'portal');

function resolveStagedFiles(filenames) {
  return filenames.map((f) => (path.isAbsolute(f) ? f : path.resolve(root, f)));
}

/** 已跟踪的 Prisma Client 在 gitignore 中，lint-staged 再 git add 会失败。 */
const withoutGenerated = (filenames) => filenames.filter((filename) => !filename.includes(`${path.sep}generated${path.sep}`));

export default {
  '*.{js,jsx,ts,tsx}': (filenames) => {
    const files = withoutGenerated(filenames);
    if (!files.length) return [];
    const list = files.map((filename) => JSON.stringify(filename)).join(' ');
    return [`eslint --fix --cache ${list}`, `prettier --write ${list}`];
  },
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
