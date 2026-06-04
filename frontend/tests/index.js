#!/usr/bin/env node

/**
 * 前端测试入口
 */

import { runProjectTests } from './project-structure.test.js'
import { runP2FixesTests } from './p2-fixes.test.js'
import { runRouterConfigTests } from './router-config.test.js'
import { runUtils } from './utils.test.js'
import { runRouterUtils } from './router-utils.test.js'
import { runComponentsTests } from './components.test.js'
import { runPublicDashboardTests } from './pages/public-dashboard.test.js'
import { runLoginTests } from './pages/login.test.js'
import { runAdminLayoutTests } from './pages/admin-layout.test.js'
import { runAdminDomainsTests } from './pages/admin-domains.test.js'
import { runAdminConfigTests } from './pages/admin-config.test.js'

console.log('\n')
console.log('╔══════════════════════════════════════════════════════════╗')
console.log('║     Domain Monitor Frontend - Unit Tests                ║')
console.log('╚══════════════════════════════════════════════════════════╝')

async function runAllTests() {
  try {
    // 项目结构测试
    await runProjectTests()
    
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
    
    // 登录页测试（任务 15）
    await runLoginTests()
    
    // 管理后台布局测试（任务 16）
    await runAdminLayoutTests()
    
    // 管理后台域名管理测试（任务 17）
    await runAdminDomainsTests()
    
    // 管理后台系统配置测试（任务 18）
    await runAdminConfigTests()
    
    console.log('\n✅ All tests passed!\n')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test runner error:', error)
    process.exit(1)
  }
}

runAllTests()
