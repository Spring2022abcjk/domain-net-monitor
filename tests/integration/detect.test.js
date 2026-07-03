// tests/integration/detect.test.js

import { createMockRequest, createMockEnv, assert, assertEqual } from '../support/test-helpers.js'
import { runSuite } from '../test-runner.js'

/**
 * 检测操作 API 集成测试
 */
export async function runDetectTests() {
  // ========== POST /api/admin/detect/single ==========
  await runSuite('POST /api/admin/detect/single - Cloudflare', async () => {
    const { detectSingle } = await import('../../src/routes/admin/detect.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/detect/single',
      'POST',
      { domain: 'cloudflare.com' },
      { 'X-API-Token': 'test_secret_token_123' },
    )

    const response = await detectSingle(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.domain, 'cloudflare.com', 'Domain matches')
    assert(body.data.timestamp > 0, 'Timestamp exists')
    assertEqual(body.msg, 'Detection completed', 'Message matches')
  })

  await runSuite('POST /api/admin/detect/single - Google', async () => {
    const { detectSingle } = await import('../../src/routes/admin/detect.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/detect/single',
      'POST',
      { domain: 'google.com' },
      { 'X-API-Token': 'test_secret_token_123' },
    )

    const response = await detectSingle(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.domain, 'google.com', 'Domain matches')
  })

  await runSuite('POST /api/admin/detect/single - Invalid Domain', async () => {
    const { detectSingle } = await import('../../src/routes/admin/detect.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/detect/single',
      'POST',
      { domain: '' },
      { 'X-API-Token': 'test_secret_token_123' },
    )

    const response = await detectSingle(request, env)
    const body = await response.json()

    assertEqual(response.status, 400, 'Returns 400')
    assertEqual(body.code, 400, 'Code matches')
  })

  await runSuite('POST /api/admin/detect/single - No Token', async () => {
    const { detectSingle } = await import('../../src/routes/admin/detect.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/detect/single',
      'POST',
      { domain: 'cloudflare.com' },
      {},
    )

    const response = await detectSingle(request, env)

    assertEqual(response.status, 401, 'Returns 401')
  })

  // ========== POST /api/admin/detect/all ==========
  await runSuite('POST /api/admin/detect/all - Empty List', async () => {
    const { detectAll } = await import('../../src/routes/admin/detect.js')
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/detect/all', 'POST', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await detectAll(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.total, 0, 'Total is 0')
    assertEqual(body.data.results.length, 0, 'Results empty')
    assertEqual(body.msg, 'No domains to detect', 'Message matches')
  })

  await runSuite('POST /api/admin/detect/all - With Domains', async () => {
    const { detectAll } = await import('../../src/routes/admin/detect.js')
    const env = createMockEnv()

    // Add domains to KV
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify(['cloudflare.com', 'example.com']))

    const request = createMockRequest('http://localhost:8787/api/admin/detect/all', 'POST', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await detectAll(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.total, 2, 'Total is 2')
    assert(body.data.results.length === 2, 'Two results')
    assertEqual(body.msg, 'Batch detection completed', 'Message matches')
  })

  await runSuite('POST /api/admin/detect/all - No Token', async () => {
    const { detectAll } = await import('../../src/routes/admin/detect.js')
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/detect/all', 'POST', null, {})

    const response = await detectAll(request, env)

    assertEqual(response.status, 401, 'Returns 401')
  })

  // ========== POST /api/admin/detect/default ==========
  await runSuite('POST /api/admin/detect/default - Empty List', async () => {
    const { detectDefault } = await import('../../src/routes/admin/detect.js')
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/detect/default', 'POST', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await detectDefault(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.total, 0, 'Total is 0')
    assertEqual(body.msg, 'No default domains configured', 'Message matches')
  })

  await runSuite('POST /api/admin/detect/default - With Default Domains', async () => {
    const { detectDefault } = await import('../../src/routes/admin/detect.js')
    const env = createMockEnv()

    // Add default domains to KV
    await env.DOMAIN_MONITOR_KV.put('default_domains', JSON.stringify(['cloudflare.com', 'google.com']))

    const request = createMockRequest('http://localhost:8787/api/admin/detect/default', 'POST', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await detectDefault(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.total, 2, 'Total is 2')
    assert(body.data.results.length === 2, 'Two results')
    assertEqual(body.msg, 'Default domains detection completed', 'Message matches')
  })

  await runSuite('POST /api/admin/detect/default - No Token', async () => {
    const { detectDefault } = await import('../../src/routes/admin/detect.js')
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/detect/default', 'POST', null, {})

    const response = await detectDefault(request, env)

    assertEqual(response.status, 401, 'Returns 401')
  })

  // ========== Verify results are saved to KV ==========
  await runSuite('POST /api/admin/detect/single - Result saved to KV', async () => {
    const { detectSingle } = await import('../../src/routes/admin/detect.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/detect/single',
      'POST',
      { domain: 'test-save.com' },
      { 'X-API-Token': 'test_secret_token_123' },
    )

    await detectSingle(request, env)

    // Verify result was saved
    const resultKey = 'result:test-save.com'
    const savedResult = await env.DOMAIN_MONITOR_KV.get(resultKey)
    assert(savedResult, 'Result saved to KV')

    const parsed = JSON.parse(savedResult)
    assertEqual(parsed.domain, 'test-save.com', 'Domain matches')
    assert(parsed.timestamp > 0, 'Timestamp exists')
  })

  await runSuite('POST /api/admin/detect/single - History saved to KV', async () => {
    const { detectSingle } = await import('../../src/routes/admin/detect.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/detect/single',
      'POST',
      { domain: 'test-history.com' },
      { 'X-API-Token': 'test_secret_token_123' },
    )

    await detectSingle(request, env)

    // Verify history was saved
    const historyKey = 'history:test-history.com'
    const savedHistory = await env.DOMAIN_MONITOR_KV.get(historyKey)
    assert(savedHistory, 'History saved to KV')

    const history = JSON.parse(savedHistory)
    assert(Array.isArray(history), 'History is array')
    assertEqual(history.length, 1, 'One history entry')
    assertEqual(history[0].domain, 'test-history.com', 'Domain matches')
  })

  // ========== Test historyMaxEntries configuration ==========
  await runSuite('POST /api/admin/detect/single - Respects historyMaxEntries config', async () => {
    const { detectSingle } = await import('../../src/routes/admin/detect.js')
    const { setConfig } = await import('../../src/storage/config.js')
    const env = createMockEnv()

    // Set max entries to 3
    const config = await import('../../src/storage/config.js').then((m) => m.getConfig(env))
    config.historyMaxEntries = 3
    await setConfig(env, config)

    // Detect 5 times
    for (let i = 1; i <= 5; i++) {
      const request = createMockRequest(
        'http://localhost:8787/api/admin/detect/single',
        'POST',
        { domain: 'test-limit.com' },
        { 'X-API-Token': 'test_secret_token_123' },
      )
      await detectSingle(request, env)
    }

    // Verify only 3 entries kept
    const historyKey = 'history:test-limit.com'
    const savedHistory = await env.DOMAIN_MONITOR_KV.get(historyKey)
    const history = JSON.parse(savedHistory)
    assertEqual(history.length, 3, 'Only 3 entries kept (maxEntries limit)')
  })
}

// 导出给测试索引使用
export { runDetectTests as runIntegrationTests }

// Test exports - moved inside runDetectTests
