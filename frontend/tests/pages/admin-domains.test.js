/**
 * 任务 17 - 域名管理页面测试
 */

import { runSuite, assertEqual } from '../test-runner.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '../..')

/**
 * 运行任务 17 测试
 */
export async function runAdminDomainsTests() {
  // 文件存在性测试
  await runSuite('Task 17 - AdminDomains Files Exist', () => {
    const adminDomainsPath = join(ROOT, 'src/pages/admin/AdminDomains.js')
    const modalPath = join(ROOT, 'src/components/Modal.js')
    const togglePath = join(ROOT, 'src/components/Toggle.js')

    const adminDomainsExists = exists(adminDomainsPath)
    const modalExists = exists(modalPath)
    const toggleExists = exists(togglePath)

    assertEqual(adminDomainsExists, true, 'AdminDomains.js exists')
    assertEqual(modalExists, true, 'Modal.js exists')
    assertEqual(toggleExists, true, 'Toggle.js exists')
  })

  // 组件使用测试
  await runSuite('Task 17 - Uses Modal and Toggle Components', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDomains.js'), 'utf-8')

    const importsModal = content.includes("from '../../components/Modal.js'")
    const importsToggle = content.includes("from '../../components/Toggle.js'")
    const usesModal = content.includes('Modal({')
    const usesToggle = content.includes('Toggle({')

    assertEqual(importsModal, true, 'Imports Modal component')
    assertEqual(importsToggle, true, 'Imports Toggle component')
    assertEqual(usesModal, true, 'Uses Modal component')
    assertEqual(usesToggle, true, 'Uses Toggle component')
  })

  // CRUD 操作测试
  await runSuite('Task 17 - Has CRUD Operations', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDomains.js'), 'utf-8')

    const hasLoadData = content.includes('loadData')
    const hasHandleAddDomain = content.includes('handleAddDomain')
    const hasHandleBatchDelete = content.includes('handleBatchDelete')
    const hasHandleToggleDefault = content.includes('handleToggleDefault')
    const hasGetCall = content.includes("get('/api/admin/domains'")
    const hasPostCall = content.includes("post('/api/admin/domains'")
    const hasDelCall = content.includes('del(`/api/admin/domains/')

    assertEqual(hasLoadData, true, 'Has loadData method')
    assertEqual(hasHandleAddDomain, true, 'Has handleAddDomain method')
    assertEqual(hasHandleBatchDelete, true, 'Has handleBatchDelete method')
    assertEqual(hasHandleToggleDefault, true, 'Has handleToggleDefault method')
    assertEqual(hasGetCall, true, 'Calls GET /api/admin/domains')
    assertEqual(hasPostCall, true, 'Calls POST /api/admin/domains')
    assertEqual(hasDelCall, true, 'Calls DELETE /api/admin/domains/:domain')
  })

  // 默认展示管理测试
  await runSuite('Task 17 - Default Domain Management', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDomains.js'), 'utf-8')

    const hasIsDefaultColumn = content.includes("'isDefault'")
    const hasToggleInTable = content.includes('handleToggleDefault')
    const hasDefaultApi = content.includes('/default')

    assertEqual(hasIsDefaultColumn, true, 'Has isDefault column in table')
    assertEqual(hasToggleInTable, true, 'Has Toggle in table for default management')
    assertEqual(hasDefaultApi, true, 'Has API calls for default management')
  })

  // 批量操作测试
  await runSuite('Task 17 - Batch Operations', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDomains.js'), 'utf-8')

    const hasSelectedDomains = content.includes('selectedDomains')
    const hasSelectAll = content.includes('selectAll')
    const hasBatchDeleteBtn = content.includes('batchDeleteBtn')
    const hasDomainCheckbox = content.includes('dm-domain-checkbox')

    assertEqual(hasSelectedDomains, true, 'Has selectedDomains state')
    assertEqual(hasSelectAll, true, 'Has select all functionality')
    assertEqual(hasBatchDeleteBtn, true, 'Has batch delete button')
    assertEqual(hasDomainCheckbox, true, 'Has domain checkbox for selection')
  })

  // 添加域名弹窗测试
  await runSuite('Task 17 - Add Domain Modal', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDomains.js'), 'utf-8')

    const hasShowAddModal = content.includes('showAddModal')
    const hasNewDomainInput = content.includes('newDomainInput')
    const hasAddDomainBtn = content.includes('addDomainBtn')
    const hasCancelAddBtn = content.includes('cancelAddBtn')
    const hasConfirmAddBtn = content.includes('confirmAddBtn')

    assertEqual(hasShowAddModal, true, 'Has showAddModal state')
    assertEqual(hasNewDomainInput, true, 'Has newDomainInput state')
    assertEqual(hasAddDomainBtn, true, 'Has add domain button')
    assertEqual(hasCancelAddBtn, true, 'Has cancel add button')
    assertEqual(hasConfirmAddBtn, true, 'Has confirm add button')
  })

  // 域名验证测试
  await runSuite('Task 17 - Domain Validation', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDomains.js'), 'utf-8')

    const importsIsValidDomain = content.includes('isValidDomain')
    const hasInvalidDomainsCheck = content.includes('invalidDomains')
    const hasSplitDomains = content.includes("split(',')")

    assertEqual(importsIsValidDomain, true, 'Imports isValidDomain utility')
    assertEqual(hasInvalidDomainsCheck, true, 'Validates domain format')
    assertEqual(hasSplitDomains, true, 'Supports multiple domains (comma separated)')
  })

  // 跳转到历史页测试
  await runSuite('Task 17 - Navigate to History', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDomains.js'), 'utf-8')

    const hasHistoryLink = content.includes('#/admin/history?domain=')
    const hasEncodeURIComponent = content.includes('encodeURIComponent')

    assertEqual(hasHistoryLink, true, 'Has link to history page')
    assertEqual(hasEncodeURIComponent, true, 'Uses encodeURIComponent for URL safety')
  })

  // 事件绑定测试
  await runSuite('Task 17 - Event Binding', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDomains.js'), 'utf-8')

    const hasBindEvents = content.includes('bindEvents()')
    const hasDestroy = content.includes('destroy()')
    const hasInstanceMethod = content.includes('_handleDeleteDomain(')
    const hasWindowCleanup = content.includes('delete window.__')
    const hasEventDelegation = content.includes('.dm-delete-btn') && content.includes('_tableDelegateHandler')
    const hasTableBodyBinding = content.includes('__tableDelegateHandler')

    assertEqual(hasBindEvents, true, 'Has bindEvents method')
    assertEqual(hasDestroy, true, 'Has destroy method for cleanup')
    assertEqual(hasInstanceMethod, true, 'Delete handler is instance method (no window global)')
    assertEqual(hasWindowCleanup, true, 'Clears window variables in destroy')
    assertEqual(hasEventDelegation, true, 'Uses event delegation for table actions')
    assertEqual(hasTableBodyBinding, true, 'Stores table delegate handler reference')
  })

  // 无 window 全局泄漏测试
  await runSuite('Task 27.5 - No Window Globals', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDomains.js'), 'utf-8')

    const hasOnclickDelete = content.includes('onclick="window.')
    const hasWindowAssign = /\bwindow\.__[a-zA-Z]+\s*=/.test(content)

    assertEqual(hasOnclickDelete, false, 'No inline onclick handler via window globals')
    assertEqual(hasWindowAssign, false, 'No new window.__ variable assignments')
  })

  // 表格渲染测试
  await runSuite('Task 17 - Table Rendering', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminDomains.js'), 'utf-8')

    const importsTable = content.includes("from '../../components/Table.js'")
    const usesTable = content.includes('Table({ columns')
    const hasDomainColumn = content.includes("key: 'domain'")
    const hasStatusColumn = content.includes("key: 'status'")
    const hasActionsColumn = content.includes("key: 'actions'")

    assertEqual(importsTable, true, 'Imports Table component')
    assertEqual(usesTable, true, 'Uses Table component')
    assertEqual(hasDomainColumn, true, 'Has domain column')
    assertEqual(hasStatusColumn, true, 'Has status column')
    assertEqual(hasActionsColumn, true, 'Has actions column')
  })
}

/**
 * 检查文件是否存在
 */
function exists(path) {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}
