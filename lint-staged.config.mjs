import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(root, 'frontend');

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
      const stylelintConfig = path.join(frontendDir, '.stylelintrc.js');
      return `npm exec --prefix ${JSON.stringify(frontendDir)} -- stylelint --fix --config ${JSON.stringify(stylelintConfig)} ${files}`;
    },
    'prettier --write'
  ],
  '*.{cjs,json,md}': ['prettier --write']
};
