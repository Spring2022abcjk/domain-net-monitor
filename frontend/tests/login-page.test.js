// tests/login-page.test.js

import { runSuite, assertEqual } from './test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

/**
 * 登录页面功能测试
 */
export async function runLoginPageTests() {
  // ========== Storage API 使用测试 ==========
  await runSuite('Login Page - Uses Storage API', async () => {
    const loginPath = join(frontendRoot, 'src/pages/Login.js')
    const login = readFileSync(loginPath, 'utf-8')
    
    // 验证导入 storage API
    assertEqual(login.includes("from '../utils/storage.js'"), true, 'Imports storage utils')
    assertEqual(login.includes('setApiEndpoint'), true, 'Uses setApiEndpoint')
    assertEqual(login.includes('setApiToken'), true, 'Uses setApiToken')
    
    // 验证没有直接使用 localStorage
    const hasDirectLocalStorage = /localStorage\.setItem\(['"]apiEndpoint/.test(login)
    assertEqual(hasDirectLocalStorage, false, 'No direct localStorage for apiEndpoint')
  })
  
  // ========== 无 alert 测试 ==========
  await runSuite('Login Page - No Alert', async () => {
    const loginPath = join(frontendRoot, 'src/pages/Login.js')
    const login = readFileSync(loginPath, 'utf-8')
    
    assertEqual(login.includes('alert('), false, 'No alert() calls')
  })
  
  // ========== 通知功能测试 ==========
  await runSuite('Login Page - Notification System', async () => {
    const loginPath = join(frontendRoot, 'src/pages/Login.js')
    const login = readFileSync(loginPath, 'utf-8')
    
    assertEqual(login.includes('showMessage'), true, 'Has showMessage method')
    assertEqual(login.includes('errorMessage'), true, 'Has error message element')
    assertEqual(login.includes('successMessage'), true, 'Has success message element')
    assertEqual(login.includes('submitBtn.disabled'), true, 'Disables button during submit')
  })
  
  // ========== URL 验证测试 ==========
  await runSuite('Login Page - URL Validation', async () => {
    const loginPath = join(frontendRoot, 'src/pages/Login.js')
    const login = readFileSync(loginPath, 'utf-8')
    
    assertEqual(login.includes('new URL('), true, 'Validates URL format')
    assertEqual(login.includes('.trim()'), true, 'Trims input values')
  })
  
  // ========== 路由清理测试 ==========
  await runSuite('Router - Page Cleanup', async () => {
    const routerPath = join(frontendRoot, 'src/router/index.js')
    const router = readFileSync(routerPath, 'utf-8')
    
    assertEqual(router.includes('cleanupCurrentPage'), true, 'Has cleanup function')
    assertEqual(router.includes('currentPageInstance'), true, 'Tracks current page')
    assertEqual(router.includes('destroy'), true, 'Calls page destroy method')
    assertEqual(router.includes('renderPage'), true, 'Has renderPage helper')
  })
}

export { runLoginPageTests as runLoginTests }
