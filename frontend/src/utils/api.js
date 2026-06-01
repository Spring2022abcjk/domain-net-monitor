/**
 * API 请求配置
 */
const API_CONFIG = {
  baseUrl: '',
  timeout: 5000
}

/**
 * 获取当前 API 端点
 * @returns {string} API 端点
 */
export function getApiBaseUrl() {
  return API_CONFIG.baseUrl
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
  return localStorage.getItem('api_token')
}

/**
 * 设置 Token
 * @param {string} token - Token
 */
export function setToken(token) {
  localStorage.setItem('api_token', token)
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
 * @returns {Promise<Object>} 响应数据
 */
export async function request(url, options = {}) {
  const token = getToken()
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  // 添加 Token
  if (token) {
    headers['X-API-Token'] = token
  }
  
  const config = {
    ...options,
    headers
  }
  
  // 创建带超时的 Promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${API_CONFIG.timeout}ms`))
    }, API_CONFIG.timeout)
  })
  
  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, config)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.msg || `HTTP ${response.status}`)
      }
      
      return data
    } catch (error) {
      console.error('[API] Request failed:', error)
      throw error
    }
  })()
  
  // 竞速：超时或请求完成
  return Promise.race([fetchPromise, timeoutPromise])
}

/**
 * GET 请求
 * @param {string} url - 请求 URL
 * @returns {Promise<Object>} 响应数据
 */
export function get(url) {
  return request(url, { method: 'GET' })
}

/**
 * POST 请求
 * @param {string} url - 请求 URL
 * @param {Object} body - 请求体
 * @returns {Promise<Object>} 响应数据
 */
export function post(url, body) {
  return request(url, {
    method: 'POST',
    body: JSON.stringify(body)
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
    body: JSON.stringify(body)
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
