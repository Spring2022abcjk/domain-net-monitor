/**
 * API 集成测试
 * 测试前端与后端的实际交互
 *
 * 注意：需要生产环境部署后才能获取到正确的 Token
 * 当前测试会验证 API 端点可用性，但认证测试需要等待部署
 */
import { runSuite, assertEqual, assert } from './test-runner.js'

const API_BASE_URL = 'https://your-worker.your-domain.workers.dev'

/**
 * API 集成测试
 */
export async function runAPIIntegrationTests() {
  console.log('=== API Integration Tests ===')
  console.log(`Base URL: ${API_BASE_URL}`)
  console.log('')

  // 公开 API 测试
  await runSuite('API - Public Endpoints', async () => {
    const domainsRes = await fetch(`${API_BASE_URL}/api/public/domains`)
    const domainsData = await domainsRes.json()

    assertEqual(domainsRes.ok, true, 'GET /api/public/domains returns 200')
    assertEqual(domainsData.code, 200, 'Response code is 200')
    assert(Array.isArray(domainsData.data.domains), 'domains is array')
  })

  // Admin API 无认证测试
  await runSuite('API - Admin Endpoints Without Auth', async () => {
    const adminRes = await fetch(`${API_BASE_URL}/api/admin/domains`)
    const adminData = await adminRes.json()

    assertEqual(adminRes.status, 401, 'GET /api/admin/domains returns 401 without auth')
    assertEqual(adminData.code, 401, 'Response code is 401')
  })

  // 以下测试需要真实 Token（生产环境部署后才能用）
  console.log('')
  console.log('⚠️  注意：以下测试需要生产环境部署后才能通过')
  console.log('    当前跳过认证测试')
}
