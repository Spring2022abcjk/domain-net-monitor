// tests/p2-fixes.test.js

import { runSuite, assertEqual } from './test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

/**
 * P2 问题修复测试
 */
export async function runP2FixesTests() {
  // ========== API 超时测试 ==========
  await runSuite('P2 - API Timeout Implementation', async () => {
    const apiPath = join(frontendRoot, 'src/utils/api.js')
    const api = readFileSync(apiPath, 'utf-8')
    
    // 验证超时配置存在
    assertEqual(api.includes('timeout: 5000'), true, 'Has timeout config')
    
    // 验证超时逻辑实现
    assertEqual(api.includes('setTimeout'), true, 'Uses setTimeout for timeout')
    assertEqual(api.includes('Promise.race'), true, 'Uses Promise.race')
    assertEqual(api.includes('timeoutPromise'), true, 'Creates timeout promise')
    
    // 验证超时错误消息
    assertEqual(api.includes('Request timeout'), true, 'Has timeout error message')
    
    // 验证 setRequestTimeout 函数存在（重命名后的函数）
    assertEqual(api.includes('export function setRequestTimeout'), true, 'Has setRequestTimeout function')
  })
  
  // ========== 未使用导出函数测试 ==========
  await runSuite('P2 - Unused Exports Check', async () => {
    const apiPath = join(frontendRoot, 'src/utils/api.js')
    const api = readFileSync(apiPath, 'utf-8')
    
    // 验证 get, post, put, del 都有被实现
    assertEqual(api.includes('export function get('), true, 'Has get function')
    assertEqual(api.includes('export function post('), true, 'Has post function')
    assertEqual(api.includes('export function put('), true, 'Has put function')
    assertEqual(api.includes('export function del('), true, 'Has delete function')
    
    // 验证这些函数都有实际调用 request
    const hasGetImpl = api.includes('return request(') && api.includes('method: \'GET\'')
    const hasPostImpl = /export function post\(url,\s*body\)\s*{\s*return request\(url/.test(api)
    const hasPutImpl = /export function put\(url,\s*body\)\s*{\s*return request\(url/.test(api)
    const hasDelImpl = /export function del\(url\)\s*{\s*return request\(url/.test(api)
    
    assertEqual(hasGetImpl, true, 'Get function calls request')
    assertEqual(hasPostImpl, true, 'Post function calls request')
    assertEqual(hasPutImpl, true, 'Put function calls request')
    assertEqual(hasDelImpl, true, 'Delete function calls request')
  })
  
  // ========== Storage API 完整性测试 ==========
  await runSuite('P2 - Storage API Completeness', async () => {
    const storagePath = join(frontendRoot, 'src/utils/storage.js')
    const storage = readFileSync(storagePath, 'utf-8')
    
    // 验证所有导出函数都有实现
    assertEqual(storage.includes('export function getConfig('), true, 'Has getConfig')
    assertEqual(storage.includes('export function setConfig('), true, 'Has setConfig')
    assertEqual(storage.includes('export function clearConfig('), true, 'Has clearConfig')
    assertEqual(storage.includes('export function getApiEndpoint('), true, 'Has getApiEndpoint')
    assertEqual(storage.includes('export function setApiEndpoint('), true, 'Has setApiEndpoint')
    assertEqual(storage.includes('export function getApiToken('), true, 'Has getApiToken')
    assertEqual(storage.includes('export function setApiToken('), true, 'Has setApiToken')
    assertEqual(storage.includes('export function clearAuth('), true, 'Has clearAuth')
    assertEqual(storage.includes('export function isLoggedIn('), true, 'Has isLoggedIn')
  })
  
  // ========== CSS 命名规范测试 ==========
  await runSuite('P2 - CSS Naming Convention', async () => {
    const stylePath = join(frontendRoot, 'src/styles/index.css')
    const styles = readFileSync(stylePath, 'utf-8')
    
    // 验证自定义类名使用 dm- 前缀
    assertEqual(styles.includes('.dm-btn'), true, 'Has dm-btn class')
    assertEqual(styles.includes('.dm-btn-primary'), true, 'Has dm-btn-primary class')
    assertEqual(styles.includes('.dm-btn-secondary'), true, 'Has dm-btn-secondary class')
    assertEqual(styles.includes('.dm-card'), true, 'Has dm-card class')
    assertEqual(styles.includes('.dm-input'), true, 'Has dm-input class')
  })
}

export { runP2FixesTests as runP2Tests }
