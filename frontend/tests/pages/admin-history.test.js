/**
 * 任务 19 - 历史记录页面测试
 */

import { runSuite, assertEqual } from '../test-runner.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '../..')

/**
 * 运行任务 19 测试
 */
export async function runAdminHistoryTests() {
  // 文件存在性测试
  await runSuite('Task 19 - AdminHistory Files Exist', () => {
    const adminHistoryPath = join(ROOT, 'src/pages/admin/AdminHistory.js')
    const exists = fileExists(adminHistoryPath)
    assertEqual(exists, true, 'AdminHistory.js exists')
  })

  // 组件使用测试
  await runSuite('Task 19 - AdminHistory Uses Components', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminHistory.js'), 'utf-8')

    assertEqual(content.includes("from '../../components/Table.js'"), true, 'Imports Table component')
    assertEqual(content.includes("from '../../components/Button.js'"), true, 'Imports Button component')
    assertEqual(content.includes("from '../../components/Input.js'"), true, 'Imports Input component')
    assertEqual(content.includes('Table({'), true, 'Uses Table component')
    assertEqual(content.includes('Button({'), true, 'Uses Button component')
    assertEqual(content.includes('Input({'), true, 'Uses Input component')
  })

  // API 调用测试
  await runSuite('Task 19 - AdminHistory API Calls', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminHistory.js'), 'utf-8')

    assertEqual(content.includes("get('/api/admin/history')"), true, 'Calls GET history API')
    assertEqual(content.includes("del('/api/admin/history"), true, 'Calls DELETE history API')
  })

  // 功能完整性测试
  await runSuite('Task 19 - AdminHistory Features', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminHistory.js'), 'utf-8')

    assertEqual(content.includes('historyData'), true, 'Has history data state')
    assertEqual(content.includes('selectedDomain'), true, 'Has selected domain state')
    assertEqual(content.includes('daysFilter'), true, 'Has days filter state')
    assertEqual(content.includes('domainSelect'), true, 'Has domain selector')
    assertEqual(content.includes('daysSelect'), true, 'Has days selector')
  })

  // 方法完整性测试
  await runSuite('Task 19 - AdminHistory Methods', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminHistory.js'), 'utf-8')

    assertEqual(content.includes('loadData'), true, 'Has loadData method')
    assertEqual(content.includes('handleQuery'), true, 'Has handleQuery method')
    assertEqual(content.includes('handleExportCsv'), true, 'Has handleExportCsv method')
    assertEqual(content.includes('handleCleanup'), true, 'Has handleCleanup method')
    assertEqual(content.includes('renderFilterBar'), true, 'Has filter bar render')
    assertEqual(content.includes('renderHistoryTable'), true, 'Has history table render')
  })

  // 导出功能测试
  await runSuite('Task 19 - AdminHistory Export Feature', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminHistory.js'), 'utf-8')

    assertEqual(content.includes('CSV'), true, 'Has CSV export')
    assertEqual(content.includes('Blob'), true, 'Uses Blob for download')
    assertEqual(content.includes('createObjectURL'), true, 'Creates object URL')
    assertEqual(content.includes('download'), true, 'Has download attribute')
    assertEqual(content.includes('exportCsvBtn'), true, 'Has export button')
  })

  // 筛选功能测试
  await runSuite('Task 19 - AdminHistory Filter Feature', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminHistory.js'), 'utf-8')

    assertEqual(content.includes('最近 7 天'), true, 'Has 7 days filter')
    assertEqual(content.includes('最近 30 天'), true, 'Has 30 days filter')
    assertEqual(content.includes('domainSelect'), true, 'Has domain filter')
    assertEqual(content.includes('queryBtn'), true, 'Has query button')
  })

  // Loading 状态测试
  await runSuite('Task 19 - AdminHistory Loading States', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminHistory.js'), 'utf-8')

    assertEqual(content.includes('this.loading'), true, 'Has loading state')
    assertEqual(content.includes('加载中'), true, 'Shows loading text')
  })

  // 错误处理测试
  await runSuite('Task 19 - AdminHistory Error Handling', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminHistory.js'), 'utf-8')

    assertEqual(content.includes('try {'), true, 'Uses try-catch blocks')
    assertEqual(content.includes('catch (error)'), true, 'Catches errors')
    assertEqual(content.includes('show.error'), true, 'Shows error messages')
    assertEqual(content.includes('show.success'), true, 'Shows success messages')
    assertEqual(content.includes('show.info'), true, 'Shows info messages')
    assertEqual(content.includes('confirm'), true, 'Confirms cleanup action')
  })

  // 空状态处理测试
  await runSuite('Task 19 - AdminHistory Empty State', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminHistory.js'), 'utf-8')

    assertEqual(content.includes('renderEmptyState'), true, 'Has empty state render')
    assertEqual(content.includes('暂无历史记录'), true, 'Shows empty state message')
  })

  // 表格渲染测试
  await runSuite('Task 19 - AdminHistory Table Rendering', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminHistory.js'), 'utf-8')

    assertEqual(content.includes('timestamp'), true, 'Has timestamp column')
    assertEqual(content.includes('httpsRR'), true, 'Has HTTPS RR column')
    assertEqual(content.includes('ipv6'), true, 'Has IPv6 column')
    assertEqual(content.includes('ech'), true, 'Has ECH column')
    assertEqual(content.includes('renderStatusBadge'), true, 'Has status badge render')
  })

  // 响应式布局测试
  await runSuite('Task 19 - AdminHistory Responsive Layout', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminHistory.js'), 'utf-8')

    assertEqual(content.includes('grid grid-cols-1 md:grid-cols-3'), true, 'Has responsive grid')
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
