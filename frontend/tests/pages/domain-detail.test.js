/**
 * 域名详情页测试
 * 任务 28：验证 DomainDetail 页面生命周期和渲染逻辑
 */
import { runSuite, assertEqual } from '../test-runner.js'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '../..')

export async function runDomainDetailTests() {
  await runSuite('DomainDetail File Exists', () => {
    assertEqual(
      existsSync(join(ROOT, 'src/pages/DomainDetail.js')),
      true,
      'DomainDetail.js exists'
    )
  })

  await runSuite('DomainDetail Class Structure', () => {
    const content = readFileSync(join(ROOT, 'src/pages/DomainDetail.js'), 'utf-8')

    assertEqual(content.includes('export class DomainDetail'), true,
      'Exports DomainDetail class')
    assertEqual(content.includes('async init('), true,
      'Has init method')
    assertEqual(content.includes('render()'), true,
      'Has render method')
    assertEqual(content.includes('bindEvents()'), true,
      'Has bindEvents method')
    assertEqual(content.includes('destroy()'), true,
      'Has destroy method')
    assertEqual(content.includes('this.__backHandler'), true,
      'Stores back handler reference in constructor')
    assertEqual(content.includes("addEventListener('click', this.__backHandler)"), true,
      'Uses addEventListener with handler reference')
    assertEqual(content.includes("removeEventListener('click', this.__backHandler)"), true,
      'Has removeEventListener in destroy')
  })

  await runSuite('DomainDetail Data Loading', () => {
    const content = readFileSync(join(ROOT, 'src/pages/DomainDetail.js'), 'utf-8')

    assertEqual(content.includes('/api/public/stats'), true,
      'Calls public stats API')
    assertEqual(content.includes('encodeURIComponent(this.domain)'), true,
      'Encodes domain in API URL')
    assertEqual(content.includes('this.stats = res.data'), true,
      'Extracts res.data')
    assertEqual(content.includes("decodeURIComponent(params.domain)"), true,
      'Decodes domain param')
    assertEqual(content.includes('this.loading'), true,
      'Has loading state')
    assertEqual(content.includes('this.error'), true,
      'Has error state')
  })

  await runSuite('DomainDetail Render Output', () => {
    const content = readFileSync(join(ROOT, 'src/pages/DomainDetail.js'), 'utf-8')

    assertEqual(content.includes('this.stats.domain'), true,
      'Renders domain name')
    assertEqual(content.includes('this.stats.successRate'), true,
      'Renders success rate')
    assertEqual(content.includes('this.stats.totalChecks'), true,
      'Renders total checks')
    assertEqual(content.includes('this.stats.firstSeen'), true,
      'Renders first seen date')
    assertEqual(content.includes('this.stats.lastChecked'), true,
      'Renders last checked date')
    assertEqual(content.includes('this.stats.latestResults'), true,
      'Renders latest results table')
    assertEqual(content.includes('id="domain-detail-back-btn"'), true,
      'Has back button with id')
  })

  await runSuite('DomainDetail No window.__ Patterns', () => {
    const content = readFileSync(join(ROOT, 'src/pages/DomainDetail.js'), 'utf-8')

    assertEqual(content.includes('onclick="window.__'), false,
      'No onclick="window.__ patterns')
    assertEqual(content.includes('window.__'), false,
      'No window.__ global assignments')
  })
}

runDomainDetailTests()
  .then(() => console.log('[Test] DomainDetail tests completed'))
  .catch((e) => {
    console.error('[Test] DomainDetail tests failed:', e)
    process.exitCode = 1
  })
