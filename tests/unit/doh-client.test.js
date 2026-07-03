import { queryDoH } from '../../src/doh/client.js'
import { DNS_TYPE_HTTPS, DNS_TYPE_AAAA } from '../../src/config.js'
import { assert, assertEqual, runSuite } from '../test-runner.js'

const MOCK_DOH_RESPONSE = {
  Status: 0,
  TC: false,
  RD: true,
  RA: true,
  Question: [{ name: 'example.com', type: DNS_TYPE_HTTPS }],
  Answer: [{ name: 'example.com', type: DNS_TYPE_HTTPS, TTL: 300, data: '...' }],
}

const MOCK_AAAA_RESPONSE = {
  Status: 0,
  Answer: [{ name: 'example.com', type: DNS_TYPE_AAAA, TTL: 300, data: '2606:2800:220:1:248:1893:25c8:1946' }],
}

const MOCK_EMPTY_RESPONSE = {
  Status: 0,
  Answer: [],
}

const ORIGINAL_FETCH = globalThis.fetch

function mockFetch(mockData) {
  globalThis.fetch = async (_url) => {
    return new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH
}

async function testQueryDoHSuccess() {
  await runSuite('queryDoH() - Success cases', async () => {
    mockFetch(MOCK_DOH_RESPONSE)

    try {
      const result = await queryDoH('example.com', DNS_TYPE_HTTPS)
      assertEqual(result.Status, 0, 'DNS Status code')
      assert(result.Answer && result.Answer.length > 0, 'Has Answer records')
    } finally {
      restoreFetch()
    }
  })
}

async function testQueryDoHBackup() {
  await runSuite('queryDoH() - Backup failover', async () => {
    let callCount = 0

    globalThis.fetch = async (_url) => {
      callCount++
      if (callCount === 1) {
        throw new Error('Primary endpoint failed')
      }
      return new Response(JSON.stringify(MOCK_DOH_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      await queryDoH('example.com', DNS_TYPE_HTTPS)
      assertEqual(callCount, 2, 'Called both primary and backup')
    } finally {
      restoreFetch()
    }
  })
}

async function testQueryDoHBothFailed() {
  await runSuite('queryDoH() - Both endpoints failed', async () => {
    globalThis.fetch = async () => {
      throw new Error('Network error')
    }

    try {
      await queryDoH('example.com', DNS_TYPE_HTTPS)
      assert(false, 'Should have thrown error')
    } catch (error) {
      assert(error.message.includes('Both DoH endpoints failed'), 'Error message contains expected text')
    } finally {
      restoreFetch()
    }
  })
}

async function testQueryDoHAAAA() {
  await runSuite('queryDoH() - AAAA query', async () => {
    mockFetch(MOCK_AAAA_RESPONSE)

    try {
      const result = await queryDoH('example.com', DNS_TYPE_AAAA)
      assertEqual(result.Status, 0, 'DNS Status code')
      assert(result.Answer && result.Answer.length === 1, 'Has AAAA record')
    } finally {
      restoreFetch()
    }
  })
}

async function testQueryDoHEmptyAnswer() {
  await runSuite('queryDoH() - Empty Answer', async () => {
    mockFetch(MOCK_EMPTY_RESPONSE)

    try {
      const result = await queryDoH('example.com', DNS_TYPE_HTTPS)
      assertEqual(result.Status, 0, 'DNS Status code')
      assertEqual(result.Answer.length, 0, 'Empty Answer array')
    } finally {
      restoreFetch()
    }
  })
}

export async function runDoHTests() {
  await testQueryDoHSuccess()
  await testQueryDoHBackup()
  await testQueryDoHBothFailed()
  await testQueryDoHAAAA()
  await testQueryDoHEmptyAnswer()
}
