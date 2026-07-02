// tests/unit/detector-exports.test.js

import assert from 'node:assert/strict'
import { runSuite, assertEqual } from '../test-runner.js'

/**
 * Detector 模块导出测试
 */
export async function runDetectorExportsTests() {
  await runSuite('Detector module exports', async () => {
    const detector = await import('../../src/services/detector.js')

    assertEqual(typeof detector.queryDoh, 'function', 'queryDoh is exported')
    assertEqual(typeof detector.detectDomain, 'function', 'detectDomain is exported')
    assertEqual(typeof detector.saveResult, 'function', 'saveResult is exported')
    assertEqual(typeof detector.addToHistory, 'function', 'addToHistory is exported')
  })
}
