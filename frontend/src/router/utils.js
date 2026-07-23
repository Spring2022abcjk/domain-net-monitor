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

  /** @type {Record<string, string>} */
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
 * @param {string} [hash] - 可选的 hash 路径，不传则使用当前 location.hash
 * @returns {URLSearchParams} 查询参数对象
 */
export function getQueryParams(hash) {
  if (hash === undefined) {
    hash = typeof window !== 'undefined' ? window.location.hash : ''
  }
  const queryString = hash.split('?')[1] || ''
  return new URLSearchParams(queryString)
}

/**
 * 导航到指定路由
 * @param {string} path - 路由路径（不含 #）
 * @param {Object} [params] - 路由参数
 * @param {Record<string, string>} [query] - 查询参数
 */
export function navigate(path, params = {}, query = {}) {
  let finalPath = path

  if (params && Object.keys(params).length > 0) {
    for (const [key, value] of Object.entries(params)) {
      finalPath = finalPath.replace(`:${key}`, encodeURIComponent(value))
    }
  }

  const queryParams = new URLSearchParams(query)
  const queryString = queryParams.toString()

  if (queryString) {
    window.location.hash = `${finalPath}?${queryString}`
  } else {
    window.location.hash = finalPath
  }
}
