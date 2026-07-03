#!/usr/bin/env node

/**
 * CORS 集成测试
 * 测试完整的 CORS 流程和边界场景
 */

import { getCorsHeaders, handleOptionsRequest } from '../../src/utils/helper.js'
import { assertEqual, runSuite } from '../test-runner.js'

/**
 * 创建 Mock Request
 */
function createMockRequest(url = 'http://localhost:8787', options = {}) {
  return new Request(url, options)
}

/**
 * 创建 Mock Env
 */
function createMockEnv(overrides = {}) {
  return {
    ALLOWED_ORIGINS: '*',
    CLOUDFLARE_API_TOKEN: 'test_token',
    ...overrides,
  }
}

// ============ CORS 白名单场景测试 ============

async function testCorsWhitelistScenarios() {
  await runSuite('CORS whitelist scenarios', async () => {
    // 场景 1: 生产环境 - 单域名白名单
    const env1 = createMockEnv({ ALLOWED_ORIGINS: 'https://your-single.your-domain.pages.dev' })
    const req1 = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://your-single.your-domain.pages.dev' },
    })
    const headers1 = getCorsHeaders(req1, env1)
    assertEqual(
      headers1['Access-Control-Allow-Origin'],
      'https://your-single.your-domain.pages.dev',
      'Prod single domain - match',
    )
    assertEqual(headers1['Vary'], 'Origin', 'Prod single domain - Vary header')

    // 场景 2: 生产环境 - 多域名白名单
    const env2 = createMockEnv({
      ALLOWED_ORIGINS:
        'https://your-single.your-domain.pages.dev,https://dev.your-domain.pages.dev,https://staging.your-domain.pages.dev',
    })

    const req2a = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://dev.your-domain.pages.dev' },
    })
    const headers2a = getCorsHeaders(req2a, env2)
    assertEqual(
      headers2a['Access-Control-Allow-Origin'],
      'https://dev.your-domain.pages.dev',
      'Multi domain - match dev',
    )

    const req2b = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://staging.your-domain.pages.dev' },
    })
    const headers2b = getCorsHeaders(req2b, env2)
    assertEqual(
      headers2b['Access-Control-Allow-Origin'],
      'https://staging.your-domain.pages.dev',
      'Multi domain - match staging',
    )

    const req2c = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://evil.com' },
    })
    const headers2c = getCorsHeaders(req2c, env2)
    assertEqual(Object.keys(headers2c).length, 0, 'Multi domain - reject evil')

    // 场景 3: 开发环境 - 允许所有
    const env3 = createMockEnv({ ALLOWED_ORIGINS: '*' })
    const req3 = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'http://localhost:3000' },
    })
    const headers3 = getCorsHeaders(req3, env3)
    assertEqual(headers3['Access-Control-Allow-Origin'], '*', 'Dev mode - allow all')

    // 场景 4: 白名单有空格
    const env4 = createMockEnv({ ALLOWED_ORIGINS: 'https://a.com , https://b.com , https://c.com' })
    const req4 = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://b.com' },
    })
    const headers4 = getCorsHeaders(req4, env4)
    assertEqual(headers4['Access-Control-Allow-Origin'], 'https://b.com', 'Whitespace trimmed')
  })
}

// ============ CORS 边界场景测试 ============

async function testCorsEdgeCases() {
  await runSuite('CORS edge cases', async () => {
    // 边界 1: Origin 头为空字符串
    const env1 = createMockEnv({ ALLOWED_ORIGINS: 'https://allowed.com' })
    const req1 = createMockRequest('http://localhost:8787', {
      headers: { Origin: '' },
    })
    const headers1 = getCorsHeaders(req1, env1)
    assertEqual(Object.keys(headers1).length, 0, 'Empty Origin string rejected')

    // 边界 2: ALLOWED_ORIGINS 为空字符串（会降级为 *）
    const env2 = createMockEnv({ ALLOWED_ORIGINS: '' })
    const req2 = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://any.com' },
    })
    const headers2 = getCorsHeaders(req2, env2)
    // 空字符串会被 || '*' 处理，变成通配符模式
    assertEqual(headers2['Access-Control-Allow-Origin'], '*', 'Empty ALLOWED_ORIGINS defaults to wildcard')

    // 边界 3: case sensitive 测试
    const env3 = createMockEnv({ ALLOWED_ORIGINS: 'https://Example.com' })
    const req3 = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://example.com' },
    })
    const headers3 = getCorsHeaders(req3, env3)
    assertEqual(Object.keys(headers3).length, 0, 'Case sensitive matching')

    // 边界 4: 带端口的 Origin
    const env4 = createMockEnv({ ALLOWED_ORIGINS: 'http://localhost:3000' })
    const req4 = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'http://localhost:3000' },
    })
    const headers4 = getCorsHeaders(req4, env4)
    assertEqual(headers4['Access-Control-Allow-Origin'], 'http://localhost:3000', 'Origin with port')

    // 边界 5: subdomain 不自动匹配
    const env5 = createMockEnv({ ALLOWED_ORIGINS: 'https://example.com' })
    const req5 = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://sub.example.com' },
    })
    const headers5 = getCorsHeaders(req5, env5)
    assertEqual(Object.keys(headers5).length, 0, 'Subdomain not auto-matched')
  })
}

// ============ OPTIONS 预检响应测试 ============

async function testOptionsPreflight() {
  await runSuite('OPTIONS preflight responses', async () => {
    // 测试 1: OPTIONS 请求 - 通配符
    const env1 = createMockEnv({ ALLOWED_ORIGINS: '*' })
    const req1 = createMockRequest('http://localhost:8787', {
      method: 'OPTIONS',
      headers: { Origin: 'https://any.com' },
    })
    const response1 = handleOptionsRequest(req1, env1)
    assertEqual(response1.status, 204, 'OPTIONS wildcard - 204')
    assertEqual(response1.headers.get('Access-Control-Allow-Origin'), '*', 'OPTIONS wildcard - origin')
    assertEqual(
      response1.headers.get('Access-Control-Allow-Methods'),
      'GET, POST, PUT, DELETE, OPTIONS',
      'OPTIONS wildcard - methods',
    )
    assertEqual(
      response1.headers.get('Access-Control-Allow-Headers'),
      'Content-Type, X-API-Token',
      'OPTIONS wildcard - headers',
    )
    assertEqual(response1.headers.get('Access-Control-Max-Age'), '86400', 'OPTIONS wildcard - max age')

    // 测试 2: OPTIONS 请求 - 白名单匹配
    const env2 = createMockEnv({ ALLOWED_ORIGINS: 'https://your-single.your-domain.pages.dev' })
    const req2 = createMockRequest('http://localhost:8787', {
      method: 'OPTIONS',
      headers: { Origin: 'https://your-single.your-domain.pages.dev' },
    })
    const response2 = handleOptionsRequest(req2, env2)
    assertEqual(
      response2.headers.get('Access-Control-Allow-Origin'),
      'https://your-single.your-domain.pages.dev',
      'OPTIONS whitelist - origin',
    )
    assertEqual(response2.headers.get('Vary'), 'Origin', 'OPTIONS whitelist - Vary')

    // 测试 3: OPTIONS 请求 - 白名单不匹配
    const env3 = createMockEnv({ ALLOWED_ORIGINS: 'https://allowed.com' })
    const req3 = createMockRequest('http://localhost:8787', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.com' },
    })
    const response3 = handleOptionsRequest(req3, env3)
    assertEqual(response3.headers.get('Access-Control-Allow-Origin'), null, 'OPTIONS no match - no origin')
  })
}

// ============ 安全场景测试 ============

async function testCorsSecurityScenarios() {
  await runSuite('CORS security scenarios', async () => {
    // 场景 1: 尝试注入恶意 Origin
    const env1 = createMockEnv({ ALLOWED_ORIGINS: 'https://allowed.com' })
    const req1 = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://evil.com,https://allowed.com' },
    })
    const headers1 = getCorsHeaders(req1, env1)
    assertEqual(Object.keys(headers1).length, 0, 'Comma injection prevented')

    // 场景 2: 尝试 null Origin（某些隐私模式会发送）
    const env2 = createMockEnv({ ALLOWED_ORIGINS: '*' })
    const req2 = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'null' },
    })
    const headers2 = getCorsHeaders(req2, env2)
    // 通配符模式下允许
    assertEqual(headers2['Access-Control-Allow-Origin'], '*', 'Null origin with wildcard')

    // 场景 3: 白名单模式下 null Origin 应该被拒绝
    const env3 = createMockEnv({ ALLOWED_ORIGINS: 'https://allowed.com' })
    const req3 = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'null' },
    })
    const headers3 = getCorsHeaders(req3, env3)
    assertEqual(Object.keys(headers3).length, 0, 'Null origin rejected in whitelist mode')
  })
}

// ============ CDN 缓存相关测试 ============

async function testCdnCaching() {
  await runSuite('CDN caching headers', async () => {
    // 测试 Vary 头是否正确设置
    const env = createMockEnv({ ALLOWED_ORIGINS: 'https://a.com,https://b.com' })

    const reqA = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://a.com' },
    })
    const headersA = getCorsHeaders(reqA, env)
    assertEqual(headersA['Vary'], 'Origin', 'Vary header for a.com')

    const reqB = createMockRequest('http://localhost:8787', {
      headers: { Origin: 'https://b.com' },
    })
    const headersB = getCorsHeaders(reqB, env)
    assertEqual(headersB['Vary'], 'Origin', 'Vary header for b.com')

    // 通配符模式下不需要 Vary
    const envWildcard = createMockEnv({ ALLOWED_ORIGINS: '*' })
    const headersWildcard = getCorsHeaders(createMockRequest(), envWildcard)
    assertEqual(headersWildcard['Vary'], undefined, 'No Vary header in wildcard mode')
  })
}

// ============ 导出测试运行器 ============

export async function runCorsIntegrationTests() {
  await testCorsWhitelistScenarios()
  await testCorsEdgeCases()
  await testOptionsPreflight()
  await testCorsSecurityScenarios()
  await testCdnCaching()
}
