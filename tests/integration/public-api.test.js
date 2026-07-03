/**
 * 公开 API 集成测试 - 简化版
 * 主要验证域名格式验证逻辑
 */

import { runSuite, assertEqual } from '../test-runner.js'
import { isValidDomain } from '../../src/utils/helper.js'

export async function runPublicApiTests() {
  await runSuite('Domain Validation - isValidDomain', async () => {
    // Valid domains
    assertEqual(isValidDomain('example.com'), true, 'Valid simple domain')
    assertEqual(isValidDomain('cloudflare.com'), true, 'Valid domain')
    assertEqual(isValidDomain('sub.example.com'), true, 'Valid subdomain')
    assertEqual(isValidDomain('test-domain.com'), true, 'Domain with hyphen')
    assertEqual(isValidDomain('a.co'), true, 'Short TLD')

    // Invalid domains
    assertEqual(isValidDomain(''), false, 'Empty string')
    assertEqual(isValidDomain(null), false, 'Null value')
    assertEqual(isValidDomain(undefined), false, 'Undefined value')
    assertEqual(isValidDomain('not-a-domain'), false, 'No TLD')
    assertEqual(isValidDomain('localhost'), false, 'Single word')
    assertEqual(isValidDomain('.com'), false, 'No domain name')
    assertEqual(isValidDomain('example.'), false, 'No TLD after dot')
    assertEqual(isValidDomain('example'), false, 'No dot')
  })
}
