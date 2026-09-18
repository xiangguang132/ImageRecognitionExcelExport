/**
 * basePath 集中定义（与 next.config.ts 的 basePath 保持一致）。
 * 浏览器端 fetch 不会自动加 basePath 前缀，所有 '/api/...' 与
 * window.location 跳转都必须经 api()/page() 包一层。
 * api() 是幂等的，已带前缀的路径不会重复添加。
 */
export const BASE_PATH = '/card'

export function api(path: string): string {
  if (path.startsWith('/api/')) return `${BASE_PATH}${path}`
  if (path === '/api') return `${BASE_PATH}/api`
  return path
}

export function page(path: string): string {
  if (path.startsWith('/')) return `${BASE_PATH}${path}`
  return path
}
