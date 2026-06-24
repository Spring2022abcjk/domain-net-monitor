// tests/utils.test.js

import { runSuite, assertEqual } from './test-runner.js'
import { 
  formatDate, 
  formatRelativeTime, 
  isValidEmail, 
  isValidURL,
  debounce,
  throttle,
  deepClone,
  formatNumber,
  generateElementId,
  isValidDomain
} from '../src/utils/index.js'

/**
 * 工具函数测试
 */
async function runUtilsTests() {
  // ========== formatDate 测试 ==========
  await runSuite('Utils - formatDate', async () => {
    const date = '2026-06-01T12:30:45'
    assertEqual(
      formatDate(date, 'YYYY-MM-DD'),
      '2026-06-01',
      'Formats date to YYYY-MM-DD'
    )
    assertEqual(
      formatDate(date, 'YYYY/MM/DD HH:mm:ss'),
      '2026/06/01 12:30:45',
      'Formats date with custom format'
    )
    assertEqual(
      formatDate(date),
      '2026-06-01 12:30:45',
      'Uses default format'
    )
  })
  
  // ========== formatRelativeTime 测试 ==========
  await runSuite('Utils - formatRelativeTime', async () => {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    
    assertEqual(
      formatRelativeTime(now).includes('刚刚'),
      true,
      'Returns 刚刚 for current time'
    )
    assertEqual(
      formatRelativeTime(fiveMinutesAgo).includes('分钟前'),
      true,
      'Returns 分钟前 for recent time'
    )
    assertEqual(
      formatRelativeTime(twoHoursAgo).includes('小时前'),
      true,
      'Returns 小时前 for hours ago'
    )
    assertEqual(
      formatRelativeTime(threeDaysAgo).includes('天前'),
      true,
      'Returns 天前 for days ago'
    )
  })
  
  // ========== isValidEmail 测试 ==========
  await runSuite('Utils - isValidEmail', async () => {
    assertEqual(isValidEmail('test@example.com'), true, 'Valid email')
    assertEqual(isValidEmail('user.name@domain.org'), true, 'Valid email with dot')
    assertEqual(isValidEmail('invalid'), false, 'Invalid email - no @')
    assertEqual(isValidEmail('@example.com'), false, 'Invalid email - no username')
    assertEqual(isValidEmail('test@'), false, 'Invalid email - no domain')
  })
  
  // ========== isValidURL 测试 ==========
  await runSuite('Utils - isValidURL', async () => {
    assertEqual(isValidURL('https://example.com'), true, 'Valid HTTPS URL')
    assertEqual(isValidURL('http://localhost:3000'), true, 'Valid HTTP URL')
    assertEqual(isValidURL('not-a-url'), false, 'Invalid URL')
    assertEqual(isValidURL(''), false, 'Empty string')
  })
  
  // ========== deepClone 测试 ==========
  await runSuite('Utils - deepClone', async () => {
    // 基础对象
    const original = { a: 1, b: { c: 2 } }
    const cloned = deepClone(original)
    assertEqual(cloned.a, 1, 'Clones primitive values')
    assertEqual(cloned.b.c, 2, 'Clones nested objects')
    assertEqual(cloned === original, false, 'Creates new reference')
    assertEqual(cloned.b === original.b, false, 'Creates new nested reference')
    
    // Date 类型
    const date = new Date('2026-06-01T12:30:45')
    const clonedDate = deepClone(date)
    assertEqual(clonedDate.getTime(), date.getTime(), 'Clones Date')
    assertEqual(clonedDate instanceof Date, true, 'Cloned is Date instance')
    assertEqual(clonedDate !== date, true, 'Different Date reference')
    
    // RegExp 类型
    const regex = /test/gi
    const clonedRegex = deepClone(regex)
    assertEqual(clonedRegex.source, 'test', 'Clones RegExp source')
    assertEqual(clonedRegex.flags, 'gi', 'Clones RegExp flags')
    assertEqual(clonedRegex instanceof RegExp, true, 'Cloned is RegExp instance')
    
    // Map 类型
    const map = new Map([['key', 'value']])
    const clonedMap = deepClone(map)
    assertEqual(clonedMap.get('key'), 'value', 'Clones Map')
    assertEqual(clonedMap instanceof Map, true, 'Cloned is Map instance')
    assertEqual(clonedMap !== map, true, 'Different Map reference')
    
    // Set 类型
    const set = new Set([1, 2, 3])
    const clonedSet = deepClone(set)
    assertEqual(clonedSet.has(1), true, 'Clones Set')
    assertEqual(clonedSet instanceof Set, true, 'Cloned is Set instance')
    assertEqual(clonedSet !== set, true, 'Different Set reference')
    
    // ArrayBuffer
    const buffer = new ArrayBuffer(8)
    const clonedBuffer = deepClone(buffer)
    assertEqual(clonedBuffer.byteLength, 8, 'Clones ArrayBuffer')
    assertEqual(clonedBuffer instanceof ArrayBuffer, true, 'Cloned is ArrayBuffer')
    assertEqual(clonedBuffer !== buffer, true, 'Different ArrayBuffer reference')
    
    // TypedArray
    const typedArray = new Uint8Array([1, 2, 3, 4])
    const clonedTypedArray = deepClone(typedArray)
    assertEqual(clonedTypedArray.length, 4, 'Clones TypedArray length')
    assertEqual(clonedTypedArray[0], 1, 'Clones TypedArray values')
    assertEqual(clonedTypedArray !== typedArray, true, 'Different TypedArray reference')
    
    // 循环引用
    const circular = { a: 1 }
    circular.self = circular
    const clonedCircular = deepClone(circular)
    assertEqual(clonedCircular.a, 1, 'Clones circular reference value')
    assertEqual(clonedCircular !== circular, true, 'Different circular reference')
    
    // 数组
    const arr = [1, { a: 2 }, [3, 4]]
    const clonedArr = deepClone(arr)
    assertEqual(clonedArr.length, 3, 'Clones array length')
    assertEqual(clonedArr[0], 1, 'Clones array primitives')
    assertEqual(clonedArr[1].a, 2, 'Clones array objects')
    assertEqual(clonedArr[2][0], 3, 'Clones nested arrays')
    assertEqual(clonedArr !== arr, true, 'Different array reference')
    assertEqual(clonedArr[1] !== arr[1], true, 'Different nested object reference')
  })
  
  // ========== formatNumber 测试 ==========
  await runSuite('Utils - formatNumber', async () => {
    assertEqual(formatNumber(1000), '1,000', 'Formats thousands')
    assertEqual(formatNumber(1000000), '1,000,000', 'Formats millions')
    assertEqual(formatNumber(123), '123', 'Keeps small numbers')
  })
  
  // ========== debounce 测试 ==========
  await runSuite('Utils - debounce', async () => {
    let callCount = 0
    const fn = () => callCount++
    const debouncedFn = debounce(fn, 100)
    
    debouncedFn()
    debouncedFn()
    debouncedFn()
    
    assertEqual(callCount, 0, 'Does not call immediately')
    
    await new Promise(resolve => setTimeout(resolve, 150))
    assertEqual(callCount, 1, 'Calls once after delay')
  })

  // ========== debounce.cancel 测试 ==========
  await runSuite('Utils - debounce.cancel', async () => {
    let callCount = 0
    const fn = () => callCount++
    const debouncedFn = debounce(fn, 100)

    debouncedFn()
    assertEqual(callCount, 0, 'Not called before delay')

    debouncedFn.cancel()
    assertEqual(typeof debouncedFn.cancel, 'function', 'cancel is a function')

    await new Promise(resolve => setTimeout(resolve, 150))
    assertEqual(callCount, 0, 'Cancelled function never calls')
  })
  
  // ========== throttle 测试 ==========
  await runSuite('Utils - throttle', async () => {
    let callCount = 0
    const fn = () => callCount++
    const throttledFn = throttle(fn, 100)
    
    throttledFn()
    throttledFn()
    throttledFn()
    
    assertEqual(callCount, 1, 'Calls once immediately')
    
    await new Promise(resolve => setTimeout(resolve, 150))
    throttledFn()
    assertEqual(callCount, 2, 'Allows another call after limit')
  })
  
  // ========== generateElementId 测试 ==========
  await runSuite('Utils - generateElementId', async () => {
    assertEqual(generateElementId('btn', 'test.com'), 'btn-test_com', 'Replaces dots with underscores')
    assertEqual(generateElementId('btn', 'sub.example.com'), 'btn-sub_example_com', 'Handles subdomains')
    assertEqual(generateElementId('btn', 'test-domain'), 'btn-test_domain', 'Replaces hyphens with underscores')
    assertEqual(generateElementId('btn', 'TEST.COM'), 'btn-TEST_COM', 'Keeps uppercase')
  })
  
  // ========== isValidDomain 测试 ==========
  await runSuite('Utils - isValidDomain', async () => {
    assertEqual(isValidDomain('example.com'), true, 'Valid domain')
    assertEqual(isValidDomain('sub.example.com'), true, 'Valid subdomain')
    assertEqual(isValidDomain('test-domain.com'), true, 'Domain with hyphen')
    assertEqual(isValidDomain(''), false, 'Empty string')
    assertEqual(isValidDomain(null), false, 'Null value')
    assertEqual(isValidDomain('not-a-domain'), false, 'No TLD')
    assertEqual(isValidDomain('.com'), false, 'No domain name')
    assertEqual(isValidDomain('example.'), false, 'No TLD')
  })
}

export { runUtilsTests as runUtils }
