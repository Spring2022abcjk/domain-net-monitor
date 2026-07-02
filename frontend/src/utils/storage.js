/**
 * localStorage 凭据管理
 */

const STORAGE_KEY = 'domain_monitor_config'

/**
 * 获取存储的配置
 * @returns {Object} 配置对象
 */
export function getConfig() {
  const config = localStorage.getItem(STORAGE_KEY)
  if (config) {
    try {
      return JSON.parse(config)
    } catch (e) {
      console.error('[Storage] Failed to parse config:', e)
      return {}
    }
  }
  return {}
}

/**
 * 存储配置
 * @param {Object} config - 配置对象
 */
export function setConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

/**
 * 清除配置
 */
export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * 获取 API 端点
 * @returns {string} API 端点
 */
export function getApiEndpoint() {
  const config = getConfig()
  return config.apiEndpoint || ''
}

/**
 * 设置 API 端点
 * @param {string} endpoint - API 端点
 */
export function setApiEndpoint(endpoint) {
  const config = getConfig()
  config.apiEndpoint = endpoint
  setConfig(config)
}

/**
 * 获取 API Token
 * @returns {string} Token
 */
export function getApiToken() {
  const config = getConfig()
  return config.apiToken || ''
}

/**
 * 设置 API Token
 * @param {string} token - Token
 */
export function setApiToken(token) {
  const config = getConfig()
  config.apiToken = token
  setConfig(config)
}

/**
 * 清除登录信息
 */
export function clearAuth() {
  clearConfig()
}

/**
 * 检查是否已登录
 * @returns {boolean} 是否已登录
 */
export function isLoggedIn() {
  const config = getConfig()
  return !!(config.apiEndpoint && config.apiToken)
}

/**
 * 获取当前用户信息（从 Token 解析）
 * @returns {Object|null} 用户信息
 */
export function getCurrentUser() {
  const token = getApiToken()
  if (!token) return null

  try {
    // 如果是 JWT，可以解析 payload
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]))

      // 检查是否过期
      if (payload.exp && payload.exp < Date.now() / 1000) {
        console.warn('[Storage] Token expired')
        return null
      }

      return {
        id: payload.sub,
        name: payload.name,
        exp: payload.exp,
      }
    }
  } catch (e) {
    console.warn('[Storage] Failed to parse token:', e)
  }

  return null
}

/**
 * @deprecated 请使用 router 模块的 navigateTo()
 * 导航到指定路径
 * @param {string} path - 路径
 */
export function navigate(path) {
  window.location.hash = path
}
