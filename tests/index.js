#!/usr/bin/env node

/**
 * 单元测试入口
 * 运行所有单元测试
 */

import { printSummary } from './test-runner.js';
import { runHelperTests } from './unit/helper.test.js';
import { runCorsIntegrationTests } from './integration/cors.test.js';
import { runDoHTests } from './unit/doh-client.test.js';
import { runDetectorTests } from './unit/detectors.test.js';
import { runStorageTests } from './unit/storage.test.js';
import { runRoutesTests } from './unit/routes.test.js';
import { runStorageExtensionsTests } from './unit/storage-extensions.test.js';
import { runAuthIntegrationTests } from './integration/auth.test.js';

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     Cloudflare Domain Monitor - Unit Tests              ║');
console.log('╚══════════════════════════════════════════════════════════╝');

async function runAllTests() {
  try {
    // Phase 1: 核心工具函数
    await runHelperTests();
    await runCorsIntegrationTests();
    
    // Phase 2+: 其他测试
    await runDoHTests();
    await runDetectorTests();
    await runStorageTests();
    await runRoutesTests();
    await runStorageExtensionsTests();
    await runAuthIntegrationTests();
    
    const allPassed = printSummary();
    
    if (allPassed) {
      console.log('\n✅ All tests passed!\n');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed!\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test runner error:', error);
    process.exit(1);
  }
}

runAllTests();
