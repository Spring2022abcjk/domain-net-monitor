// tests/integration/doh.test.js

import { createMockRequest, createMockEnv, assert, assertEqual } from '../support/test-helpers.js'
import { runSuite } from '../test-runner.js'

/**
 * DoH 配置 API 集成测试
 */
export async function runDohTests() {
  // ========== GET /api/admin/doh ==========
  await runSuite('GET /api/admin/doh - Success', async () => {
    const { getDohConfig } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/doh', 'GET', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await getDohConfig(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assert(body.data.primary, 'Primary DoH exists')
    assert(body.data.backup, 'Backup DoH exists')
  })

  await runSuite('GET /api/admin/doh - No Token', async () => {
    const { getDohConfig } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/doh', 'GET', null, {})

    const response = await getDohConfig(request, env)

    assertEqual(response.status, 401, 'Returns 401')
  })

  // ========== PUT /api/admin/doh - Success ==========
  await runSuite('PUT /api/admin/doh - Success', async () => {
    const { updateDohConfig } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh',
      'PUT',
      {
        primary: 'https://dns.google/resolve',
        backup: 'https://cloudflare-dns.com/dns-query',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await updateDohConfig(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.primary, 'https://dns.google/resolve', 'Primary updated')
    assertEqual(body.data.backup, 'https://cloudflare-dns.com/dns-query', 'Backup updated')
  })

  await runSuite('PUT /api/admin/doh - Partial Update (primary only)', async () => {
    const { updateDohConfig } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh',
      'PUT',
      {
        primary: 'https://dns.adguard.com/dns-query',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await updateDohConfig(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.primary, 'https://dns.adguard.com/dns-query', 'Primary updated')
  })

  await runSuite('PUT /api/admin/doh - Partial Update (backup only)', async () => {
    const { updateDohConfig } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh',
      'PUT',
      {
        backup: 'https://dns.quad9.net/dns-query',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await updateDohConfig(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.backup, 'https://dns.quad9.net/dns-query', 'Backup updated')
  })

  // ========== PUT /api/admin/doh - Invalid URL ==========
  await runSuite('PUT /api/admin/doh - Invalid Primary URL', async () => {
    const { updateDohConfig } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh',
      'PUT',
      {
        primary: 'invalid-url',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await updateDohConfig(request, env)

    assertEqual(response.status, 400, 'Returns 400')
  })

  await runSuite('PUT /api/admin/doh - Invalid Backup URL', async () => {
    const { updateDohConfig } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh',
      'PUT',
      {
        backup: 'http://invalid.com',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await updateDohConfig(request, env)

    assertEqual(response.status, 400, 'Returns 400')
  })

  await runSuite('PUT /api/admin/doh - No Token', async () => {
    const { updateDohConfig } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh',
      'PUT',
      {
        primary: 'https://valid.com',
      },
      {},
    )

    const response = await updateDohConfig(request, env)

    assertEqual(response.status, 401, 'Returns 401')
  })

  await runSuite('PUT /api/admin/doh - Empty Body', async () => {
    const { updateDohConfig } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh',
      'PUT',
      {},
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await updateDohConfig(request, env)

    assertEqual(response.status, 400, 'Returns 400')
  })

  // ========== POST /api/admin/doh/test - Success ==========
  await runSuite('POST /api/admin/doh/test - Cloudflare', async () => {
    const { testDohEndpoint } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh/test',
      'POST',
      {
        url: 'https://cloudflare-dns.com/dns-query',
        timeout: 5000,
      },
      { 'X-API-Token': 'test_secret_token_123' },
    )

    const response = await testDohEndpoint(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.url, 'https://cloudflare-dns.com/dns-query', 'URL matches')
    assert(body.data.latency >= 0, 'Latency is non-negative')
  })

  await runSuite('POST /api/admin/doh/test - Google', async () => {
    const { testDohEndpoint } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh/test',
      'POST',
      {
        url: 'https://dns.google/resolve',
        timeout: 5000,
      },
      { 'X-API-Token': 'test_secret_token_123' },
    )

    const response = await testDohEndpoint(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Returns 200')
    assertEqual(body.data.url, 'https://dns.google/resolve', 'URL matches')
  })

  // ========== POST /api/admin/doh/test - Invalid URL ==========
  await runSuite('POST /api/admin/doh/test - Invalid URL', async () => {
    const { testDohEndpoint } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh/test',
      'POST',
      { url: 'invalid-url' },
      { 'X-API-Token': 'test_secret_token_123' },
    )

    const response = await testDohEndpoint(request, env)

    assertEqual(response.status, 400, 'Returns 400')
  })

  await runSuite('POST /api/admin/doh/test - Missing URL', async () => {
    const { testDohEndpoint } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh/test',
      'POST',
      { timeout: 5000 },
      { 'X-API-Token': 'test_secret_token_123' },
    )

    const response = await testDohEndpoint(request, env)

    assertEqual(response.status, 400, 'Returns 400')
  })

  await runSuite('POST /api/admin/doh/test - HTTP URL (not HTTPS)', async () => {
    const { testDohEndpoint } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh/test',
      'POST',
      { url: 'http://invalid.com' },
      { 'X-API-Token': 'test_secret_token_123' },
    )

    const response = await testDohEndpoint(request, env)

    assertEqual(response.status, 400, 'Returns 400')
  })

  // ========== POST /api/admin/doh/test - No Token ==========
  await runSuite('POST /api/admin/doh/test - No Token', async () => {
    const { testDohEndpoint } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh/test',
      'POST',
      { url: 'https://cloudflare-dns.com/dns-query' },
      {},
    )

    const response = await testDohEndpoint(request, env)

    assertEqual(response.status, 401, 'Returns 401')
  })

  // ========== POST /api/admin/doh/test - Timeout ==========
  await runSuite('POST /api/admin/doh/test - Invalid Domain Timeout', async () => {
    const { testDohEndpoint } = await import('../../src/routes/admin/doh.js')
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/doh/test',
      'POST',
      {
        url: 'https://invalid-domain-that-does-not-exist.example',
        timeout: 500,
      },
      { 'X-API-Token': 'test_secret_token_123' },
    )

    const response = await testDohEndpoint(request, env)
    const body = await response.json()

    assertEqual(body.data.success, false, 'Success is false')
    assert(body.data.message.includes('timeout') || body.data.latency <= 2000, 'Timeout handled')
  })
}

// 导出给测试索引使用
export { runDohTests as runIntegrationTests }
