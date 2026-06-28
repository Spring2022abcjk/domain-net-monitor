/**
 * 测试运行器入口
 * 运行所有单元测试和集成测试
 */
import { runComponentsTests } from './components.test.js'
import { runUtils } from './utils.test.js'
import { runRouterUtils } from './router-utils.test.js'
import { runRouterTests } from './router-config.test.js'
import { runStructureTests } from './project-structure.test.js'
import { runLoginTests } from './pages/login.test.js'
import { runLoginIntegrationTests } from './pages/login-integration.test.js'
import { runAPIIntegrationTests } from './api-integration.test.js'
import { runAdminDashboardTests } from './pages/admin-dashboard.test.js'
import { runPublicDashboardTests } from './pages/public-dashboard.test.js'
import { runDomainDetailTests } from './pages/domain-detail.test.js'

console.log('')
console.log('╔════════════════════════════════════════╗')
console.log('║   Domain Monitor Frontend Tests       ║')
console.log('╚════════════════════════════════════════╝')
console.log('')

const testGroups = [
  {
    name: 'Unit Tests',
    tests: [
      runComponentsTests,
      runUtils,
      runRouterUtils,
      runRouterTests,
      runStructureTests,
      runLoginTests,
      runLoginIntegrationTests,
      runAdminDashboardTests,
      runPublicDashboardTests,
      runDomainDetailTests
    ]
  },
  {
    name: 'Integration Tests',
    tests: [
      runAPIIntegrationTests
    ]
  }
]

async function runAllTests() {
  const startTime = Date.now()
  
  for (const group of testGroups) {
    console.log('')
    console.log(`═══════════════════════════════════════════`)
    console.log(`  Running: ${group.name}`)
    console.log(`═══════════════════════════════════════════`)
    console.log('')
    
    for (const test of group.tests) {
      await test()
    }
  }
  
  const duration = Date.now() - startTime
  console.log('')
  console.log(`═══════════════════════════════════════════`)
  console.log(`  All tests completed in ${duration}ms`)
  console.log(`═══════════════════════════════════════════`)
  console.log('')
}

runAllTests()
  .then(() => {
    console.log('✅ All tests passed!')
  })
  .catch((error) => {
    console.error('❌ Tests failed:')
    console.error(error)
    process.exit(1)
  })
