#!/usr/bin/env node

/**
 * 前端测试入口
 */

import { runProjectTests } from './project-structure.test.js'
import { runLoginPageTests } from './login-page.test.js'
import { runP2FixesTests } from './p2-fixes.test.js'
import { runRouterConfigTests } from './router-config.test.js'

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
    
    console.log('\n✅ All tests passed!\n')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test runner error:', error)
    process.exit(1)
  }
}

runAllTests()
