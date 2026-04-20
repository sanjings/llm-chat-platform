// ytt.config.ts
import { defineConfig } from 'yapi-to-typescript';

const getGroupFileName = (name?: string) => {
  if (!name) return 'index';
  return (
    name
      .trim()
      .replace(/[^\w\u4e00-\u9fa5-]+/g, '-') // 非法字符替换
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'index'
  );
};

export default defineConfig([
  {
    serverUrl: 'http://localhost:3000/docs-json',
    serverType: 'swagger',
    target: 'typescript',
    typesOnly: false,
    prodEnvName: 'production',
    outputFilePath: (interfaceInfo) => `src/services/swagger/${getGroupFileName(interfaceInfo?._category?.name)}.ts`,
    requestFunctionFilePath: 'src/services/ytt-request.ts',
    projects: [
      {
        token: '', // swagger 不需要token
        categories: [
          {
            id: 0,
            getRequestFunctionName(interfaceInfo, changeCase) {
              const normalizedPath = interfaceInfo.path.replace(/^\/?api(?=\/|$)/i, '');
              return `request${changeCase.pascalCase(normalizedPath.replace(/\//g, ' '))}`;
            }
          }
        ]
      }
    ]
  }
]);
