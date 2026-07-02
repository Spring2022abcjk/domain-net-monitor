import {
  getDomainList,
  setDomainList,
  addDomain,
  removeDomain,
  getResult,
  setResult,
  getAllResults,
} from '../../src/storage/kv.js'
import { assert, assertEqual, runSuite } from '../test-runner.js'

// Mock KV 存储
class MockKV {
  constructor() {
    this.store = new Map()
  }

  async get(key) {
    return this.store.get(key) || null
  }

  async put(key, value) {
    this.store.set(key, value)
  }

  async delete(key) {
    this.store.delete(key)
  }
}

function createMockEnv() {
  const kv = new MockKV()
  return { DOMAIN_MONITOR_KV: kv }
}

async function testDomainListOperations() {
  await runSuite('Domain List Operations', async () => {
    const env = createMockEnv()

    // 初始为空
    let list = await getDomainList(env)
    assertEqual(list.length, 0, 'Initial list is empty')

    // 设置列表
    await setDomainList(env, ['a.com', 'b.com'])
    list = await getDomainList(env)
    assertEqual(list.length, 2, 'List has 2 items')
    assertEqual(list[0], 'a.com', 'First item')
    assertEqual(list[1], 'b.com', 'Second item')

    // 追加域名（新）
    const added = await addDomain(env, 'c.com')
    assertEqual(added, true, 'Add new domain returns true')
    list = await getDomainList(env)
    assertEqual(list.length, 3, 'List has 3 items after add')

    // 追加域名（已存在）
    const addedAgain = await addDomain(env, 'a.com')
    assertEqual(addedAgain, false, 'Add existing domain returns false')
    list = await getDomainList(env)
    assertEqual(list.length, 3, 'List still has 3 items')

    // 删除域名（存在）
    const removed = await removeDomain(env, 'b.com')
    assertEqual(removed, true, 'Remove existing domain returns true')
    list = await getDomainList(env)
    assertEqual(list.length, 2, 'List has 2 items after remove')

    // 删除域名（不存在）
    const removedAgain = await removeDomain(env, 'b.com')
    assertEqual(removedAgain, false, 'Remove non-existent domain returns false')
  })
}

async function testResultOperations() {
  await runSuite('Result Operations', async () => {
    const env = createMockEnv()

    // 查询不存在的结果
    let result = await getResult(env, 'example.com')
    assertEqual(result, null, 'Non-existent result is null')

    // 写入结果
    const mockResult = {
      domain: 'example.com',
      timestamp: 1234567890,
      https_rr: { status: 'ok' },
      ech: { status: 'no' },
      ipv6: { status: 'ok' },
    }

    await setResult(env, 'example.com', mockResult)

    // 读取结果
    result = await getResult(env, 'example.com')
    assertEqual(result.domain, 'example.com', 'Result domain')
    assertEqual(result.timestamp, 1234567890, 'Result timestamp')
    assertEqual(result.https_rr.status, 'ok', 'HTTPS RR status')

    // 批量读取（空列表）
    await setDomainList(env, [])
    let allResults = await getAllResults(env)
    assertEqual(allResults.length, 0, 'Empty list returns empty results')

    // 批量读取（有数据）
    await setDomainList(env, ['example.com'])
    allResults = await getAllResults(env)
    assertEqual(allResults.length, 1, 'Has one result')

    // 批量读取（部分不存在）
    await setDomainList(env, ['example.com', 'nonexistent.com'])
    allResults = await getAllResults(env)
    assertEqual(allResults.length, 1, 'Only existing results returned')
  })
}

async function testKVBindingError() {
  await runSuite('KV Binding Error', async () => {
    const emptyEnv = {}

    try {
      await getDomainList(emptyEnv)
      assert(false, 'Should have thrown error')
    } catch (error) {
      assert(error.message.includes('KV binding not found'), 'Error message helpful')
    }
  })
}

export async function runStorageTests() {
  await testDomainListOperations()
  await testResultOperations()
  await testKVBindingError()
}
