// tests/integration/stats.test.js

import assert from 'node:assert/strict'
import { runSuite } from '../test-runner.js'
import { createMockRequest, createMockEnv, assertEqual } from '../support/test-helpers.js'

/**
 * Stats API 集成测试
 */
export async function runStatsTests() {
  // ========== GET /api/admin/stats - Success ==========
  await runSuite('GET /api/admin/stats - Success', async () => {
    const { getStatsRoute } = await import('../../src/routes/admin/stats.js')
    const env = createMockEnv()

    // Mock some data
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify(['a.com', 'b.com', 'c.com']))
    await env.DOMAIN_MONITOR_KV.put('default_domains', JSON.stringify(['a.com']))
    await env.DOMAIN_MONITOR_KV.put(
      'history:example.com',
      JSON.stringify([{ domain: 'example.com', timestamp: Date.now(), overall: 'ok' }]),
    )
    await env.DOMAIN_MONITOR_KV.put(
      'result:test.com',
      JSON.stringify({
        domain: 'test.com',
        overall: 'ok',
      }),
    )

    const request = createMockRequest('http://localhost:8787/api/admin/stats', 'GET', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await getStatsRoute(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assert(body.data.overview, 'Overview exists')
    assertEqual(body.data.overview.totalDomains, 3, 'Total domains correct')
    assertEqual(body.data.overview.defaultDomains, 1, 'Default domains correct')
    assert(body.data.today, 'Today stats exists')
    assert(body.data.config, 'Config exists')
  })

  // ========== GET /api/admin/stats - No Token ==========
  await runSuite('GET /api/admin/stats - No Token', async () => {
    const { getStatsRoute } = await import('../../src/routes/admin/stats.js')
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/stats', 'GET', null, {})

    const response = await getStatsRoute(request, env)

    assertEqual(response.status, 401, 'Returns 401')
  })

  // ========== GET /api/admin/stats - Empty Data ==========
  await runSuite('GET /api/admin/stats - Empty Data', async () => {
    const { getStatsRoute } = await import('../../src/routes/admin/stats.js')
    const env = createMockEnv()

    const request = createMockRequest('http://localhost:8787/api/admin/stats', 'GET', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await getStatsRoute(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.overview.totalDomains, 0, 'Zero total domains')
    assertEqual(body.data.overview.defaultDomains, 0, 'Zero default domains')
    assertEqual(body.data.overview.historyDomains, 0, 'Zero history domains')
    assertEqual(body.data.overview.cachedResults, 0, 'Zero cached results')
  })

  // ========== GET /api/admin/stats - Rate Limit Rate Calculation ==========
  await runSuite('GET /api/admin/stats - Rate Limit Rate', async () => {
    const { getStatsRoute } = await import('../../src/routes/admin/stats.js')
    const env = createMockEnv()

    // Mock stats with requests and rate limit hits
    await env.DOMAIN_MONITOR_KV.put(
      'stats',
      JSON.stringify({
        todayRequests: 100,
        rateLimitHits: 5,
        lastReset: Date.now(),
      }),
    )

    const request = createMockRequest('http://localhost:8787/api/admin/stats', 'GET', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await getStatsRoute(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.today.requests, 100, 'Requests count correct')
    assertEqual(body.data.today.rateLimitHits, 5, 'Rate limit hits correct')
    assertEqual(body.data.today.rateLimitRate, '5.00%', 'Rate limit rate calculated')
  })

  // ========== GET /api/admin/stats - Zero Rate Limit Rate ==========
  await runSuite('GET /api/admin/stats - Zero Rate Limit Rate', async () => {
    const { getStatsRoute } = await import('../../src/routes/admin/stats.js')
    const env = createMockEnv()

    await env.DOMAIN_MONITOR_KV.put(
      'stats',
      JSON.stringify({
        todayRequests: 0,
        rateLimitHits: 0,
        lastReset: Date.now(),
      }),
    )

    const request = createMockRequest('http://localhost:8787/api/admin/stats', 'GET', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await getStatsRoute(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.today.rateLimitRate, '0%', 'Zero rate limit rate is 0%')
  })

  // ========== GET /api/admin/stats - Config Present ==========
  await runSuite('GET /api/admin/stats - Config Present', async () => {
    const { getStatsRoute } = await import('../../src/routes/admin/stats.js')
    const env = createMockEnv()

    const request = createMockRequest('http://localhost:8787/api/admin/stats', 'GET', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await getStatsRoute(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assert(body.data.config, 'Config exists')
    assert(typeof body.data.config.refreshInterval === 'number', 'Refresh interval is number')
    assert(typeof body.data.config.refreshIntervalHuman === 'string', 'Refresh interval human is string')
    assert(typeof body.data.config.historyRetention === 'number', 'History retention is number')
    assert(body.data.config.rateLimit, 'Rate limit config exists')
    assert(typeof body.data.config.rateLimit.windowMs === 'number', 'Window ms is number')
    assert(typeof body.data.config.rateLimit.maxRequests === 'number', 'Max requests is number')
  })

  // ========== GET /api/admin/stats - Last Reset ISO Format ==========
  await runSuite('GET /api/admin/stats - Last Reset ISO Format', async () => {
    const { getStatsRoute } = await import('../../src/routes/admin/stats.js')
    const env = createMockEnv()

    const request = createMockRequest('http://localhost:8787/api/admin/stats', 'GET', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await getStatsRoute(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assert(typeof body.data.lastReset === 'string', 'Last reset is string')
    assert(body.data.lastReset.includes('T'), 'ISO format contains T separator')
    assert(body.data.lastReset.endsWith('Z') || body.data.lastReset.includes('+'), 'ISO format timezone')
  })

  // ========== GET /api/admin/stats - KV Error Handling ==========
  await runSuite('GET /api/admin/stats - KV Error', async () => {
    const { getStatsRoute } = await import('../../src/routes/admin/stats.js')
    const env = createMockEnv()

    // Mock KV that throws error
    env.DOMAIN_MONITOR_KV.get = async () => {
      throw new Error('KV operation failed')
    }

    const request = createMockRequest('http://localhost:8787/api/admin/stats', 'GET', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await getStatsRoute(request, env)
    const body = await response.json()

    assertEqual(response.status, 500, 'Returns 500 on error')
    assert(body.data === null, 'Data is null')
    assert(body.msg.includes('failed'), 'Error message contains failure info')
  })

  // ========== GET /api/admin/stats - Duration Formatting ==========
  await runSuite('GET /api/admin/stats - Duration Formatting', async () => {
    const { getStatsRoute } = await import('../../src/routes/admin/stats.js')
    const env = createMockEnv()

    // 设置一个较大的 refreshInterval 来测试格式化
    await env.DOMAIN_MONITOR_KV.put(
      'config',
      JSON.stringify({
        defaultRefreshInterval: 86400, // 1 day
        rateLimit: { windowMs: 60000, maxRequests: 10 },
        historyRetention: 7,
      }),
    )

    const request = createMockRequest('http://localhost:8787/api/admin/stats', 'GET', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await getStatsRoute(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.config.refreshIntervalHuman, '1.0 days', 'Duration formatted as days')
  })
}

export { runStatsTests as runIntegrationTests }
