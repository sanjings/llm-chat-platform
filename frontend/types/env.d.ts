/** 声明 vite 环境变量的类型（如果未声明则默认是 any） */
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_PUBLIC_PATH: string;
  readonly VITE_HTTP_BASE_URL: string;
  readonly VITE_CACHE_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * 平台的名称、版本、运行所需的`node`版本、依赖、构建时间的类型提示
 */
declare const __APP_INFO__: {
  name: string;
  version: string;
  engines: {
    node: string;
  };
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  buildTime: number;
};
