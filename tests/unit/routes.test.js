import { handleRequest } from '../../src/routes/index.js'
import { assertEqual, runSuite } from '../test-runner.js'

// Mock KV 存储
class MockKV {
  constructor() {
    this.store = new Map()
  }

  async get(key) {
    return this.store.get(key) || null
  }

  async put(key, value) {
    this.store.set(key, value)
  }
}

function createMockEnv() {
  const kv = new MockKV()
  return { DOMAIN_MONITOR_KV: kv }
}

function createRequest(method, path, body = null, headers = {}) {
  const url = `http://localhost${path}`
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  }
  if (body) {
    options.body = JSON.stringify(body)
  }
  return new Request(url, options)
}

async function testPublicRoutes() {
  await runSuite('Public Routes', async () => {
    const env = createMockEnv()

    // GET /api/public/domains - 空列表
    let request = createRequest('GET', '/api/public/domains')
    let response = await handleRequest(request, env)
    let body = await response.json()

    assertEqual(response.status, 200, 'GET public domains status')
    assertEqual(body.code, 200, 'GET public domains code')
  })
}

async function testAdminRoutesRequireAuth() {
  await runSuite('Admin Routes Require Auth', async () => {
    const env = createMockEnv()

    // GET /api/admin/config - 无 Token 应返回 401
    let request = createRequest('GET', '/api/admin/config')
    let response = await handleRequest(request, env)
    let body = await response.json()

    assertEqual(response.status, 401, 'GET admin config without auth returns 401')
    assertEqual(body.code, 401, 'GET admin config code 401')

    // GET /api/admin/domains - 无 Token 应返回 401
    request = createRequest('GET', '/api/admin/domains')
    response = await handleRequest(request, env)
    body = await response.json()

    assertEqual(response.status, 401, 'GET admin domains without auth returns 401')
  })
}

async function testHealthCheck() {
  await runSuite('Health Check', async () => {
    const env = createMockEnv()

    const request = createRequest('GET', '/health')
    const response = await handleRequest(request, env)
    const body = await response.json()

    assertEqual(response.status, 200, 'Health check status')
    assertEqual(body.data.status, 'ok', 'Health check status ok')
  })
}

async function testNotFoundRoute() {
  await runSuite('404 Route', async () => {
    const env = createMockEnv()

    const request = createRequest('GET', '/api/unknown')
    const response = await handleRequest(request, env)
    const body = await response.json()

    assertEqual(response.status, 404, 'Unknown route status')
    assertEqual(body.code, 404, 'Unknown route code')
    assertEqual(body.msg, 'Route not found', 'Unknown route message')
  })
}

async function testLegacyRoutesReturn404() {
  await runSuite('Legacy Routes Return 404', async () => {
    const env = createMockEnv()

    // GET /api/domains - 已移除，应返回 404
    let request = createRequest('GET', '/api/domains')
    let response = await handleRequest(request, env)
    let body = await response.json()
    assertEqual(response.status, 404, 'GET /api/domains returns 404')

    // POST /api/domains/add - 已移除，应返回 404
    request = createRequest('POST', '/api/domains/add', { domain: 'test.com' })
    response = await handleRequest(request, env)
    body = await response.json()
    assertEqual(response.status, 404, 'POST /api/domains/add returns 404')

    // POST /api/detect/single - 已移除，应返回 404
    request = createRequest('POST', '/api/detect/single', { domain: 'test.com' })
    response = await handleRequest(request, env)
    body = await response.json()
    assertEqual(response.status, 404, 'POST /api/detect/single returns 404')

    // GET /api/result/all - 已移除，应返回 404
    request = createRequest('GET', '/api/result/all')
    response = await handleRequest(request, env)
    body = await response.json()
    assertEqual(response.status, 404, 'GET /api/result/all returns 404')
  })
}

export async function runRoutesTests() {
  await testPublicRoutes()
  await testAdminRoutesRequireAuth()
  await testHealthCheck()
  await testNotFoundRoute()
  await testLegacyRoutesReturn404()
}
