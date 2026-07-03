#!/usr/bin/env node

/**
 * helper.js 单元测试
 * 测试 CORS、限流、JSON 响应等工具函数
 */

import {
  cleanDomain,
  jsonResponse,
  handleOptionsRequest,
  getCorsHeaders,
  rateLimiter,
  rateLimitHeaders,
  rateLimitExceededResponse,
  fetchWithTimeout,
} from '../../src/utils/helper.js'
import { assert, assertEqual, runSuite } from '../test-runner.js'

/**
 * 创建 Mock Request
 * @param {string} url - URL
 * @param {Object} options - 选项
 * @returns {Request}
 */
function createMockRequest(url = 'http://localhost:8787', options = {}) {
  return new Request(url, options)
}

/**
 * 创建 Mock Env
 * @param {Object} overrides - 覆盖的环境变量
 * @returns {import('../../src/types.js').Env}
 */
function createMockEnv(overrides = {}) {
  return {
    DOMAIN_MONITOR_KV: {},
    ALLOWED_ORIGINS: '*',
    CLOUDFLARE_API_TOKEN: 'test_token_123',
    CLOUDFLARE_ACCOUNT_ID: 'test_account',
    ...overrides,
  }
}

// ============ cleanDomain 测试 ============

async function testCleanDomain() {
  await runSuite('cleanDomain()', async () => {
    // 正常域名
    assertEqual(cleanDomain('example.com'), 'example.com', 'Pure domain')
    assertEqual(cleanDomain('www.example.com'), 'www.example.com', 'Domain with www')

    // 带协议
    assertEqual(cleanDomain('http://example.com'), 'example.com', 'HTTP protocol')
    assertEqual(cleanDomain('https://example.com'), 'example.com', 'HTTPS protocol')
    assertEqual(cleanDomain('http://www.example.com'), 'www.example.com', 'HTTP with www')
    assertEqual(cleanDomain('https://www.example.com'), 'www.example.com', 'HTTPS with www')

    // 带端口
    assertEqual(cleanDomain('example.com:80'), 'example.com', 'Port 80')
    assertEqual(cleanDomain('example.com:443'), 'example.com', 'Port 443')
    assertEqual(cleanDomain('example.com:8080'), 'example.com', 'Port 8080')

    // 协议 + 端口
    assertEqual(cleanDomain('https://example.com:443'), 'example.com', 'HTTPS + port 443')
    assertEqual(cleanDomain('http://example.com:8080'), 'example.com', 'HTTP + port 8080')

    // 带路径
    assertEqual(cleanDomain('example.com/path'), 'example.com', 'Path')
    assertEqual(cleanDomain('example.com/path/to/page'), 'example.com', 'Deep path')
    assertEqual(cleanDomain('example.com/path?query=1'), 'example.com', 'Path with query')

    // 完整 URL
    assertEqual(cleanDomain('https://www.example.com:443/path/to/page?query=1'), 'www.example.com', 'Full URL')
    assertEqual(cleanDomain('http://example.com:8080/api/v1/test'), 'example.com', 'Full URL with port')

    // 空白处理
    assertEqual(cleanDomain('  example.com  '), 'example.com', 'Trimmed whitespace')

    // 大小写
    assertEqual(cleanDomain('Example.COM'), 'example.com', 'Uppercase to lowercase')
    assertEqual(cleanDomain('EXAMPLE.com'), 'example.com', 'Mixed case')

    // 非法输入
    assertEqual(cleanDomain(''), null, 'Empty string')
    assertEqual(cleanDomain(null), null, 'Null input')
    assertEqual(cleanDomain(undefined), null, 'Undefined input')
    assertEqual(cleanDomain('not-a-valid-domain!@#'), null, 'Invalid characters')
    assertEqual(cleanDomain('-example.com'), null, 'Leading hyphen')
    assertEqual(cleanDomain('example-.com'), null, 'Trailing hyphen in label')
  })
}

// ============ getCorsHeaders 测试 ============

async function testGetCorsHeaders() {
  await runSuite('getCorsHeaders()', async () => {
    // 测试 1: 通配符模式
    const env1 = createMockEnv({ ALLOWED_ORIGINS: '*' })
    const headers1 = getCorsHeaders(createMockRequest(), env1)
    assertEqual(headers1['Access-Control-Allow-Origin'], '*', 'Wildcard origin')
    assertEqual(headers1['Access-Control-Allow-Methods'], 'GET, POST, PUT, DELETE, OPTIONS', 'Wildcard methods')
    assertEqual(headers1['Access-Control-Allow-Headers'], 'Content-Type, X-API-Token', 'Wildcard headers')

    // 测试 2: 白名单匹配
    const env2 = createMockEnv({ ALLOWED_ORIGINS: 'https://your-single.your-domain.pages.dev' })
    const request2 = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://your-single.your-domain.pages.dev' },
    })
    const headers2 = getCorsHeaders(request2, env2)
    assertEqual(headers2['Access-Control-Allow-Origin'], 'https://your-single.your-domain.pages.dev', 'Whitelist match')
    assertEqual(headers2['Vary'], 'Origin', 'Vary header present')

    // 测试 3: 白名单不匹配
    const env3 = createMockEnv({ ALLOWED_ORIGINS: 'https://allowed.com' })
    const request3 = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://evil.com' },
    })
    const headers3 = getCorsHeaders(request3, env3)
    assertEqual(Object.keys(headers3).length, 0, 'Whitelist no match returns empty')

    // 测试 4: 多个白名单域名
    const env4 = createMockEnv({ ALLOWED_ORIGINS: 'https://a.com,https://b.com,https://c.com' })
    const request4a = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://b.com' },
    })
    const headers4a = getCorsHeaders(request4a, env4)
    assertEqual(headers4a['Access-Control-Allow-Origin'], 'https://b.com', 'Multiple whitelist - match b.com')

    const request4b = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://a.com' },
    })
    const headers4b = getCorsHeaders(request4b, env4)
    assertEqual(headers4b['Access-Control-Allow-Origin'], 'https://a.com', 'Multiple whitelist - match a.com')

    // 测试 5: 没有 Origin 头
    const env5 = createMockEnv({ ALLOWED_ORIGINS: 'https://allowed.com' })
    const request5 = createMockRequest('http://localhost:8787')
    const headers5 = getCorsHeaders(request5, env5)
    assertEqual(Object.keys(headers5).length, 0, 'No Origin header returns empty')

    // 测试 6: 未配置环境变量（降级为 *）
    const env6 = createMockEnv({ ALLOWED_ORIGINS: undefined })
    const headers6 = getCorsHeaders(createMockRequest(), env6)
    assertEqual(headers6['Access-Control-Allow-Origin'], '*', 'Undefined ALLOWED_ORIGINS defaults to *')
  })
}

// ============ handleOptionsRequest 测试 ============

async function testHandleOptionsRequest() {
  await runSuite('handleOptionsRequest()', async () => {
    // 测试 1: 通配符模式
    const env1 = createMockEnv({ ALLOWED_ORIGINS: '*' })
    const request1 = createMockRequest('http://localhost:8787', {
      method: 'OPTIONS',
      headers: { Origin: 'https://any.com' },
    })
    const response1 = handleOptionsRequest(request1, env1)
    assertEqual(response1.status, 204, '204 No Content - wildcard')
    assertEqual(response1.headers.get('Access-Control-Allow-Origin'), '*', 'CORS Origin - wildcard')
    assertEqual(
      response1.headers.get('Access-Control-Allow-Methods'),
      'GET, POST, PUT, DELETE, OPTIONS',
      'CORS Methods',
    )
    assertEqual(response1.headers.get('Access-Control-Allow-Headers'), 'Content-Type, X-API-Token', 'CORS Headers')

    // 测试 2: 白名单匹配
    const env2 = createMockEnv({ ALLOWED_ORIGINS: 'https://your-single.your-domain.pages.dev' })
    const request2 = createMockRequest('http://localhost:8787', {
      method: 'OPTIONS',
      headers: { Origin: 'https://your-single.your-domain.pages.dev' },
    })
    const response2 = handleOptionsRequest(request2, env2)
    assertEqual(response2.status, 204, '204 No Content - whitelist')
    assertEqual(
      response2.headers.get('Access-Control-Allow-Origin'),
      'https://your-single.your-domain.pages.dev',
      'CORS Origin - whitelist',
    )
    assertEqual(response2.headers.get('Vary'), 'Origin', 'Vary header present')

    // 测试 3: 白名单不匹配
    const env3 = createMockEnv({ ALLOWED_ORIGINS: 'https://allowed.com' })
    const request3 = createMockRequest('http://localhost:8787', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.com' },
    })
    const response3 = handleOptionsRequest(request3, env3)
    assertEqual(response3.status, 204, '204 No Content - no match')
    assertEqual(response3.headers.get('Access-Control-Allow-Origin'), null, 'No CORS Origin - not matched')
  })
}

// ============ jsonResponse 测试 ============

async function testJsonResponse() {
  await runSuite('jsonResponse()', async () => {
    // 测试 1: 默认参数
    const response1 = jsonResponse({ key: 'value' })
    assertEqual(response1.status, 200, 'Default status 200')
    assertEqual(response1.headers.get('Content-Type'), 'application/json', 'Content-Type')
    const body1 = await response1.json()
    assertEqual(body1.code, 200, 'Default code 200')
    assertEqual(body1.data.key, 'value', 'Data passed through')
    assertEqual(body1.msg, 'success', 'Default message')

    // 测试 2: 自定义状态码和消息
    const response2 = jsonResponse({ error: 'not found' }, 404, 'Not Found')
    assertEqual(response2.status, 404, 'Custom status 404')
    const body2 = await response2.json()
    assertEqual(body2.code, 404, 'Custom code 404')
    assertEqual(body2.msg, 'Not Found', 'Custom message')

    // 测试 3: 额外 headers
    const response3 = jsonResponse({ data: 'test' }, 200, 'success', {
      'X-Custom-Header': 'custom-value',
      'X-Another': 'another-value',
    })
    assertEqual(response3.headers.get('X-Custom-Header'), 'custom-value', 'Custom header 1')
    assertEqual(response3.headers.get('X-Another'), 'another-value', 'Custom header 2')
    assertEqual(response3.headers.get('Content-Type'), 'application/json', 'Content-Type preserved')

    // 测试 4: null 数据
    const response4 = jsonResponse(null, 200, 'success')
    const body4 = await response4.json()
    assertEqual(body4.data, null, 'Null data')
  })
}

// ============ rateLimitExceededResponse 测试 ============

async function testRateLimitExceededResponse() {
  await runSuite('rateLimitExceededResponse()', async () => {
    // 测试 1: 默认参数
    const response1 = rateLimitExceededResponse()
    assertEqual(response1.status, 429, '429 Too Many Requests')
    assertEqual(response1.headers.get('Content-Type'), 'application/json', 'Content-Type')
    assertEqual(response1.headers.get('Retry-After'), '60', 'Retry-After header')
    const body1 = await response1.json()
    assertEqual(body1.code, 429, 'Code 429')
    assertEqual(body1.msg, 'Too many requests. Please try again later.', 'Error message')

    // 测试 2: 额外 headers
    const response2 = rateLimitExceededResponse({
      'X-Custom': 'value',
    })
    assertEqual(response2.headers.get('X-Custom'), 'value', 'Custom header')
    assertEqual(response2.headers.get('Retry-After'), '60', 'Retry-After preserved')
  })
}

// ============ rateLimiter 测试 ============

async function testRateLimiter() {
  await runSuite('rateLimiter()', async () => {
    // 注意：限流器使用全局 Map，测试之间会相互影响
    // 这里只做基本功能测试

    // 测试 1: 首次请求应该允许
    const request1 = createMockRequest('http://localhost:8787', {
      headers: { 'CF-Connecting-IP': '192.168.1.100' },
    })
    const result1 = rateLimiter(request1)
    assertEqual(result1.allowed, true, 'First request allowed')
    assertEqual(result1.remaining, 9, 'Remaining 9 after first request (max 10)')

    // 测试 2: 不同 IP 应该独立计数
    const request2 = createMockRequest('http://localhost:8787', {
      headers: { 'CF-Connecting-IP': '192.168.1.101' },
    })
    const result2 = rateLimiter(request2)
    assertEqual(result2.allowed, true, 'Different IP allowed')
    assertEqual(result2.remaining, 9, 'Different IP remaining 9')

    // 测试 3: 没有 CF-Connecting-IP 头
    const request3 = createMockRequest('http://localhost:8787')
    const result3 = rateLimiter(request3)
    assertEqual(result3.allowed, true, 'No IP header still allowed')
  })
}

// ============ rateLimitHeaders 测试 ============

async function testRateLimitHeaders() {
  await runSuite('rateLimitHeaders()', async () => {
    const headers = rateLimitHeaders({ allowed: true, remaining: 5 })
    assertEqual(headers['X-RateLimit-Limit'], '10', 'Limit header')
    assertEqual(headers['X-RateLimit-Remaining'], '5', 'Remaining header')
    assertEqual(headers['X-RateLimit-Window'], '60s', 'Window header')
  })
}

// ============ fetchWithTimeout 测试 ============

async function testFetchWithTimeout() {
  await runSuite('fetchWithTimeout()', async () => {
    // 测试 1: 正常请求（访问一个已知会响应的地址）
    try {
      const response = await fetchWithTimeout('https://httpbin.org/get', {}, 5000)
      assert(response instanceof Response, 'Returns Response object')
      assertEqual(response.ok, true, 'Response is OK')
    } catch (_e) {
      // 网络问题跳过此测试
      console.log('  ⊘ Skipping network test (unreachable)')
    }

    // 测试 2: 超时测试（访问一个不存在的地址）
    try {
      await fetchWithTimeout('http://10.255.255.1/test', {}, 100)
      assert(false, 'Should have timed out')
    } catch (_e) {
      assert(_e.message.includes('timeout') || _e.name === 'AbortError', 'Timeout throws error')
    }
  })
}

// ============ 导出测试运行器 ============

export async function runHelperTests() {
  await testCleanDomain()
  await testGetCorsHeaders()
  await testHandleOptionsRequest()
  await testJsonResponse()
  await testRateLimitExceededResponse()
  await testRateLimiter()
  await testRateLimitHeaders()
  await testFetchWithTimeout()
}
