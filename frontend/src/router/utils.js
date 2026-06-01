/**
 * 路由工具函数
 */

/**
 * 匹配路由并提取参数
 * @param {string} path - 当前路径
 * @param {string} pattern - 路由模式（如 /domain/:name）
 * @returns {Object|null} 参数对象或 null
 */
export function matchRoute(path, pattern) {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = path.split('/').filter(Boolean)
  
  if (patternParts.length !== pathParts.length) {
    return null
  }
  
  const params = {}
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]
    const pathPart = pathParts[i]
    
    if (patternPart.startsWith(':')) {
      // 动态参数
      params[patternPart.slice(1)] = decodeURIComponent(pathPart)
    } else if (patternPart !== pathPart) {
      // 静态部分不匹配
      return null
    }
  }
  
  return params
}

/**
 * 获取查询参数
 * @returns {URLSearchParams} 查询参数对象
 */
export function getQueryParams() {
  const hash = window.location.hash
  const queryString = hash.split('?')[1] || ''
  return new URLSearchParams(queryString)
}
