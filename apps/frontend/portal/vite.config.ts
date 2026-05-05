import react from '@vitejs/plugin-react';
import { type ConfigEnv, type UserConfigExport, defineConfig, loadEnv } from 'vite';
import viteCompression from 'vite-plugin-compression';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'node:path';
import { name, version, engines, dependencies, devDependencies } from './package.json';

const pathResolve = (dir: string) => resolve(__dirname, dir);

// https://vite.dev/config/
export default ({ mode }: ConfigEnv): UserConfigExport => {
  const viteEnv = loadEnv(mode, process.cwd()) as unknown as ImportMetaEnv;
  const { VITE_PUBLIC_PATH, VITE_HTTP_BASE_URL } = viteEnv;

  return defineConfig({
    base: VITE_PUBLIC_PATH,
    resolve: {
      alias: {
        '@': pathResolve('src'),
        types: pathResolve('./types')
      }
    },
    css: {
      transformer: 'lightningcss',
      preprocessorOptions: {
        scss: {
          additionalData: `
            @use "@/styles/mixins.scss" as *;
          `
        }
      }
    },
    server: {
      host: '0.0.0.0', // 设置 host
      port: 5173, // 端口号
      hmr: true, // 热更新
      open: false, // 是否自动打开浏览器
      cors: true, // 跨域设置允许
      strictPort: false, // 端口被占用时，是否直接退出
      proxy: {
        [VITE_HTTP_BASE_URL]: {
          target: 'http://localhost:3000',
          changeOrigin: true
          // rewrite: (path) => path.replace(/^\/${VITE_HTTP_BASE_URL}/, '')
        }
      }
    },
    plugins: [
      react(),
      ViteImageOptimizer({
        png: { quality: 95, compressionLevel: 9 },
        jpg: { quality: 95 }
      }),
      viteCompression({
        verbose: true, // 是否显示压缩日志
        disable: false, // 是否禁用压缩
        threshold: 10240, // 大于10kb的文件gzip压缩
        algorithm: 'gzip', // 压缩算法
        ext: '.gz' // 压缩后的文件扩展名
      }),
      // viteCompression({ verbose: true, disable: false, threshold: 10240, algorithm: 'brotliCompress', ext: '.br' }),
      visualizer()
    ],
    build: {
      outDir: 'dist', // 打包后输出目录
      assetsDir: 'static', // 打包后静态资源目录
      chunkSizeWarningLimit: 500, // 单个 chunk 文件的大小超过 500KB 时发出警告
      assetsInlineLimit: 4096, // 小于4kb base64转码
      reportCompressedSize: false, // 禁用 gzip 压缩大小报告
      sourcemap: false, // 构建后是否生成 source map 文件
      rolldownOptions: {
        output: {
          /**
           * 分块策略
           * 1. 注意这些包名必须存在，否则打包会报错
           * 2. 如果你不想自定义 chunk 分割策略，可以直接移除这段配置
           */
          manualChunks: (id: string) => {
            if (id.includes('node_modules')) {
              const parts = id.split('node_modules');
              const pkgPath = parts.length > 1 ? parts.slice(1).join('node_modules') : '';
              if (!pkgPath) return null;

              // antd 全家桶（包含图标）
              if (/antd|@ant-design/.test(pkgPath)) return 'antd-vendor';
              // react
              if (/react|react-dom|react-router-dom/.test(pkgPath)) return 'react-vendor';
              // 高频通用工具库
              if (/zustand|axios|dayjs/.test(pkgPath)) return 'utils-vendor';
              return 'common-vendor';
            }
            // 其他依赖默认走 Rolldown 自动分块
            return null;
          }
        }
      }
    },
    define: {
      __APP_INFO__: {
        name,
        version,
        engines,
        dependencies,
        devDependencies,
        buildTime: Date.now()
      }
    }
  });
};
