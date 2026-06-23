// tests/pages/public-dashboard.test.js

import { runSuite, assertEqual } from '../test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

/**
 * 公开 Dashboard 页面测试
 */
export async function runPublicDashboardTests() {
  // ========== 页面文件存在测试 ==========
  await runSuite('Pages - PublicDashboard Exists', async () => {
    assertEqual(
      existsSync(join(frontendRoot, 'src/pages/PublicDashboard.js')),
      true,
      'PublicDashboard.js exists'
    )
  })
  
  // ========== PublicDashboard 组件测试 ==========
  await runSuite('Pages - PublicDashboard Component', async () => {
    const page = readFileSync(join(frontendRoot, 'src/pages/PublicDashboard.js'), 'utf-8')
    
    assertEqual(page.includes('export class PublicDashboard'), true, 'Has PublicDashboard class')
    assertEqual(page.includes('async init()'), true, 'Has init method')
    assertEqual(page.includes('render()'), true, 'Has render method')
    assertEqual(page.includes('destroy()'), true, 'Has destroy method')
    assertEqual(page.includes('loadDomains()'), true, 'Has loadDomains method')
    assertEqual(page.includes('handleSearch()'), true, 'Has handleSearch method')
    assertEqual(page.includes('handleViewDetail'), true, 'Has handleViewDetail method')
    assertEqual(page.includes('bindEvents()'), true, 'Has bindEvents method')
  })
  
  // ========== PublicDashboard API 调用测试 ==========
  await runSuite('Pages - PublicDashboard API Calls', async () => {
    const page = readFileSync(join(frontendRoot, 'src/pages/PublicDashboard.js'), 'utf-8')
    
    assertEqual(page.includes("get('/api/public/domains')"), true, 'Calls get /api/public/domains')
    assertEqual(page.includes('res.data.domains'), true, 'Accesses response data')
    assertEqual(page.includes('show.error'), true, 'Shows error on failure')
    assertEqual(page.includes('error.status === 404'), true, 'Handles 404 error')
    assertEqual(page.includes('error.status >= 500'), true, 'Handles 500 error')
    assertEqual(page.includes('TypeError'), true, 'Handles network error')
  })
  
  // ========== PublicDashboard DOM 结构测试 ==========
  await runSuite('Pages - PublicDashboard DOM Structure', async () => {
    const page = readFileSync(join(frontendRoot, 'src/pages/PublicDashboard.js'), 'utf-8')
    
    assertEqual(page.includes('dm-header'), true, 'Has header element')
    assertEqual(page.includes('SearchBox'), true, 'Uses SearchBox component')
    assertEqual(page.includes('DomainCard'), true, 'Uses DomainCard component')
    assertEqual(page.includes('Footer'), true, 'Uses Footer component')
    assertEqual(page.includes('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'), true, 'Has responsive grid')
    assertEqual(page.includes('btn-search'), true, 'Has search button ID')
    assertEqual(page.includes('id="domain-grid"'), true, 'Has domain grid container for event delegation')
  })
  
  // ========== PublicDashboard 事件绑定测试 ==========
  await runSuite('Pages - PublicDashboard Event Binding', async () => {
    const page = readFileSync(join(frontendRoot, 'src/pages/PublicDashboard.js'), 'utf-8')
    
    assertEqual(page.includes("addEventListener('click'"), true, 'Has click event listeners')
    assertEqual(page.includes("addEventListener('keydown'"), true, 'Has keydown event listeners')
    assertEqual(page.includes('removeEventListener'), true, 'Has event cleanup')
    assertEqual(page.includes('this.__searchClickHandler'), true, 'Stores search handler reference')
    assertEqual(page.includes('this.__domainClickHandler'), true, 'Stores grid delegate handler reference')
    assertEqual(page.includes('.cancel()'), true, 'Cancels debounce timer in destroy')
  })
  
  // ========== SearchBox 组件测试 ==========
  await runSuite('Components - SearchBox', async () => {
    const component = readFileSync(join(frontendRoot, 'src/components/SearchBox.js'), 'utf-8')
    
    assertEqual(component.includes('export function SearchBox'), true, 'Has SearchBox function')
    assertEqual(component.includes('dm-search-box'), true, 'Uses dm-search-box class')
    assertEqual(component.includes('dm-input'), true, 'Uses dm-input class')
    assertEqual(component.includes('dm-btn'), true, 'Uses dm-btn class')
    assertEqual(component.includes('btn-search'), true, 'Has search button ID')
  })
  
  // ========== DomainCard 组件测试 ==========
  await runSuite('Components - DomainCard', async () => {
    const component = readFileSync(join(frontendRoot, 'src/components/DomainCard.js'), 'utf-8')
    
    assertEqual(component.includes('export function DomainCard'), true, 'Has DomainCard function')
    assertEqual(component.includes('dm-card'), true, 'Uses dm-card class')
    assertEqual(component.includes('statusColors'), true, 'Has status colors')
    assertEqual(component.includes('statusLabels'), true, 'Has status labels')
    assertEqual(component.includes('运行中'), true, 'Has active status label')
    assertEqual(component.includes('已停止'), true, 'Has stopped status label')
    assertEqual(component.includes('data-domain='), true, 'Uses data-domain attribute for event delegation')
    assertEqual(component.includes("validStatuses.includes"), true, 'Has status whitelist validation (XSS protection)')
    assertEqual(component.includes('generateElementId'), true, 'Uses generateElementId utility function')
  })
  
  // ========== Footer 组件测试 ==========
  await runSuite('Components - Footer', async () => {
    const component = readFileSync(join(frontendRoot, 'src/components/Footer.js'), 'utf-8')
    
    assertEqual(component.includes('export function Footer'), true, 'Has Footer function')
    assertEqual(component.includes('dm-footer'), true, 'Uses dm-footer class')
    assertEqual(component.includes('All rights reserved'), true, 'Has copyright text')
  })
  
  // ========== EmptyState 组件测试 ==========
  await runSuite('Components - EmptyState', async () => {
    const component = readFileSync(join(frontendRoot, 'src/components/EmptyState.js'), 'utf-8')
    
    assertEqual(component.includes('export function EmptyState'), true, 'Has EmptyState function')
    assertEqual(component.includes('dm-empty-state'), true, 'Uses dm-empty-state class')
    assertEqual(component.includes('icons'), true, 'Has icon definitions')
    assertEqual(component.includes('empty'), true, 'Has empty icon')
    assertEqual(component.includes('search'), true, 'Has search icon')
    assertEqual(component.includes('error'), true, 'Has error icon')
    assertEqual(component.includes('title'), true, 'Supports title prop')
    assertEqual(component.includes('message'), true, 'Supports message prop')
  })
  
  // ========== components/index.js 导出测试 ==========
  await runSuite('Components - Index Exports Public', async () => {
    const index = readFileSync(join(frontendRoot, 'src/components/index.js'), 'utf-8')
    
    assertEqual(index.includes("export { default as DomainCard }"), true, 'Exports DomainCard')
    assertEqual(index.includes("export { default as SearchBox }"), true, 'Exports SearchBox')
    assertEqual(index.includes("export { default as Footer }"), true, 'Exports Footer')
    assertEqual(index.includes("export { default as EmptyState }"), true, 'Exports EmptyState')
    assertEqual(index.includes("export { DomainCard as createDomainCard }"), true, 'Exports createDomainCard')
    assertEqual(index.includes("export { SearchBox as createSearchBox }"), true, 'Exports createSearchBox')
    assertEqual(index.includes("export { EmptyState as createEmptyState }"), true, 'Exports createEmptyState')
  })
  
  // ========== 路由配置测试 ==========
  await runSuite('Router - PublicDashboard Route', async () => {
    const routes = readFileSync(join(frontendRoot, 'src/router/routes.js'), 'utf-8')
    
    assertEqual(routes.includes("PublicDashboard.js"), true, 'References PublicDashboard module')
    assertEqual(routes.includes("path: '/'"), true, 'Has root path')
    assertEqual(routes.includes("import('../pages/PublicDashboard.js')"), true, 'Lazy loads PublicDashboard')
    assertEqual(routes.includes("requiresAuth: false"), true, 'Does not require auth')
  })
}
