import { handleRequest } from '../../src/routes/index.js'
import { assert, assertEqual, runSuite } from '../test-runner.js'

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

function createRequest(method, path, body = null) {
  const url = `http://localhost${path}`
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) {
    options.body = JSON.stringify(body)
  }
  return new Request(url, options)
}

async function testDomainsRoutes() {
  await runSuite('Domains Routes', async () => {
    const env = createMockEnv()

    // GET /api/domains - 空列表
    let request = createRequest('GET', '/api/domains')
    let response = await handleRequest(request, env)
    let body = await response.json()

    assertEqual(response.status, 200, 'GET domains status')
    assertEqual(body.code, 200, 'GET domains code')
    assertEqual(body.data.length, 0, 'GET domains empty list')

    // POST /api/domains - 全量更新
    request = createRequest('POST', '/api/domains', { domains: ['a.com', 'b.com'] })
    response = await handleRequest(request, env)
    body = await response.json()

    assertEqual(response.status, 200, 'POST update domains status')
    assertEqual(body.code, 200, 'POST update domains code')
    assertEqual(body.data.count, 2, 'POST update domains count')

    // POST /api/domains/add - 追加域名
    request = createRequest('POST', '/api/domains/add', { domain: 'https://c.com:443/path' })
    response = await handleRequest(request, env)
    body = await response.json()

    assertEqual(response.status, 200, 'POST add domain status')
    assertEqual(body.code, 200, 'POST add domain code')

    // POST /api/domains/add - 非法域名
    request = createRequest('POST', '/api/domains/add', { domain: '' })
    response = await handleRequest(request, env)
    body = await response.json()

    assertEqual(response.status, 400, 'POST add invalid domain status')
    assertEqual(body.code, 400, 'POST add invalid domain code')

    // POST /api/domains/delete - 删除域名
    request = createRequest('POST', '/api/domains/delete', { domain: 'a.com' })
    response = await handleRequest(request, env)
    body = await response.json()

    assertEqual(response.status, 200, 'POST delete domain status')
    assertEqual(body.code, 200, 'POST delete domain code')
  })
}

async function testDetectRoutes() {
  await runSuite('Detect Routes', async () => {
    const env = createMockEnv()

    // 先添加测试域名
    const kv = env.DOMAIN_MONITOR_KV
    await kv.put('domain_list', JSON.stringify(['cloudflare.com']))

    // GET /api/detect/all - 批量检测（会调用真实 DoH）
    // 注意：这个测试会发起真实网络请求，实际使用时需要 mock fetch
    // 这里只测试路由是否能正常分发

    // POST /api/detect/single - 单域名检测
    const request = createRequest('POST', '/api/detect/single', { domain: 'example.com' })
    const response = await handleRequest(request, env)

    assertEqual(response.headers.get('Content-Type'), 'application/json', 'Response content type')
  })
}

async function testResultRoutes() {
  await runSuite('Result Routes', async () => {
    const env = createMockEnv()
    const kv = env.DOMAIN_MONITOR_KV

    // 先写入测试结果
    const mockResult = {
      domain: 'example.com',
      timestamp: 1234567890,
      https_rr: { status: 'ok', message: 'Found' },
      ech: { status: 'no', message: 'Not found' },
      ipv6: { status: 'ok', message: 'Found', ipv6Addresses: ['2606::1'] },
    }

    await kv.put('result:example.com', JSON.stringify(mockResult))

    // POST /api/result/single - 查询单域名
    let request = createRequest('POST', '/api/result/single', { domain: 'example.com' })
    let response = await handleRequest(request, env)
    let body = await response.json()

    assertEqual(response.status, 200, 'GET single result status')
    assertEqual(body.code, 200, 'GET single result code')
    assertEqual(body.data.domain, 'example.com', 'Result domain')

    // POST /api/result/single - 不存在的域名
    request = createRequest('POST', '/api/result/single', { domain: 'nonexistent.com' })
    response = await handleRequest(request, env)
    body = await response.json()

    assertEqual(response.status, 404, 'GET non-existent result status')
    assertEqual(body.code, 404, 'GET non-existent result code')
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

export async function runRoutesTests() {
  await testDomainsRoutes()
  await testDetectRoutes()
  await testResultRoutes()
  await testNotFoundRoute()
}
