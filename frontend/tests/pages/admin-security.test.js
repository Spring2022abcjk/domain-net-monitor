/**
 * 任务 1 - 安全配置页面测试
 */

import { runSuite, assertEqual } from '../test-runner.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '../..')

/**
 * 运行安全配置页面测试
 */
export async function runAdminSecurityTests() {
  // 文件存在性测试
  await runSuite('Task 1 - AdminSecurity Files Exist', () => {
    const path = join(ROOT, 'src/pages/admin/AdminSecurity.js')
    const exists = fileExists(path)
    assertEqual(exists, true, 'AdminSecurity.js exists')
  })

  // 组件使用测试
  await runSuite('Task 1 - AdminSecurity Uses Components', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminSecurity.js'), 'utf-8')

    assertEqual(content.includes("from '../../components/Input.js'"), true, 'Imports Input component')
    assertEqual(content.includes("from '../../components/Button.js'"), true, 'Imports Button component')
    assertEqual(content.includes("from '../../components/Card.js'"), true, 'Imports Card component')
    assertEqual(content.includes('Input({'), true, 'Uses Input component')
    assertEqual(content.includes('Button({'), true, 'Uses Button component')
    assertEqual(content.includes('Card({'), true, 'Uses Card component')
  })

  // API 调用测试
  await runSuite('Task 1 - AdminSecurity API Calls', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminSecurity.js'), 'utf-8')

    assertEqual(content.includes("get('/api/admin/config/security')"), true, 'Calls GET security config')
    assertEqual(content.includes("put('/api/admin/config'"), true, 'Calls PUT admin config')
  })

  // 功能完整性测试
  await runSuite('Task 1 - AdminSecurity Features', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminSecurity.js'), 'utf-8')

    assertEqual(content.includes('corsMode'), true, 'Has corsMode field')
    assertEqual(content.includes('allowedOrigins'), true, 'Has allowedOrigins field')
    assertEqual(content.includes('rateLimit'), true, 'Has rateLimit field')
    assertEqual(content.includes('windowMs'), true, 'Has windowMs field')
    assertEqual(content.includes('maxRequests'), true, 'Has maxRequests field')
    assertEqual(content.includes('tokenConfigured'), true, 'Has tokenConfigured field')
  })

  // 方法完整性测试
  await runSuite('Task 1 - AdminSecurity Methods', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminSecurity.js'), 'utf-8')

    assertEqual(content.includes('loadConfig'), true, 'Has loadConfig method')
    assertEqual(content.includes('handleSave'), true, 'Has handleSave method')
    assertEqual(content.includes('renderSecurityStatus'), true, 'Has security status render')
    assertEqual(content.includes('renderRateLimitSection'), true, 'Has rate limit section render')
  })

  // 状态变量测试
  await runSuite('Task 1 - AdminSecurity States', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminSecurity.js'), 'utf-8')

    assertEqual(content.includes('this.loading'), true, 'Has loading state')
    assertEqual(content.includes('this.saving'), true, 'Has saving state')
    assertEqual(content.includes('加载中'), true, 'Shows loading text')
  })

  // 错误处理测试
  await runSuite('Task 1 - AdminSecurity Error Handling', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminSecurity.js'), 'utf-8')

    assertEqual(content.includes('try {'), true, 'Uses try-catch blocks')
    assertEqual(content.includes('catch (error)'), true, 'Catches errors')
    assertEqual(content.includes('show.error'), true, 'Shows error messages')
    assertEqual(content.includes('show.success'), true, 'Shows success messages')
  })

  // 事件处理测试
  await runSuite('Task 1 - AdminSecurity Event Handling', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminSecurity.js'), 'utf-8')

    assertEqual(content.includes('bindEvents'), true, 'Has bindEvents method')
    assertEqual(content.includes('destroy'), true, 'Has destroy method')
    assertEqual(content.includes('addEventListener'), true, 'Uses event listeners')
    assertEqual(content.includes('removeEventListener'), true, 'Cleans up event listeners')
    assertEqual(content.includes('saveSecurityBtn'), true, 'Has save security button')
  })

  // 渲染模式测试
  await runSuite('Task 1 - AdminSecurity Render Patterns', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminSecurity.js'), 'utf-8')

    assertEqual(content.includes('dm-config-section'), true, 'Has config section class')
    assertEqual(content.includes('安全配置'), true, 'Has security config title')
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