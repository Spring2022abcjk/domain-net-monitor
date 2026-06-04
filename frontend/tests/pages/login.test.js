/**
 * 登录页面测试
 * 任务 15：测试登录页组件、表单验证、API 调用
 */
import { runSuite, assertEqual } from '../test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

/**
 * 模拟 API 响应
 */
function createMockResponse(code, data, msg = '') {
  return { code, data, msg }
}

/**
 * 登录页面测试
 */
export async function runLoginTests() {
  // ===== 文件存在测试 =====
  await runSuite('Task 15 - Login Files Exist', async () => {
    assertEqual(
      existsSync(join(frontendRoot, 'src/pages/Login.js')),
      true,
      'Login.js exists'
    )
  })
  
  // ===== 组件使用测试 =====
  await runSuite('Task 15 - Uses New Component Library', async () => {
    const loginCode = readFileSync(join(frontendRoot, 'src/pages/Login.js'), 'utf-8')
    
    assertEqual(loginCode.includes("import { Input } from '../components/Input.js'"), true, 'Imports Input component')
    assertEqual(loginCode.includes("import { Button } from '../components/Button.js'"), true, 'Imports Button component')
    assertEqual(loginCode.includes("import { Card } from '../components/Card.js'"), true, 'Imports Card component')
    assertEqual(loginCode.includes("import { show } from '../components/Notification.js'"), true, 'Imports Notification')
    assertEqual(loginCode.includes("import { post } from '../utils/api.js'"), true, 'Imports API utilities')
    assertEqual(loginCode.includes('isLoggedIn'), true, 'Checks login status')
  })
  
  // ===== 表单验证测试 =====
  await runSuite('Task 15 - Form Validation', async () => {
    const loginCode = readFileSync(join(frontendRoot, 'src/pages/Login.js'), 'utf-8')
    
    // 检查 URL 验证
    assertEqual(loginCode.includes('new URL(endpoint)'), true, 'Validates URL format')
    
    // 检查 Token 长度验证
    assertEqual(loginCode.includes('token.length < 10'), true, 'Validates token length')
    
    // 检查空值验证
    assertEqual(loginCode.includes('!endpoint || !token'), true, 'Validates required fields')
    
    // 检查错误提示
    assertEqual(loginCode.includes('show.error'), true, 'Shows error messages')
  })
  
  // ===== API 调用测试 =====
  await runSuite('Task 15 - API Token Verification', async () => {
    const loginCode = readFileSync(join(frontendRoot, 'src/pages/Login.js'), 'utf-8')
    
    // 检查 API 调用
    assertEqual(loginCode.includes("post(`${endpoint}/api/admin/auth/verify`"), true, 'Calls verify API')
    assertEqual(loginCode.includes('Authorization: `Bearer ${token}`'), true, 'Sends Authorization header')
    
    // 检查成功处理
    assertEqual(loginCode.includes('response.code === 200'), true, 'Checks success response')
    assertEqual(loginCode.includes('response.data?.valid'), true, 'Checks valid flag')
    
    // 检查凭证保存
    assertEqual(loginCode.includes('setApiEndpoint(endpoint)'), true, 'Saves endpoint')
    assertEqual(loginCode.includes('setApiToken(token)'), true, 'Saves token')
    
    // 检查跳转
    assertEqual(loginCode.includes("window.location.hash = '/admin/dashboard'"), true, 'Redirects to dashboard')
  })
  
  // ===== 错误处理测试 =====
  await runSuite('Task 15 - Error Handling', async () => {
    const loginCode = readFileSync(join(frontendRoot, 'src/pages/Login.js'), 'utf-8')
    
    // 检查错误分类
    assertEqual(loginCode.includes('error.status === 401'), true, 'Handles 401 Unauthorized')
    assertEqual(loginCode.includes('error.status === 403'), true, 'Handles 403 Forbidden')
    assertEqual(loginCode.includes('error.status === 404'), true, 'Handles 404 Not Found')
    assertEqual(loginCode.includes('error.status === 0'), true, 'Handles network errors')
    
    // 检查 try-catch
    assertEqual(loginCode.includes('try {'), true, 'Uses try-catch')
    assertEqual(loginCode.includes('catch (error)'), true, 'Catches errors')
  })
  
  // ===== 加载状态测试 =====
  await runSuite('Task 15 - Loading State', async () => {
    const loginCode = readFileSync(join(frontendRoot, 'src/pages/Login.js'), 'utf-8')
    
    // 检查 loading 状态
    assertEqual(loginCode.includes('this.loading'), true, 'Has loading state')
    assertEqual(loginCode.includes('this.setLoading(true)'), true, 'Sets loading on submit')
     assertEqual(loginCode.includes('loading: this.loading'), true, 'Passes loading to Button')
    
    // 检查按钮禁用
    assertEqual(loginCode.includes('btn.disabled = loading'), true, 'Disables button during loading')
  })
  
  // ===== 页面结构测试 =====
  await runSuite('Task 15 - Page Structure', async () => {
    const loginCode = readFileSync(join(frontendRoot, 'src/pages/Login.js'), 'utf-8')
    
    // 检查导出
    assertEqual(loginCode.includes('export class LoginPage'), true, 'Exports LoginPage class')
    assertEqual(loginCode.includes('async init()'), true, 'Has init method')
    assertEqual(loginCode.includes('render()'), true, 'Has render method')
    assertEqual(loginCode.includes('bindEvents()'), true, 'Has bindEvents method')
    
    // 检查组件使用
    assertEqual(loginCode.includes('Card({'), true, 'Uses Card component')
    assertEqual(loginCode.includes('Input({'), true, 'Uses Input component')
    assertEqual(loginCode.includes('Button({'), true, 'Uses Button component')
  })
  
  // ===== 用户体验测试 =====
  await runSuite('Task 15 - User Experience', async () => {
    const loginCode = readFileSync(join(frontendRoot, 'src/pages/Login.js'), 'utf-8')
    
    // 检查自动完成
    assertEqual(loginCode.includes("autocomplete: 'url'"), true, 'Has URL autocomplete')
    assertEqual(loginCode.includes("autocomplete: 'current-password'"), true, 'Has password autocomplete')
    
    // 检查回车支持
    assertEqual(loginCode.includes("e.key === 'Enter'"), true, 'Supports Enter key')
    
    // 检查延迟跳转
    assertEqual(loginCode.includes('setTimeout'), true, 'Has delay before redirect')
    
    // 检查帮助文本
    assertEqual(loginCode.includes('查看部署指南'), true, 'Has deployment guide link')
  })
  
  // ===== 路由守卫测试 =====
  await runSuite('Task 15 - Router Guard', async () => {
    const routerCode = readFileSync(join(frontendRoot, 'src/router/index.js'), 'utf-8')
    
    // 检查已登录访问登录页的重定向
    assertEqual(
      routerCode.includes("route.path === '/login' && isLoggedIn()"),
      true,
      'Redirects logged-in users from login page'
    )
    assertEqual(
      routerCode.includes("navigateTo('/admin/dashboard')"),
      true,
      'Redirects to dashboard when already logged in'
    )
    
    // 检查认证检查
    assertEqual(
      routerCode.includes('route.meta?.requiresAuth && !isLoggedIn()'),
      true,
      'Checks auth for protected routes'
    )
  })
  
  // ===== 存储工具测试 =====
  await runSuite('Task 15 - Storage Utilities', async () => {
    const storageCode = readFileSync(join(frontendRoot, 'src/utils/storage.js'), 'utf-8')
    
    assertEqual(storageCode.includes('export function setApiEndpoint'), true, 'Has setApiEndpoint')
    assertEqual(storageCode.includes('export function setApiToken'), true, 'Has setApiToken')
    assertEqual(storageCode.includes('export function getApiEndpoint'), true, 'Has getApiEndpoint')
    assertEqual(storageCode.includes('export function getApiToken'), true, 'Has getApiToken')
    assertEqual(storageCode.includes('export function isLoggedIn'), true, 'Has isLoggedIn')
    assertEqual(storageCode.includes('export function clearAuth'), true, 'Has clearAuth')
  })
}

// 运行测试
runLoginTests()
  .then(() => {
    console.log('[Test] Login tests completed')
  })
  .catch((error) => {
    console.error('[Test] Login tests failed:', error)
    process.exit(1)
  })
