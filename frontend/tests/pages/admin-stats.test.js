/**
 * 任务 20 - 统计概览页面测试
 */

import { runSuite, assertEqual } from '../test-runner.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '../..')

/**
 * 运行任务 20 测试
 */
export async function runAdminStatsTests() {
  // 文件存在性测试
  await runSuite('Task 20 - AdminStats Files Exist', () => {
    const adminStatsPath = join(ROOT, 'src/pages/admin/AdminStats.js')
    const exists = fileExists(adminStatsPath)
    assertEqual(exists, true, 'AdminStats.js exists')
  })

  // 组件使用测试
  await runSuite('Task 20 - AdminStats Uses Components', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')

    assertEqual(content.includes("from '../../components/Card.js'"), true, 'Imports Card component')
    assertEqual(content.includes("from '../../components/Button.js'"), true, 'Imports Button component')
    assertEqual(content.includes('Card({'), true, 'Uses Card component')
    assertEqual(content.includes('Button({'), true, 'Uses Button component')
  })

  // API 调用测试
  await runSuite('Task 20 - AdminStats API Calls', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')

    assertEqual(content.includes("get('/api/admin/stats')"), true, 'Calls GET stats API')
  })

  // 功能完整性测试
  await runSuite('Task 20 - AdminStats Features', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')

    assertEqual(content.includes('totalDomains'), true, 'Has total domains stat')
    assertEqual(content.includes('defaultDomains'), true, 'Has default domains stat')
    assertEqual(content.includes('today?.requests'), true, 'Has today requests stat')
    assertEqual(content.includes('rateLimitHits'), true, 'Has rate limit hits stat')
    assertEqual(content.includes('successCount'), true, 'Has success count stat')
    assertEqual(content.includes('failCount'), true, 'Has fail count stat')
    assertEqual(content.includes('successRate'), true, 'Has success rate stat')
    assertEqual(content.includes('uptime'), true, 'Has uptime stat')
    assertEqual(content.includes('lastReset'), true, 'Has last reset stat')
  })

  // 方法完整性测试
  await runSuite('Task 20 - AdminStats Methods', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')

    assertEqual(content.includes('loadStats'), true, 'Has loadStats method')
    assertEqual(content.includes('handleRefresh'), true, 'Has handleRefresh method')
    assertEqual(content.includes('renderCoreStats'), true, 'Has core stats render')
    assertEqual(content.includes('renderDetectionStats'), true, 'Has detection stats render')
    assertEqual(content.includes('renderSystemInfo'), true, 'Has system info render')
  })

  // Loading 状态测试
  await runSuite('Task 20 - AdminStats Loading States', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')

    assertEqual(content.includes('this.loading'), true, 'Has loading state')
    assertEqual(content.includes('加载中'), true, 'Shows loading text')
  })

  // 错误处理测试
  await runSuite('Task 20 - AdminStats Error Handling', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')

    assertEqual(content.includes('try {'), true, 'Uses try-catch blocks')
    assertEqual(content.includes('catch (error)'), true, 'Catches errors')
    assertEqual(content.includes('show.error'), true, 'Shows error messages')
    assertEqual(content.includes('show.success'), true, 'Shows success messages')
  })

  // 响应式布局测试
  await runSuite('Task 20 - AdminStats Responsive Layout', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')

    assertEqual(
      content.includes('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4'),
      true,
      'Has responsive grid (4 cols)',
    )
    assertEqual(content.includes('grid grid-cols-1 md:grid-cols-2 gap-6'), true, 'Has responsive grid (2 cols)')
    assertEqual(content.includes('Card'), true, 'Uses Card component')
  })

  // 数据格式化测试
  await runSuite('Task 20 - AdminStats Data Formatting', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')

    assertEqual(content.includes('parseFloat'), true, 'Parses success rate')
    assertEqual(content.includes('toFixed'), true, 'Formats percentage')
    assertEqual(content.includes('toLocaleString'), true, 'Formats date')
  })

  // 事件处理测试
  await runSuite('Task 20 - AdminStats Event Handling', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')

    assertEqual(content.includes('bindEvents'), true, 'Has bindEvents method')
    assertEqual(content.includes('destroy'), true, 'Has destroy method')
    assertEqual(content.includes('addEventListener'), true, 'Uses event listeners')
    assertEqual(content.includes('removeEventListener'), true, 'Cleans up event listeners')
    assertEqual(content.includes('refreshStatsBtn'), true, 'Has refresh button')
  })

  // 空值处理测试
  await runSuite('Task 20 - AdminStats Null Safety', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')

    assertEqual(content.includes('|| 0'), true, 'Handles null numbers')
    assertEqual(content.includes("toFixed(2)}%"), true, 'Formats success rate with percent sign')
    assertEqual(content.includes("|| '0.0 days'"), true, 'Handles null uptime')
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
