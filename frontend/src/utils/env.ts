/**
 * @file 环境判断方法
 */

/**
 * 是否本地环境
 */
export const inLocal = /localhost|192.168|127.0.0.1/.test(location.host);

/**
 * 是否正式环境
 */
export const inProd = !inLocal;

/**
 * 是否在服务端环境
 */
export const inServer = typeof window === 'undefined';

/**
 * 是否在客户端环境
 */
export const inClient = !inServer;

/**
 * 是否是移动端
 */
export const isMobile = /iPhone|iPod|Android/i.test(navigator.userAgent);
