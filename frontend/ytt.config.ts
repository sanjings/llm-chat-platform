// ytt.config.ts
import { defineConfig } from 'yapi-to-typescript';

const getFormatName = (str: string) => {
  const index1 = str.indexOf('(');
  const index2 = str.indexOf(')');
  if (index2 !== -1) {
    return str.substring(index1 + 1, index2);
  }
  return 'index';
};

export default defineConfig([
  {
    serverUrl: 'http://localhost:3000/docs-json',
    serverType: 'openapi',
    target: 'typescript',
    typesOnly: false,
    prodEnvName: 'production',
    outputFilePath: (interfaceInfo) => `src/services/swagger/${getFormatName(interfaceInfo._category.name)}.ts`,
    requestFunctionFilePath: 'src/services/util.ts',
    projects: [
      {
        categories: [
          {
            id: 0,
            getRequestFunctionName(interfaceInfo, changeCase) {
              return `request${changeCase.pascalCase(interfaceInfo.path.replace(/\//g, ' '))}`;
            }
          }
        ]
      }
    ]
  }
]);
