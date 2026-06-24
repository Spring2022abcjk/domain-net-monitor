/**
 * 管理后台布局测试
 * 任务 16：测试布局组件、导航、路由嵌套
 */
import { runSuite, assertEqual } from '../test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

/**
 * 管理后台布局测试
 */
export async function runAdminLayoutTests() {
  // ===== 文件存在测试 =====
  await runSuite('Task 16 - Admin Layout Files Exist', async () => {
    assertEqual(
      existsSync(join(frontendRoot, 'src/pages/admin/AdminLayout.js')),
      true,
      'AdminLayout.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/pages/admin/AdminDashboard.js')),
      true,
      'AdminDashboard.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/admin/Sidebar.js')),
      true,
      'Sidebar.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/admin/Topbar.js')),
      true,
      'Topbar.js exists'
    )
  })
  
  // ===== 布局组件测试 =====
  await runSuite('Task 16 - AdminLayout Structure', async () => {
    const layout = readFileSync(join(frontendRoot, 'src/pages/admin/AdminLayout.js'), 'utf-8')
    
    assertEqual(layout.includes('export class AdminLayout'), true, 'Has AdminLayout class')
    assertEqual(layout.includes('Sidebar'), true, 'Uses Sidebar component')
    assertEqual(layout.includes('Topbar'), true, 'Uses Topbar component')
    assertEqual(layout.includes('childComponent'), true, 'Supports child component')
    assertEqual(layout.includes('isLoggedIn'), true, 'Checks authentication')
    assertEqual(layout.includes('clearAuth'), true, 'Has logout logic')
    assertEqual(layout.includes('removeEventListener'), true, 'Has event cleanup')
    assertEqual(layout.includes('__sidebarToggleHandler'), true, 'Stores menu handler reference')
    assertEqual(layout.includes('__sidebarCloseHandler'), true, 'Stores sidebar close handler reference')
    assertEqual(layout.includes('__topbarLogoutHandler'), true, 'Stores logout handler reference')
  })
  
  // ===== Sidebar 测试 =====
  await runSuite('Task 16 - Sidebar', async () => {
    const sidebar = readFileSync(join(frontendRoot, 'src/components/admin/Sidebar.js'), 'utf-8')
    
    assertEqual(sidebar.includes('navItems'), true, 'Has navigation config')
    assertEqual(sidebar.includes('/admin/dashboard'), true, 'Has dashboard link')
    assertEqual(sidebar.includes('/admin/domains'), true, 'Has domains link')
    assertEqual(sidebar.includes('/admin/config'), true, 'Has config link')
    assertEqual(sidebar.includes('/admin/history'), true, 'Has history link')
    assertEqual(sidebar.includes('dm-sidebar'), true, 'Uses dm- prefix')
    assertEqual(sidebar.includes('translate-x'), true, 'Has mobile toggle')
  })
  
  // ===== Topbar 测试 =====
  await runSuite('Task 16 - Topbar', async () => {
    const topbar = readFileSync(join(frontendRoot, 'src/components/admin/Topbar.js'), 'utf-8')
    
    assertEqual(topbar.includes('generateBreadcrumbs'), true, 'Has breadcrumbs')
    assertEqual(topbar.includes('退出'), true, 'Has logout button')
    assertEqual(topbar.includes('dm-topbar'), true, 'Uses dm- prefix')
    assertEqual(topbar.includes('getCurrentUser'), true, 'Gets user info')
  })
  
  // ===== Dashboard 测试 =====
  await runSuite('Task 16 - AdminDashboard', async () => {
    const dashboard = readFileSync(join(frontendRoot, 'src/pages/admin/AdminDashboard.js'), 'utf-8')
    
    assertEqual(dashboard.includes('export class AdminDashboard'), true, 'Has AdminDashboard class')
    assertEqual(dashboard.includes('stats'), true, 'Loads stats data')
    assertEqual(dashboard.includes('recentDomains'), true, 'Loads recent domains')
    assertEqual(dashboard.includes('Card'), true, 'Uses Card component')
    assertEqual(dashboard.includes('Table'), true, 'Uses Table component')
  })
  
  // ===== 路由嵌套配置测试 =====
  await runSuite('Router - Nested Routes Config', async () => {
    const routes = readFileSync(join(frontendRoot, 'src/router/routes.js'), 'utf-8')
    
    assertEqual(routes.includes("path: '/admin'"), true, 'Has admin parent route')
    assertEqual(routes.includes('children:'), true, 'Has children routes')
    assertEqual(routes.includes('AdminLayout'), true, 'Uses AdminLayout component')
    assertEqual(routes.includes("import('../pages/admin/AdminDashboard.js')"), true, 'Lazy loads dashboard')
    assertEqual(routes.includes("import('../pages/admin/AdminDomains.js')"), true, 'Lazy loads domains')
    assertEqual(routes.includes("import('../pages/admin/AdminConfig.js')"), true, 'Lazy loads config')
    assertEqual(routes.includes("import('../pages/admin/AdminHistory.js')"), true, 'Lazy loads history')
  })
  
  // ===== 路由初始化逻辑测试 =====
  await runSuite('Router - Nested Routes Logic', async () => {
    const router = readFileSync(join(frontendRoot, 'src/router/index.js'), 'utf-8')
    
    assertEqual(router.includes('findChildRoute'), true, 'Has findChildRoute function')
    assertEqual(router.includes('parentRoute'), true, 'Handles parent route')
    assertEqual(router.includes('childRoute'), true, 'Handles child route')
    assertEqual(router.includes('admin'), true, 'Has admin route handling')
  })
}

// 运行测试
runAdminLayoutTests()
  .then(() => {
    console.log('[Test] Admin layout tests completed')
  })
  .catch((error) => {
    console.error('[Test] Admin layout tests failed:', error)
    process.exit(1)
  })
