#!/usr/bin/env node

/**
 * 前端测试入口
 */

import { runProjectTests } from './project-structure.test.js'
import { runLoginPageTests } from './login-page.test.js'
import { runP2FixesTests } from './p2-fixes.test.js'
import { runRouterConfigTests } from './router-config.test.js'
import { runUtils } from './utils.test.js'
import { runRouterUtils } from './router-utils.test.js'
import { runComponentsTests } from './components.test.js'
import { runPublicDashboardTests } from './pages/public-dashboard.test.js'

console.log('\n')
console.log('╔══════════════════════════════════════════════════════════╗')
console.log('║     Domain Monitor Frontend - Unit Tests                ║')
console.log('╚══════════════════════════════════════════════════════════╝')

async function runAllTests() {
  try {
    // 项目结构测试
    await runProjectTests()
    
    // 登录页面功能测试
    await runLoginPageTests()
    
    // P2 修复测试
    await runP2FixesTests()
    
    // 路由配置测试
    await runRouterConfigTests()
    
    // 工具函数测试
    await runUtils()
    
    // 路由工具函数测试
    await runRouterUtils()
    
    // 组件测试
    await runComponentsTests()
    
    // 页面测试
    await runPublicDashboardTests()
    
    console.log('\n✅ All tests passed!\n')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test runner error:', error)
    process.exit(1)
  }
}

runAllTests()
