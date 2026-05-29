/**
 * 简易测试框架
 * 用于运行单元测试并报告结果
 */

const results = {
  passed: 0,
  failed: 0,
  total: 0,
  failures: []
};

function assert(condition, message) {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`  ✓ ${message}`);
  } else {
    results.failed++;
    results.failures.push(message);
    console.log(`  ✗ ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  assert(pass, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
}

function assertThrows(fn, message) {
  results.total++;
  try {
    fn();
    results.failed++;
    results.failures.push(message);
    console.log(`  ✗ ${message} - No error thrown`);
  } catch (e) {
    results.passed++;
    console.log(`  ✓ ${message}`);
  }
}

async function runSuite(name, testFn) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Running: ${name}`);
  console.log('='.repeat(50));
  
  const beforePassed = results.passed;
  const beforeFailed = results.failed;
  
  await testFn();
  
  const suitePassed = results.passed - beforePassed;
  const suiteFailed = results.failed - beforeFailed;
  
  console.log(`\nSuite "${name}": ${suitePassed} passed, ${suiteFailed} failed`);
}

function printSummary() {
  console.log(`\n${'='.repeat(50)}`);
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  
  if (results.failures.length > 0) {
    console.log('\nFailures:');
    results.failures.forEach(f => console.log(`  - ${f}`));
  }
  
  console.log('='.repeat(50));
  
  return results.failed === 0;
}

export { assert, assertEqual, assertThrows, runSuite, printSummary };
