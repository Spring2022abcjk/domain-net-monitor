/**
 * 前端自动化测试脚本
 * 验证构建产物、路由配置、组件加载等
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const distDir = join(__dirname, '../dist')

// 测试颜色
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
}

function log(symbol, message, color = colors.reset) {
  console.log(`${symbol} ${message}${colors.reset}`)
}

function pass(message) {
  log('✅', message, colors.green)
}

function fail(message) {
  log('❌', message, colors.red)
}

function info(message) {
  log('ℹ️', message, colors.blue)
}

function warn(message) {
  log('⚠️', message, colors.yellow)
}

// 测试 1: 检查构建产物是否存在
function testBuildArtifacts() {
  console.log('\n' + '='.repeat(60))
  info('测试 1: 构建产物完整性')
  console.log('='.repeat(60))
  
  let passed = 0
  let failed = 0
  
  // 检查关键文件
  const files = [
    { path: 'index.html', required: true },
    { path: 'assets/index-*.js', required: true, glob: true, base: 'index', ext: 'js' },
    { path: 'assets/index-*.css', required: true, glob: true, base: 'index', ext: 'css' },
    { path: 'assets/AdminLayout-*.js', required: true, glob: true, base: 'AdminLayout', ext: 'js' },
    { path: 'assets/AdminDashboard-*.js', required: true, glob: true, base: 'AdminDashboard', ext: 'js' }
  ]
  
  for (const file of files) {
    if (file.glob) {
      const assetsDir = join(distDir, 'assets')
      
      if (!existsSync(assetsDir)) {
        fail(`目录不存在：assets/`)
        failed++
        continue
      }
      
      const allFiles = readdirSync(assetsDir)
      const matchedFiles = allFiles.filter(f => 
        f.includes(file.base) && f.endsWith(file.ext)
      )
      
      if (matchedFiles.length > 0) {
        pass(`找到构建产物：${matchedFiles[0]}`)
        passed++
      } else if (file.required) {
        fail(`缺少必要文件：${file.path}`)
        failed++
      } else {
        warn(`可选文件不存在：${file.path}`)
      }
    } else {
      const fullPath = join(distDir, file.path)
      if (existsSync(fullPath)) {
        pass(`文件存在：${file.path}`)
        passed++
      } else if (file.required) {
        fail(`缺少必要文件：${file.path}`)
        failed++
      } else {
        warn(`可选文件不存在：${file.path}`)
      }
    }
  }
  
  info(`结果：${passed} 通过，${failed} 失败`)
  return failed === 0
}

// 测试 2: 验证 index.html 内容
function testIndexHtml() {
  console.log('\n' + '='.repeat(60))
  info('测试 2: index.html 内容验证')
  console.log('='.repeat(60))
  
  const indexPath = join(distDir, 'index.html')
  if (!existsSync(indexPath)) {
    fail('index.html 不存在')
    return false
  }
  
  const content = readFileSync(indexPath, 'utf8')
  const checks = [
    { pattern: /<div id="app"><\/div>/, name: 'App 挂载点' },
    { pattern: /<script type="module" crossorigin/, name: 'ESM 脚本标签' },
    { pattern: /link rel="stylesheet" crossorigin/, name: 'CSS 样式表' },
    { pattern: /assets\/index-.*\.js/, name: '动态 JS 引用' },
    { pattern: /assets\/index-.*\.css/, name: '动态 CSS 引用' }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const check of checks) {
    if (check.pattern.test(content)) {
      pass(`${check.name}: 正确`)
      passed++
    } else {
      fail(`${check.name}: 缺失`)
      failed++
    }
  }
  
  info(`结果：${passed} 通过，${failed} 失败`)
  return failed === 0
}

// 测试 3: 验证路由配置
function testRouterConfig() {
  console.log('\n' + '='.repeat(60))
  info('测试 3: 路由配置验证')
  console.log('='.repeat(60))
  
  const routerPath = join(__dirname, '../src/router/routes.js')
  if (!existsSync(routerPath)) {
    fail('路由配置文件不存在')
    return false
  }
  
  const content = readFileSync(routerPath, 'utf8')
  const checks = [
    { pattern: /path: '\/'/, name: '根路由' },
    { pattern: /path: '\/login'/, name: '登录页路由' },
    { pattern: /path: '\/admin'/, name: '管理后台路由' },
    { pattern: /path: 'dashboard'/, name: 'Dashboard 子路由' },
    { pattern: /path: 'domains'/, name: '域名管理子路由' },
    { pattern: /path: 'config'/, name: '配置页子路由' },
    { pattern: /path: 'history'/, name: '历史记录子路由' },
    { pattern: /path: 'stats'/, name: '统计页子路由' },
    { pattern: /import\(['"]\.\.\/pages.*\.js['"]\)/, name: '动态 import' },
    { pattern: /requiresAuth: true/, name: '认证守卫' }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const check of checks) {
    if (check.pattern.test(content)) {
      pass(`${check.name}: 已配置`)
      passed++
    } else {
      fail(`${check.name}: 未配置`)
      failed++
    }
  }
  
  info(`结果：${passed} 通过，${failed} 失败`)
  return failed === 0
}

// 测试 4: 验证组件导出
function testComponentExports() {
  console.log('\n' + '='.repeat(60))
  info('测试 4: 组件导出验证')
  console.log('='.repeat(60))
  
  const components = [
    { path: '../src/pages/admin/AdminLayout.js', name: 'AdminLayout', export: 'AdminLayout' },
    { path: '../src/pages/admin/AdminDashboard.js', name: 'AdminDashboard', export: 'AdminDashboard' },
    { path: '../src/pages/Login.js', name: 'Login', export: 'Login' },
    { path: '../src/pages/PublicDashboard.js', name: 'PublicDashboard', export: 'PublicDashboard' }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const comp of components) {
    const compPath = join(__dirname, comp.path)
    if (!existsSync(compPath)) {
      fail(`${comp.name}: 文件不存在`)
      failed++
      continue
    }
    
    const content = readFileSync(compPath, 'utf8')
    const hasExport = new RegExp(`export (class|const|function) ${comp.export}`).test(content)
    const hasDefaultExport = /export default/.test(content)
    
    if (hasExport || hasDefaultExport) {
      pass(`${comp.name}: 导出正确`)
      passed++
    } else {
      fail(`${comp.name}: 缺少导出`)
      failed++
    }
  }
  
  info(`结果：${passed} 通过，${failed} 失败`)
  return failed === 0
}

// 测试 5: 验证 API 配置
function testApiConfig() {
  console.log('\n' + '='.repeat(60))
  info('测试 5: API 配置验证')
  console.log('='.repeat(60))
  
  const envFile = join(__dirname, '../.env.production')
  if (!existsSync(envFile)) {
    warn('.env.production 不存在，使用默认配置')
    return true
  }
  
  const content = readFileSync(envFile, 'utf8')
  const checks = [
    { pattern: /VITE_API_BASE_URL=https?:\/\/.+/, name: 'API 基础 URL' }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const check of checks) {
    if (check.pattern.test(content)) {
      pass(`${check.name}: 已配置`)
      passed++
    } else {
      fail(`${check.name}: 未配置`)
      failed++
    }
  }
  
  info(`结果：${passed} 通过，${failed} 失败`)
  return failed === 0
}

// 测试 6: 动态 import 语法检查
function testDynamicImports() {
  console.log('\n' + '='.repeat(60))
  info('测试 6: 动态 import 语法检查')
  console.log('='.repeat(60))
  
  const routerFile = join(__dirname, '../src/router/index.js')
  if (!existsSync(routerFile)) {
    fail('router/index.js 不存在')
    return false
  }
  
  const content = readFileSync(routerFile, 'utf8')
  
  // 检查关键修复点
  const checks = [
    { pattern: /await route\.component\(\)/, name: 'await 动态 import 调用' },
    { pattern: /module\.default\s*\|\|/, name: 'module.default 解构' },
    { pattern: /module\[Object\.keys\(module\)/, name: '命名导出备用解构' },
    { pattern: /try\s*{[\s\S]*?await route\.component/, name: '错误处理包装' }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const check of checks) {
    if (check.pattern.test(content)) {
      pass(`${check.name}: 正确`)
      passed++
    } else {
      fail(`${check.name}: 缺失`)
      failed++
    }
  }
  
  info(`结果：${passed} 通过，${failed} 失败`)
  return failed === 0
}

// 测试 7: API 路由可达性（可选，如果本地有服务）
async function testApiReachability() {
  console.log('\n' + '='.repeat(60))
  info('测试 7: 后端 API 可达性（可选）')
  console.log('='.repeat(60))
  
  // 读取 API URL
  const envFile = join(__dirname, '../.env.production')
  if (!existsSync(envFile)) {
    warn('跳过 API 测试：.env.production 不存在')
    return true
  }
  
  const content = readFileSync(envFile, 'utf8')
  const match = content.match(/VITE_API_BASE_URL=(https?:\/\/.+)/)
  if (!match) {
    warn('跳过 API 测试：VITE_API_BASE_URL 未配置')
    return true
  }
  
  const apiUrl = match[1]
  
  try {
    const { default: fetch } = await import('node-fetch')
    const response = await fetch(`${apiUrl}/health`, { method: 'GET', timeout: 5000 })
    
    if (response.ok) {
      const data = await response.json()
      pass(`API 健康检查通过：${apiUrl}`)
      return true
    } else {
      fail(`API 返回错误状态：${response.status}`)
      return false
    }
  } catch (error) {
    warn(`API 不可达：${error.message}（后端未启动或网络问题）`)
    return true // 不视为失败，因为可能是后端未本地启动
  }
}

// 主测试运行器
async function runTests() {
  console.log('\n')
  console.log('╔' + '═'.repeat(58) + '╗')
  console.log('║' + ' '.repeat(14) + '前端自动化测试套件' + ' '.repeat(15) + '║')
  console.log('╚' + '═'.repeat(58) + '╝')
  
  const tests = [
    { name: '构建产物', fn: testBuildArtifacts },
    { name: 'index.html', fn: testIndexHtml },
    { name: '路由配置', fn: testRouterConfig },
    { name: '组件导出', fn: testComponentExports },
    { name: 'API 配置', fn: testApiConfig },
    { name: '动态 import', fn: testDynamicImports },
    { name: 'API 可达性', fn: testApiReachability, optional: true }
  ]
  
  const results = []
  
  for (const test of tests) {
    try {
      const result = await test.fn()
      results.push({ name: test.name, passed: result, optional: test.optional })
    } catch (error) {
      console.error(colors.red, `测试 "${test.name}" 异常:`, error.message, colors.reset)
      results.push({ name: test.name, passed: false, optional: test.optional })
    }
  }
  
  // 汇总报告
  console.log('\n' + '='.repeat(60))
  info('测试汇总报告')
  console.log('='.repeat(60))
  
  console.log('\n各测试项结果:')
  for (const result of results) {
    const icon = result.passed ? '✅' : (result.optional ? '⚠️' : '❌')
    const status = result.passed ? '通过' : (result.optional ? '跳过/警告' : '失败')
    console.log(`  ${icon} ${result.name}: ${status}`)
  }
  
  const required = results.filter(r => !r.optional)
  const passed = required.filter(r => r.passed).length
  const total = required.length
  
  console.log('\n' + '-'.repeat(60))
  console.log(`总计：${passed}/${total} 必测通过`)
  
  if (passed === total) {
    console.log(colors.green + '\n🎉 所有必测通过！可以安全部署。' + colors.reset)
    return 0
  } else {
    console.log(colors.red + '\n⚠️  部分测试失败，请检查上述错误。' + colors.reset)
    return 1
  }
}

// 执行测试
runTests().then(code => {
  process.exit(code)
}).catch(error => {
  console.error(colors.red, '测试执行异常:', error, colors.reset)
  process.exit(1)
})
