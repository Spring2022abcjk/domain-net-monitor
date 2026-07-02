// tests/integration/domains.test.js

import { assert, assertEqual, runSuite } from '../test-runner.js'
import { handleDomains } from '../../src/routes/admin/domains.js'
import { isValidAdminToken } from '../../src/middleware/auth.js'

/**
 * 创建 Mock KV 存储
 */
function createMockKV() {
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
  }
}

/**
 * 创建 Mock Env
 */
function createMockEnv(overrides = {}) {
  return {
    DOMAIN_MONITOR_KV: createMockKV(),
    CLOUDFLARE_API_TOKEN: 'test_secret_token_123',
    ALLOWED_ORIGINS: '*',
    ...overrides,
  }
}

/**
 * 创建 Mock Request
 */
function createMockRequest(url, method = 'GET', body = null, headers = {}) {
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

// ============================================================
// GET /api/admin/domains Tests
// ============================================================

async function runGetDomainsTests() {
  await runSuite('GET /api/admin/domains - Empty List', async () => {
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/domains', 'GET', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await handleDomains(request, env)
    assertEqual(response.status, 200, 'Status is 200')

    const body = await response.json()
    assertEqual(body.data.domains.length, 0, 'Empty domains array')
    assertEqual(body.data.count, 0, 'Count is 0')
  })

  await runSuite('GET /api/admin/domains - With Data', async () => {
    const env = createMockEnv()
    const kv = env.DOMAIN_MONITOR_KV
    await kv.put('domain_list', JSON.stringify(['cloudflare.com', 'google.com']))

    const request = createMockRequest('http://localhost:8787/api/admin/domains', 'GET', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await handleDomains(request, env)
    const body = await response.json()

    assertEqual(body.data.domains.length, 2, 'Two domains')
    assertEqual(body.data.domains[0], 'cloudflare.com', 'First domain')
    assertEqual(body.data.domains[1], 'google.com', 'Second domain')
    assertEqual(body.data.count, 2, 'Count is 2')
  })

  await runSuite('GET /api/admin/domains - No Token', async () => {
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/domains', 'GET')

    const valid = isValidAdminToken(request, env)
    assert(valid === false, 'No token returns false')
  })
}

// ============================================================
// POST /api/admin/domains Tests
// ============================================================

async function runAddDomainTests() {
  await runSuite('POST /api/admin/domains - Add New Domain', async () => {
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/domains',
      'POST',
      {
        domain: 'example.com',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await handleDomains(request, env)
    assertEqual(response.status, 200, 'Status is 200')

    const body = await response.json()
    assert(body.data.success === true, 'Success is true')
    assertEqual(body.data.domain, 'example.com', 'Domain returned')

    // Verify domain was added
    const listData = await env.DOMAIN_MONITOR_KV.get('domain_list')
    const list = JSON.parse(listData)
    assert(list.includes('example.com'), 'Domain in list')
  })

  await runSuite('POST /api/admin/domains - Duplicate Domain', async () => {
    const env = createMockEnv()
    const kv = env.DOMAIN_MONITOR_KV
    await kv.put('domain_list', JSON.stringify(['example.com']))

    const request = createMockRequest(
      'http://localhost:8787/api/admin/domains',
      'POST',
      {
        domain: 'example.com',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await handleDomains(request, env)
    assertEqual(response.status, 409, 'Status is 409')

    const body = await response.json()
    assertEqual(body.msg, 'Domain already exists', 'Error message')
  })

  await runSuite('POST /api/admin/domains - Invalid Domain', async () => {
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/domains',
      'POST',
      {
        domain: 'not-a-valid-domain!',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await handleDomains(request, env)
    assertEqual(response.status, 400, 'Status is 400')

    const body = await response.json()
    assertEqual(body.msg, 'Invalid domain format', 'Error message')
  })

  await runSuite('POST /api/admin/domains - Domain with Protocol', async () => {
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/domains',
      'POST',
      {
        domain: 'https://example.com',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await handleDomains(request, env)
    assertEqual(response.status, 200, 'Status is 200')

    const body = await response.json()
    assertEqual(body.data.domain, 'example.com', 'Protocol stripped')
  })

  await runSuite('POST /api/admin/domains - Domain with Port', async () => {
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/domains',
      'POST',
      {
        domain: 'example.com:8080',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await handleDomains(request, env)
    assertEqual(response.status, 200, 'Status is 200')

    const body = await response.json()
    assertEqual(body.data.domain, 'example.com', 'Port stripped')
  })

  await runSuite('POST /api/admin/domains - No Token', async () => {
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/domains', 'POST', {
      domain: 'example.com',
    })

    const valid = isValidAdminToken(request, env)
    assert(valid === false, 'No token returns false')
  })
}

// ============================================================
// DELETE /api/admin/domains/:domain Tests
// ============================================================

async function runDeleteDomainTests() {
  await runSuite('DELETE /api/admin/domains/:domain - Success', async () => {
    const env = createMockEnv()
    const kv = env.DOMAIN_MONITOR_KV
    await kv.put('domain_list', JSON.stringify(['example.com', 'cloudflare.com']))

    const request = createMockRequest('http://localhost:8787/api/admin/domains/example.com', 'DELETE', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await handleDomains(request, env)
    assertEqual(response.status, 200, 'Status is 200')

    const body = await response.json()
    assert(body.data.success === true, 'Success is true')
    assertEqual(body.data.domain, 'example.com', 'Domain returned')

    // Verify domain was removed
    const listData = await kv.get('domain_list')
    const list = JSON.parse(listData)
    assert(!list.includes('example.com'), 'Domain removed from list')
    assert(list.includes('cloudflare.com'), 'Other domain still exists')
  })

  await runSuite('DELETE /api/admin/domains/:domain - Not Found', async () => {
    const env = createMockEnv()
    const kv = env.DOMAIN_MONITOR_KV
    await kv.put('domain_list', JSON.stringify(['cloudflare.com']))

    const request = createMockRequest('http://localhost:8787/api/admin/domains/nonexistent.com', 'DELETE', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await handleDomains(request, env)
    assertEqual(response.status, 404, 'Status is 404')

    const body = await response.json()
    assertEqual(body.msg, 'Domain not found', 'Error message')
  })

  await runSuite('DELETE /api/admin/domains/:domain - No Token', async () => {
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/domains/example.com', 'DELETE')

    const valid = isValidAdminToken(request, env)
    assert(valid === false, 'No token returns false')
  })

  await runSuite('DELETE /api/admin/domains/:domain - Invalid Domain Format', async () => {
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/domains/invalid!', 'DELETE', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await handleDomains(request, env)
    assertEqual(response.status, 400, 'Status is 400')

    const body = await response.json()
    assertEqual(body.msg, 'Invalid domain format', 'Error message')
  })
}

// ============================================================
// POST /api/admin/domains/:domain/default Tests
// ============================================================

async function runSetDefaultDomainTests() {
  await runSuite('POST /api/admin/domains/:domain/default - Success', async () => {
    const env = createMockEnv()
    const kv = env.DOMAIN_MONITOR_KV
    await kv.put('domain_list', JSON.stringify(['cloudflare.com', 'google.com']))

    const request = createMockRequest('http://localhost:8787/api/admin/domains/cloudflare.com/default', 'POST', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await handleDomains(request, env)
    assertEqual(response.status, 200, 'Status is 200')

    const body = await response.json()
    assert(body.data.success === true, 'Success is true')
    assertEqual(body.data.domain, 'cloudflare.com', 'Domain returned')

    // Verify domain was added to defaults
    const defaultsData = await kv.get('default_domains')
    const defaults = JSON.parse(defaultsData)
    assert(defaults.includes('cloudflare.com'), 'Domain in defaults')
  })

  await runSuite('POST /api/admin/domains/:domain/default - Not in List', async () => {
    const env = createMockEnv()
    const kv = env.DOMAIN_MONITOR_KV
    await kv.put('domain_list', JSON.stringify(['cloudflare.com']))

    const request = createMockRequest('http://localhost:8787/api/admin/domains/nonexistent.com/default', 'POST', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await handleDomains(request, env)
    assertEqual(response.status, 404, 'Status is 404')

    const body = await response.json()
    assertEqual(body.msg, 'Domain not in list', 'Error message')
  })

  await runSuite('POST /api/admin/domains/:domain/default - Idempotent', async () => {
    const env = createMockEnv()
    const kv = env.DOMAIN_MONITOR_KV
    await kv.put('domain_list', JSON.stringify(['cloudflare.com']))
    await kv.put('default_domains', JSON.stringify(['cloudflare.com']))

    const request = createMockRequest('http://localhost:8787/api/admin/domains/cloudflare.com/default', 'POST', null, {
      'X-API-Token': 'test_secret_token_123',
    })

    const response = await handleDomains(request, env)
    assertEqual(response.status, 200, 'Status is 200')

    // Verify no duplicate
    const defaultsData = await kv.get('default_domains')
    const defaults = JSON.parse(defaultsData)
    const count = defaults.filter((d) => d === 'cloudflare.com').length
    assertEqual(count, 1, 'No duplicate')
  })

  await runSuite('POST /api/admin/domains/:domain/default - No Token', async () => {
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/domains/cloudflare.com/default', 'POST')

    const valid = isValidAdminToken(request, env)
    assert(valid === false, 'No token returns false')
  })
}

// ============================================================
// DELETE /api/admin/domains/:domain/default Tests
// ============================================================

async function runRemoveDefaultDomainTests() {
  await runSuite('DELETE /api/admin/domains/:domain/default - Success', async () => {
    const env = createMockEnv()
    const kv = env.DOMAIN_MONITOR_KV
    await kv.put('domain_list', JSON.stringify(['cloudflare.com']))
    await kv.put('default_domains', JSON.stringify(['cloudflare.com', 'google.com']))

    const request = createMockRequest(
      'http://localhost:8787/api/admin/domains/cloudflare.com/default',
      'DELETE',
      null,
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await handleDomains(request, env)
    assertEqual(response.status, 200, 'Status is 200')

    const body = await response.json()
    assert(body.data.success === true, 'Success is true')
    assertEqual(body.data.domain, 'cloudflare.com', 'Domain returned')

    // Verify domain was removed from defaults
    const defaultsData = await kv.get('default_domains')
    const defaults = JSON.parse(defaultsData)
    assert(!defaults.includes('cloudflare.com'), 'Domain removed from defaults')
    assert(defaults.includes('google.com'), 'Other domain still exists')
  })

  await runSuite('DELETE /api/admin/domains/:domain/default - Not in Defaults', async () => {
    const env = createMockEnv()
    const kv = env.DOMAIN_MONITOR_KV
    await kv.put('domain_list', JSON.stringify(['cloudflare.com']))
    await kv.put('default_domains', JSON.stringify(['google.com']))

    const request = createMockRequest(
      'http://localhost:8787/api/admin/domains/cloudflare.com/default',
      'DELETE',
      null,
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await handleDomains(request, env)
    assertEqual(response.status, 404, 'Status is 404')

    const body = await response.json()
    assertEqual(body.msg, 'Domain not in default list', 'Error message')
  })

  await runSuite('DELETE /api/admin/domains/:domain/default - No Token', async () => {
    const env = createMockEnv()
    const request = createMockRequest('http://localhost:8787/api/admin/domains/cloudflare.com/default', 'DELETE')

    const valid = isValidAdminToken(request, env)
    assert(valid === false, 'No token returns false')
  })

  await runSuite('DELETE /api/admin/domains/:domain/default - Idempotent', async () => {
    const env = createMockEnv()
    const kv = env.DOMAIN_MONITOR_KV
    await kv.put('domain_list', JSON.stringify(['cloudflare.com']))
    await kv.put('default_domains', JSON.stringify(['google.com']))

    // First delete (already not in list)
    const request1 = createMockRequest(
      'http://localhost:8787/api/admin/domains/cloudflare.com/default',
      'DELETE',
      null,
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )
    const response1 = await handleDomains(request1, env)
    assertEqual(response1.status, 404, 'First delete returns 404')

    // Second delete (same result)
    const request2 = createMockRequest(
      'http://localhost:8787/api/admin/domains/cloudflare.com/default',
      'DELETE',
      null,
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )
    const response2 = await handleDomains(request2, env)
    assertEqual(response2.status, 404, 'Second delete returns 404')
  })
}

// ============================================================
// Edge Cases Tests
// ============================================================

async function runEdgeCasesTests() {
  await runSuite('Edge Cases - Subdomain Handling', async () => {
    const env = createMockEnv()
    const request = createMockRequest(
      'http://localhost:8787/api/admin/domains',
      'POST',
      {
        domain: 'www.example.com',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )

    const response = await handleDomains(request, env)
    assertEqual(response.status, 200, 'Status is 200')

    const body = await response.json()
    assertEqual(body.data.domain, 'www.example.com', 'Subdomain preserved')
  })

  await runSuite('Edge Cases - Case Insensitive', async () => {
    const env = createMockEnv()

    // Add domain with uppercase
    const request1 = createMockRequest(
      'http://localhost:8787/api/admin/domains',
      'POST',
      {
        domain: 'EXAMPLE.COM',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )
    await handleDomains(request1, env)

    // Try to add same domain with lowercase
    const request2 = createMockRequest(
      'http://localhost:8787/api/admin/domains',
      'POST',
      {
        domain: 'example.com',
      },
      {
        'X-API-Token': 'test_secret_token_123',
      },
    )
    const response2 = await handleDomains(request2, env)
    assertEqual(response2.status, 409, 'Duplicate detected (case insensitive)')
  })
}

// ============================================================
// Main Test Runner
// ============================================================

export async function runDomainsIntegrationTests() {
  console.log('\n=== Domains API Integration Tests ===\n')

  await runGetDomainsTests()
  await runAddDomainTests()
  await runDeleteDomainTests()
  await runSetDefaultDomainTests()
  await runRemoveDefaultDomainTests()
  await runEdgeCasesTests()

  console.log('\n=== Domains API Tests Complete ===\n')
}
