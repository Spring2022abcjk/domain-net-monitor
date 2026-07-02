/**
 * AdminDashboard 测试
 * 验证重构后的生命周期、事件绑定清理和 window.__ 残留检查
 */
import { runSuite, assertEqual } from '../test-runner.js'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '../..')

export async function runAdminDashboardTests() {
  await runSuite('AdminDashboard File Exists', () => {
    assertEqual(existsSync(join(ROOT, 'src/pages/admin/AdminDashboard.js')), true, 'AdminDashboard.js exists')
  })

  await runSuite('AdminDashboard Class Structure', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDashboard.js'), 'utf-8')

    assertEqual(content.includes('export class AdminDashboard'), true, 'Exports AdminDashboard class')
    assertEqual(content.includes('async init('), true, 'Has init method')
    assertEqual(content.includes('render()'), true, 'Has render method')
    assertEqual(content.includes('bindEvents()'), true, 'Has bindEvents method')
    assertEqual(content.includes('destroy()'), true, 'Has destroy method')
  })

  await runSuite('AdminDashboard Event Handler Refactoring', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDashboard.js'), 'utf-8')

    assertEqual(
      content.includes('id="dashboard-refresh-btn"'),
      true,
      'Uses id="dashboard-refresh-btn" instead of onclick',
    )
    assertEqual(content.includes('this.__refreshHandler'), true, 'Stores handler reference in constructor')
    assertEqual(
      content.includes("addEventListener('click', this.__refreshHandler)"),
      true,
      'Uses addEventListener with handler reference',
    )
    assertEqual(
      content.includes("removeEventListener('click', this.__refreshHandler)"),
      true,
      'Has removeEventListener in destroy',
    )
  })

  await runSuite('AdminDashboard No window.__ Patterns', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDashboard.js'), 'utf-8')

    assertEqual(
      content.includes('window.__dashboardRefreshHandler'),
      false,
      'No window.__dashboardRefreshHandler references',
    )
    assertEqual(content.includes('onclick="window.__'), false, 'No onclick="window.__ patterns')
    assertEqual(content.includes('window.__'), false, 'No window.__ global assignments')
  })

  await runSuite('AdminDashboard Refresh Handler Re-renders', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDashboard.js'), 'utf-8')

    assertEqual(content.includes('admin-content'), true, 'Refresh handler targets admin-content container')
    assertEqual(content.includes('this.render()'), true, 'Refresh handler calls this.render() to re-render')
    assertEqual(content.includes('this.bindEvents()'), true, 'Refresh handler calls this.bindEvents() after re-render')
    assertEqual(content.includes('this.loadData()'), true, 'Refresh handler calls this.loadData()')
  })
}

runAdminDashboardTests()
  .then(() => console.log('[Test] AdminDashboard tests completed'))
  .catch((e) => {
    console.error('[Test] AdminDashboard tests failed:', e)
    process.exitCode = 1
  })
