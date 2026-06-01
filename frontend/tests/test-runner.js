/**
 * 测试执行辅助函数
 */

/**
 * 运行测试套件
 * @param {string} name - 套件名称
 * @param {Function} fn - 测试函数
 */
export async function runSuite(name, fn) {
  console.log('\n' + '='.repeat(50))
  console.log(`Running: ${name}`)
  console.log('='.repeat(50))
  
  try {
    await fn()
    console.log(`✅ Suite "${name}" passed\n`)
  } catch (error) {
    console.error(`❌ Suite "${name}" failed:`)
    console.error(error)
    throw error
  }
}

/**
 * 断言相等
 * @param {any} actual - 实际值
 * @param {any} expected - 期望值
 * @param {string} message - 消息
 */
export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} (expected: ${expected}, got: ${actual})`)
  }
  console.log(`  ✓ ${message} (expected: ${expected}, got: ${actual})`)
}

/**
 * 断言
 * @param {boolean} condition - 条件
 * @param {string} message - 消息
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
  console.log(`  ✓ ${message}`)
}
