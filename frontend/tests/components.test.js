// tests/components.test.js

import { runSuite, assertEqual } from './test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

/**
 * 组件测试
 */
async function runComponentsTests() {
  // ========== 组件文件存在测试 ==========
  await runSuite('Components - All Files Exist', async () => {
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/Button.js')),
      true,
      'Button.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/Input.js')),
      true,
      'Input.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/Card.js')),
      true,
      'Card.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/Loading.js')),
      true,
      'Loading.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/Table.js')),
      true,
      'Table.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/Notification.js')),
      true,
      'Notification.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/index.js')),
      true,
      'index.js exists'
    )
  })
  
  // ========== Button 组件测试 ==========
  await runSuite('Components - Button', async () => {
    const button = readFileSync(join(frontendRoot, 'src/components/Button.js'), 'utf-8')
    
    assertEqual(button.includes('export function Button'), true, 'Has Button function')
    assertEqual(button.includes('dm-btn'), true, 'Uses dm-btn class')
    assertEqual(button.includes('dm-btn-primary'), true, 'Supports primary variant')
    assertEqual(button.includes('dm-btn-secondary'), true, 'Supports secondary variant')
    assertEqual(button.includes('dm-btn-danger'), true, 'Supports danger variant')
    assertEqual(button.includes('loading'), true, 'Supports loading state')
    assertEqual(button.includes('animate-spin'), true, 'Has loading spinner')
    assertEqual(button.includes('id='), true, 'Supports id attribute')
    assertEqual(button.includes('data-'), true, 'Supports data attributes')
  })
  
  // ========== Input 组件测试 ==========
  await runSuite('Components - Input', async () => {
    const input = readFileSync(join(frontendRoot, 'src/components/Input.js'), 'utf-8')
    
    assertEqual(input.includes('export function Input'), true, 'Has Input function')
    assertEqual(input.includes('dm-input'), true, 'Uses dm-input class')
    assertEqual(input.includes('label'), true, 'Supports label')
    assertEqual(input.includes('error'), true, 'Supports error message')
    assertEqual(input.includes('onInput'), true, 'Supports onInput event')
    assertEqual(input.includes('onChange'), true, 'Supports onChange event')
    assertEqual(input.includes('onFocus'), true, 'Supports onFocus event')
    assertEqual(input.includes('onBlur'), true, 'Supports onBlur event')
    assertEqual(input.includes('onKeydown'), true, 'Supports onKeydown event')
    assertEqual(input.includes('disabled'), true, 'Supports disabled state')
    assertEqual(input.includes('readonly'), true, 'Supports readonly state')
    assertEqual(input.includes('autocomplete'), true, 'Supports autocomplete')
    assertEqual(input.includes('pattern'), true, 'Supports pattern validation')
    assertEqual(input.includes('minlength'), true, 'Supports minlength')
    assertEqual(input.includes('maxlength'), true, 'Supports maxlength')
  })
  
  // ========== Card 组件测试 ==========
  await runSuite('Components - Card', async () => {
    const card = readFileSync(join(frontendRoot, 'src/components/Card.js'), 'utf-8')
    
    assertEqual(card.includes('export function Card'), true, 'Has Card function')
    assertEqual(card.includes('dm-card'), true, 'Uses dm-card class')
    assertEqual(card.includes('hoverable'), true, 'Supports hoverable')
  })
  
  // ========== Loading 组件测试 ==========
  await runSuite('Components - Loading', async () => {
    const loading = readFileSync(join(frontendRoot, 'src/components/Loading.js'), 'utf-8')
    
    assertEqual(loading.includes('export function Loading'), true, 'Has Loading function')
    assertEqual(loading.includes('animate-spin'), true, 'Has spin animation')
    assertEqual(loading.includes('svg'), true, 'Uses SVG spinner')
  })
  
  // ========== Table 组件测试 ==========
  await runSuite('Components - Table', async () => {
    const table = readFileSync(join(frontendRoot, 'src/components/Table.js'), 'utf-8')
    
    assertEqual(table.includes('export function Table'), true, 'Has Table function')
    assertEqual(table.includes('columns'), true, 'Supports columns definition')
    assertEqual(table.includes('data'), true, 'Supports data array')
    assertEqual(table.includes('emptyText'), true, 'Supports empty text')
    assertEqual(table.includes('render'), true, 'Supports custom render function')
    assertEqual(table.includes('rowClassName'), true, 'Supports custom row class name')
    assertEqual(table.includes('onRowClick'), true, 'Supports row click event')
    assertEqual(table.includes('align'), true, 'Supports column alignment')
    assertEqual(table.includes('text-center'), true, 'Supports center alignment')
    assertEqual(table.includes('text-right'), true, 'Supports right alignment')
  })
  
  // ========== Notification 组件测试 ==========
  await runSuite('Components - Notification', async () => {
    const notification = readFileSync(join(frontendRoot, 'src/components/Notification.js'), 'utf-8')
    
    assertEqual(notification.includes('export function show'), true, 'Has show function')
    assertEqual(notification.includes('success'), true, 'Has success method')
    assertEqual(notification.includes('error'), true, 'Has error method')
    assertEqual(notification.includes('warning'), true, 'Has warning method')
    assertEqual(notification.includes('info'), true, 'Has info method')
    assertEqual(notification.includes('animate-slide-in-right'), true, 'Has slide-in animation')
  })
  
  // ========== 组件索引测试 ==========
  await runSuite('Components - Index Exports', async () => {
    const index = readFileSync(join(frontendRoot, 'src/components/index.js'), 'utf-8')
    
    assertEqual(index.includes("export { default as Header }"), true, 'Exports Header')
    assertEqual(index.includes("export { default as Button }"), true, 'Exports Button')
    assertEqual(index.includes("export { default as Input }"), true, 'Exports Input')
    assertEqual(index.includes("export { default as Card }"), true, 'Exports Card')
    assertEqual(index.includes("export { default as Loading }"), true, 'Exports Loading')
    assertEqual(index.includes("export { default as Table }"), true, 'Exports Table')
    assertEqual(index.includes("export { default as Notification }"), true, 'Exports Notification')
  })
  
  // ========== dm- 前缀测试 ==========
  await runSuite('Components - Use dm- Prefix', async () => {
    const button = readFileSync(join(frontendRoot, 'src/components/Button.js'), 'utf-8')
    const input = readFileSync(join(frontendRoot, 'src/components/Input.js'), 'utf-8')
    const card = readFileSync(join(frontendRoot, 'src/components/Card.js'), 'utf-8')
    
    assertEqual(button.includes('dm-btn'), true, 'Button uses dm- prefix')
    assertEqual(input.includes('dm-input'), true, 'Input uses dm- prefix')
    assertEqual(card.includes('dm-card'), true, 'Card uses dm- prefix')
  })
}

export { runComponentsTests }
