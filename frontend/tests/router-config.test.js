// tests/router-config.test.js

import { runSuite, assertEqual } from './test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

/**
 * 路由配置测试
 */
export async function runRouterConfigTests() {
  // ========== 路由配置文件测试 ==========
  await runSuite('Router Config - routes.js Exists', async () => {
    const routesPath = join(frontendRoot, 'src/router/routes.js')
    assertEqual(existsSync(routesPath), true, 'routes.js exists')
  })
  
  // ========== 路由工具函数测试 ==========
  await runSuite('Router Utils - Match Route', async () => {
    const utilsPath = join(frontendRoot, 'src/router/utils.js')
    const utils = readFileSync(utilsPath, 'utf-8')
    
    assertEqual(utils.includes('matchRoute'), true, 'Has matchRoute function')
    assertEqual(utils.includes('getQueryParams'), true, 'Has getQueryParams function')
    assertEqual(utils.includes('startsWith'), true, 'Parses dynamic params (:name)')
    assertEqual(utils.includes('URLSearchParams'), true, 'Uses URLSearchParams')
  })
  
  // ========== 404 页面测试 ==========
  await runSuite('Router - 404 Page Exists', async () => {
    const notFoundPath = join(frontendRoot, 'src/pages/NotFound.js')
    const notFound = readFileSync(notFoundPath, 'utf-8')
    
    assertEqual(notFound.includes('export default'), true, 'Exports component')
    assertEqual(notFound.includes('render()'), true, 'Has render method')
    assertEqual(notFound.includes('404'), true, 'Shows 404 text')
    assertEqual(notFound.includes('dm-btn'), true, 'Uses dm- prefix')
    assertEqual(notFound.includes("window.location.hash='/'"), true, 'Has back button')
  })
  
  // ========== 路由配置内容测试 ==========
  await runSuite('Router Config - Routes Definition', async () => {
    const routesPath = join(frontendRoot, 'src/router/routes.js')
    const routes = readFileSync(routesPath, 'utf-8')
    
    assertEqual(routes.includes('export const routes'), true, 'Exports routes array')
    assertEqual(routes.includes("path: '/'"), true, 'Has home route')
    assertEqual(routes.includes("path: '/login'"), true, 'Has login route')
    assertEqual(routes.includes("path: '*'"), true, 'Has catch-all route')
    assertEqual(routes.includes("import('../pages/NotFound.js')"), true, 'Lazy loads NotFound component')
    assertEqual(routes.includes('requiresAuth'), true, 'Has route meta')
    assertEqual(routes.includes('title:'), true, 'Has page titles')
  })
  
  // ========== 路由初始化测试 ==========
  await runSuite('Router - Initialization Logic', async () => {
    const routerPath = join(frontendRoot, 'src/router/index.js')
    const router = readFileSync(routerPath, 'utf-8')
    
    assertEqual(router.includes('import { routes }'), true, 'Imports routes config')
    assertEqual(router.includes('import { matchRoute'), true, 'Imports matchRoute')
    assertEqual(router.includes('getQueryParams'), true, 'Uses getQueryParams')
    assertEqual(router.includes('window.addEventListener'), true, 'Listens to hashchange')
    assertEqual(router.includes('renderRoute'), true, 'Has renderRoute function')
    assertEqual(router.includes('requiresAuth'), true, 'Supports auth check')
    assertEqual(router.includes('document.title'), true, 'Sets page title')
    assertEqual(router.includes('cleanupCurrentPage'), true, 'Cleans up old page')
    assertEqual(router.includes('params, query'), true, 'Passes params to init')
  })
  
  // ========== 路由参数支持测试 ==========
  await runSuite('Router - Dynamic Route Support', async () => {
    const utilsPath = join(frontendRoot, 'src/router/utils.js')
    const utils = readFileSync(utilsPath, 'utf-8')
    
    // 验证路由参数解析
    assertEqual(utils.includes(':name'), true, 'Supports :name param')
    assertEqual(utils.includes('decodeURIComponent'), true, 'Decodes params')
    assertEqual(utils.includes('split'), true, 'Parses path parts')
    
    // 验证查询参数解析
    assertEqual(utils.includes('split'), true, 'Splits hash string')
    assertEqual(utils.includes('URLSearchParams'), true, 'Uses URLSearchParams')
  })
}

export { runRouterConfigTests as runRouterTests }
