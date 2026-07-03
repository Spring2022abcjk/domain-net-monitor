/**
 * 任务 18 - 系统配置页面测试
 */

import { runSuite, assertEqual } from '../test-runner.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '../..')

/**
 * 运行任务 18 测试
 */
export async function runAdminConfigTests() {
  // 文件存在性测试
  await runSuite('Task 18 - AdminConfig Files Exist', () => {
    const adminConfigPath = join(ROOT, 'src/pages/admin/AdminConfig.js')
    const exists = fileExists(adminConfigPath)
    assertEqual(exists, true, 'AdminConfig.js exists')
  })

  // 组件使用测试
  await runSuite('Task 18 - AdminConfig Uses Components', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminConfig.js'), 'utf-8')

    assertEqual(content.includes("from '../../components/Input.js'"), true, 'Imports Input component')
    assertEqual(content.includes("from '../../components/Button.js'"), true, 'Imports Button component')
    assertEqual(content.includes('Input({'), true, 'Uses Input component')
    assertEqual(content.includes('Button({'), true, 'Uses Button component')
  })

  // API 调用测试
  await runSuite('Task 18 - AdminConfig API Calls', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminConfig.js'), 'utf-8')

    assertEqual(content.includes("get('/api/admin/config')"), true, 'Calls GET config API')
    assertEqual(content.includes("get('/api/admin/doh')"), true, 'Calls GET doh API')
    assertEqual(content.includes("put('/api/admin/config'"), true, 'Calls PUT config API')
    assertEqual(content.includes("put('/api/admin/doh'"), true, 'Calls PUT doh API')
    assertEqual(content.includes("post('/api/admin/doh/test'"), true, 'Calls POST doh/test API')
  })

  // 功能完整性测试
  await runSuite('Task 18 - AdminConfig Features', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminConfig.js'), 'utf-8')

    assertEqual(content.includes('refreshInterval'), true, 'Has refresh interval config')
    assertEqual(content.includes('historyRetention'), true, 'Has history retention config')
    assertEqual(content.includes('dohPrimary'), true, 'Has DoH primary config')
    assertEqual(content.includes('dohBackup'), true, 'Has DoH backup config')
    assertEqual(content.includes('rateLimitWindow'), true, 'Has rate limit window config')
    assertEqual(content.includes('rateLimitMax'), true, 'Has rate limit max config')
  })

  // 方法完整性测试
  await runSuite('Task 18 - AdminConfig Methods', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminConfig.js'), 'utf-8')

    assertEqual(content.includes('loadConfig'), true, 'Has loadConfig method')
    assertEqual(content.includes('handleSave'), true, 'Has handleSave method')
    assertEqual(content.includes('handleReset'), true, 'Has handleReset method')
    assertEqual(content.includes('handleTestDoh'), true, 'Has handleTestDoh method')
    assertEqual(content.includes('renderDetectionSection'), true, 'Has detection section render')
    assertEqual(content.includes('renderHistorySection'), true, 'Has history section render')
    assertEqual(content.includes('renderDohSection'), true, 'Has DoH section render')
    assertEqual(content.includes('renderRateLimitSection'), true, 'Has rate limit section render')
  })

  // 表单验证测试
  await runSuite('Task 18 - AdminConfig Validation', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminConfig.js'), 'utf-8')

    assertEqual(content.includes('parseInt'), true, 'Parses number inputs')
    assertEqual(content.includes('refreshInterval < 1'), true, 'Validates refresh interval min')
    assertEqual(content.includes('historyRetention < 1'), true, 'Validates retention min')
    assertEqual(content.includes('historyRetention > 365'), true, 'Validates retention max')
    assertEqual(content.includes('isValidUrl'), true, 'Has URL validation')
  })

  // Loading 状态测试
  await runSuite('Task 18 - AdminConfig Loading States', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminConfig.js'), 'utf-8')

    assertEqual(content.includes('this.loading'), true, 'Has loading state')
    assertEqual(content.includes('this.saving'), true, 'Has saving state')
    assertEqual(content.includes('this.testing'), true, 'Has testing state')
    assertEqual(content.includes('保存中...'), true, 'Shows saving text')
    assertEqual(content.includes('测试中...'), true, 'Shows testing text')
  })

  // 错误处理测试
  await runSuite('Task 18 - AdminConfig Error Handling', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminConfig.js'), 'utf-8')

    assertEqual(content.includes('try {'), true, 'Uses try-catch blocks')
    assertEqual(content.includes('catch (error)'), true, 'Catches errors')
    assertEqual(content.includes('show.error'), true, 'Shows error messages')
    assertEqual(content.includes('show.success'), true, 'Shows success messages')
    assertEqual(content.includes('confirm'), true, 'Confirms reset action')
  })

  // 配置分组测试
  await runSuite('Task 18 - AdminConfig Sections', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminConfig.js'), 'utf-8')

    assertEqual(content.includes('检测配置'), true, 'Has detection config section')
    assertEqual(content.includes('历史配置'), true, 'Has history config section')
    assertEqual(content.includes('DoH 服务器配置'), true, 'Has DoH config section')
    assertEqual(content.includes('限流配置'), true, 'Has rate limit config section')
    assertEqual(content.includes('dm-config-section'), true, 'Uses config section class')
  })

  // Helper 方法测试
  await runSuite('Task 18 - AdminConfig Helper Methods', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminConfig.js'), 'utf-8')

    assertEqual(content.includes('bindEvents'), true, 'Has bindEvents method')
    assertEqual(content.includes('destroy'), true, 'Has destroy method')
    assertEqual(content.includes('.addEventListener'), true, 'Uses event listeners')
    assertEqual(content.includes('.removeEventListener'), true, 'Uses removeEventListener in bindEvents')
    assertEqual(content.includes('removeEventListener'), true, 'Has cleanup in destroy')
    assertEqual(content.includes('if (this.config) return'), true, 'Caches config to skip duplicate loads')
  })
}

/**
 * 检查文件是否存在
 */
function fileExists(path) {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}
