// tests/support/test-helpers.js

/**
 * 测试辅助函数
 * 提供常用的测试工具函数，减少重复代码
 */

import { assert, assertEqual } from '../test-runner.js'

export { assert, assertEqual }

/**
 * 创建 Mock KV 存储
 * @returns {Object} Mock KV 对象，模拟 Cloudflare KV API
 */
export function createMockKV() {
  const store = {}
  return {
    async get(key) {
      return store[key] || null
    },
    async put(key, value) {
      store[key] = value
    },
    async delete(key) {
      delete store[key]
    },
    async list({ prefix }) {
      const keys = Object.keys(store)
        .filter((key) => key.startsWith(prefix))
        .map((key) => ({ name: key }))
      return { keys }
    },
    /**
     * 清空 KV 存储（用于重置测试状态）
     */
    clear() {
      Object.keys(store).forEach((key) => delete store[key])
    },
  }
}

/**
 * 创建 Mock Env 对象
 * @param {Object} overrides - 覆盖值
 * @returns {Object} Mock Env 对象，包含所有必需的环境变量
 */
export function createMockEnv(overrides = {}) {
  return {
    DOMAIN_MONITOR_KV: createMockKV(),
    CLOUDFLARE_API_TOKEN: 'test_secret_token_123',
    ALLOWED_ORIGINS: '*',
    ...overrides,
  }
}

/**
 * 创建 Mock Request 对象
 * @param {string} url - 请求 URL
 * @param {string} [method='GET'] - HTTP 方法
 * @param {Object|null} [body=null] - 请求体（会自动 JSON 序列化）
 * @param {Object} [headers={}] - 请求头
 * @returns {Request} Mock Request 对象
 */
export function createMockRequest(url, method = 'GET', body = null, headers = {}) {
  const options = {
    method,
    headers,
  }
  if (body) {
    options.body = JSON.stringify(body)
    options.headers['Content-Type'] = 'application/json'
  }
  return new Request(url, options)
}

/**
 * 从 API 响应中提取 data 字段
 * @param {Response} response - 响应对象
 * @returns {Promise<Object>} data 字段内容
 *
 * @example
 * const response = await handleDomains(request, env);
 * const data = await getData(response);
 * assertEqual(data.domains.length, 2, 'Two domains');
 */
export async function getData(response) {
  const body = await response.json()
  return body.data
}

/**
 * 断言响应状态码
 * @param {Response} response - 响应对象
 * @param {number} expected - 期望的状态码
 * @param {string} [message] - 描述信息
 */
export function assertStatus(response, expected, message = 'Status code') {
  assertEqual(response.status, expected, message)
}

/**
 * 断言响应错误码
 * @param {Response} response - 响应对象
 * @param {number} expected - 期望的错误码
 * @param {string} [message] - 描述信息
 */
export async function assertCode(response, expected, message = 'Error code') {
  const body = await response.json()
  assertEqual(body.code, expected, message)
}

/**
 * 断言响应消息
 * @param {Response} response - 响应对象
 * @param {string} expected - 期望的消息
 * @param {string} [message] - 描述信息
 */
export async function assertMessage(response, expected, message = 'Error message') {
  const body = await response.json()
  assertEqual(body.msg, expected, message)
}

/**
 * 批量断言响应（状态码 + data 内容）
 * @param {Response} response - 响应对象
 * @param {number} status - 期望的状态码
 * @param {Object} dataAssertions - data 字段断言键值对
 *
 * @example
 * await assertResponse(response, 200, {
 *   'domains.length': 2,
 *   'count': 2
 * });
 */
export async function assertResponse(response, status, dataAssertions) {
  assertStatus(response, status, 'Response status')
  const data = await getData(response)

  for (const [key, expected] of Object.entries(dataAssertions)) {
    const actual = key.split('.').reduce((obj, k) => obj?.[k], data)
    assertEqual(actual, expected, `${key} assertion`)
  }
}
