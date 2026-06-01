// tests/dev-server.test.js

import { runSuite, assertEqual } from './test-runner.js'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

/**
 * 开发服务器功能测试
 */
export async function runDevServerTests() {
  // 注意：这些测试需要开发服务器正在运行
  // 手动运行：npm run dev
  
  await runSuite('Dev Server - Package Scripts', async () => {
    // 测试 package.json 中的脚本可以执行
    const { stdout } = await execAsync('npm run build', { timeout: 60000 })
    assertEqual(stdout.includes('built'), 'Build script works')
    assertEqual(stdout.includes('dist/'), 'Output to dist directory')
  })
}
