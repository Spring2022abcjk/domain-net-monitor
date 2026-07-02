/**
 * API 请求配置
 */
import { getApiToken, getApiEndpoint, setApiToken as syncApiToken } from './storage.js'

const API_CONFIG = {
  baseUrl: '',
  timeout: 15000,
  retryCount: 0,
}

/**
 * API 错误类
 */
export class APIError extends Error {
  constructor(message, status, code, data) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.code = code
    this.data = data
  }
}

/**
 * 获取当前 API 端点
 * @returns {string} API 端点
 */
export function getApiBaseUrl() {
  return API_CONFIG.baseUrl || getApiEndpoint()
}

/**
 * 设置 API 端点
 * @param {string} url - API 端点
 */
export function setApiBaseUrl(url) {
  API_CONFIG.baseUrl = url
}

/**
 * 获取存储的 Token
 * @returns {string|null} Token
 */
export function getToken() {
  return localStorage.getItem('api_token') || getApiToken()
}

/**
 * 设置 Token
 * @param {string} token - Token
 */
export function setToken(token) {
  localStorage.setItem('api_token', token)
  syncApiToken(token)
}

/**
 * 清除 Token
 */
export function clearToken() {
  localStorage.removeItem('api_token')
}

/**
 * API 请求封装
 * @param {string} url - 请求 URL
 * @param {Object} options - 请求选项
 * @param {string} options.apiToken - 可选的 API Token（用于登录验证）
 * @returns {Promise<Object>} 响应数据
 */
export async function request(url, options = {}) {
  // 优先使用传入的 apiToken，否则从 localStorage 读取
  const token = options.apiToken || getToken()

  // 检测是否是完整 URL
  let fullUrl
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // 已经是完整 URL，不拼接 baseUrl
    fullUrl = url
  } else {
    // 相对路径，拼接 baseUrl
    fullUrl = API_CONFIG.baseUrl ? API_CONFIG.baseUrl + url : url
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // 添加 Token（如果 apiToken 在 options 中，使用它；否则使用 localStorage 的）
  if (options.apiToken) {
    headers['X-API-Token'] = options.apiToken
  } else if (token) {
    headers['X-API-Token'] = token
  }

  // 移除 apiToken 从 options，避免传给 fetch
  const { apiToken, ...fetchOptions } = options

  const config = {
    ...fetchOptions,
    headers,
  }

  // 创建带超时的 Promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${API_CONFIG.timeout}ms`))
    }, API_CONFIG.timeout)
  })

  const fetchPromise = (async () => {
    try {
      const response = await fetch(fullUrl, config)
      const data = await response.json()

      if (!response.ok) {
        throw new APIError(data.msg || `HTTP ${response.status}`, response.status, data.code || 'ERROR', data)
      }

      return data
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }

      // 网络错误
      throw new APIError('网络错误，请检查连接', 0, 'NETWORK_ERROR', null)
    }
  })()

  // 竞速：超时或请求完成
  return Promise.race([fetchPromise, timeoutPromise])
}

/**
 * GET 请求
 * @param {string} url - 请求 URL
 * @param {Object} [params] - 查询参数
 * @returns {Promise<Object>} 响应数据
 */
export function get(url, params) {
  if (!params || Object.keys(params).length === 0) {
    return request(url, { method: 'GET' })
  }

  // 处理已有查询参数的 URL
  const [baseUrl, existingQuery] = url.split('?')
  const searchParams = new URLSearchParams(existingQuery || '')

  // 添加新参数
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, value)
    }
  })

  const queryString = searchParams.toString()
  const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl

  return request(finalUrl, { method: 'GET' })
}

/**
 * POST 请求
 * @param {string} url - 请求 URL
 * @param {Object} body - 请求体
 * @param {Object} options - 可选参数（如 apiToken）
 * @returns {Promise<Object>} 响应数据
 */
export function post(url, body, options = {}) {
  return request(url, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  })
}

/**
 * PUT 请求
 * @param {string} url - 请求 URL
 * @param {Object} body - 请求体
 * @returns {Promise<Object>} 响应数据
 */
export function put(url, body) {
  return request(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/**
 * DELETE 请求
 * @param {string} url - 请求 URL
 * @returns {Promise<Object>} 响应数据
 */
export function del(url) {
  return request(url, { method: 'DELETE' })
}

/**
 * 设置请求超时
 * @param {number} ms - 超时毫秒数
 */
export function setRequestTimeout(ms) {
  API_CONFIG.timeout = ms
}
