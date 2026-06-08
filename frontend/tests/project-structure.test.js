// tests/project-structure.test.js

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runSuite, assertEqual } from './test-runner.js'

const frontendRoot = join(process.cwd())

/**
 * 项目结构测试
 */
export async function runProjectTests() {
  // ========== 目录结构测试 ==========
  await runSuite('Project Structure - Directories', async () => {
    const requiredDirs = [
      'src',
      'src/styles',
      'src/components',
      'src/layouts',
      'src/pages',
      'src/router',
      'src/utils',
      'src/config',
      'tests'
    ]
    
    for (const dir of requiredDirs) {
      const dirPath = join(frontendRoot, dir)
      assert(existsSync(dirPath), `Directory ${dir} exists`)
    }
  })
  
  // ========== 配置文件测试 ==========
  await runSuite('Project Structure - Config Files', async () => {
    const requiredFiles = [
      'package.json',
      'vite.config.js',
      'tailwind.config.js',
      'postcss.config.js',
      'index.html',
      '.gitignore'
    ]
    
    for (const file of requiredFiles) {
      const filePath = join(frontendRoot, file)
      assert(existsSync(filePath), `File ${file} exists`)
    }
  })
  
  // ========== 源代码文件测试 ==========
  await runSuite('Project Structure - Source Files', async () => {
    const requiredFiles = [
      'src/main.js',
      'src/App.js',
      'src/styles/index.css',
      'src/components/Header.js',
      'src/components/Footer.js',
      'src/pages/PublicDashboard.js',
      'src/pages/Login.js',
      'src/router/index.js',
      'src/utils/api.js',
      'src/utils/storage.js',
      'src/config/index.js'
    ]
    
    for (const file of requiredFiles) {
      const filePath = join(frontendRoot, file)
      assert(existsSync(filePath), `File ${file} exists`)
    }
  })
  
  // ========== package.json 测试 ==========
  await runSuite('Project Structure - package.json', async () => {
    const packagePath = join(frontendRoot, 'package.json')
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))
    
    assertEqual(packageJson.name, 'domain-monitor-frontend', 'Package name correct')
    assertEqual(packageJson.type, 'module', 'ES module enabled')
    assert(packageJson.scripts.dev, 'Dev script exists')
    assert(packageJson.scripts.build, 'Build script exists')
    assert(packageJson.scripts.preview, 'Preview script exists')
    assert(packageJson.dependencies.tailwindcss, 'Tailwind CSS dependency exists')
    assert(packageJson.devDependencies.vite, 'Vite dependency exists')
  })
  
  // ========== Vite 配置测试 ==========
  await runSuite('Project Structure - Vite Config', async () => {
    const viteConfigPath = join(frontendRoot, 'vite.config.js')
    const viteConfig = readFileSync(viteConfigPath, 'utf-8')
    
    assert(viteConfig.includes('defineConfig'), 'Uses defineConfig')
    assert(viteConfig.includes('port: 5173'), 'Port 3000 configured')
    assert(viteConfig.includes('/api'), 'API proxy configured')
    assert(viteConfig.includes('localhost:8787'), 'Backend port configured')
  })
  
  // ========== Tailwind 配置测试 ==========
  await runSuite('Project Structure - Tailwind Config', async () => {
    const tailwindConfigPath = join(frontendRoot, 'tailwind.config.js')
    const tailwindConfig = readFileSync(tailwindConfigPath, 'utf-8')
    
    assert(tailwindConfig.includes('content:'), 'Content paths configured')
    assert(tailwindConfig.includes('primary:'), 'Primary color configured')
    assert(tailwindConfig.includes('success:'), 'Success color configured')
    assert(tailwindConfig.includes('warning:'), 'Warning color configured')
    assert(tailwindConfig.includes('danger:'), 'Danger color configured')
  })
  
  // ========== Git 忽略测试 ==========
  await runSuite('Project Structure - Git Ignore', async () => {
    const gitignorePath = join(frontendRoot, '.gitignore')
    const gitignore = readFileSync(gitignorePath, 'utf-8')
    
    assert(gitignore.includes('node_modules/'), 'Ignores node_modules')
    assert(gitignore.includes('dist/'), 'Ignores dist')
    assert(gitignore.includes('.env'), 'Ignores environment files')
  })
  
  // ========== CSS 测试 ==========
  await runSuite('Project Structure - Global Styles', async () => {
    const cssPath = join(frontendRoot, 'src/styles/index.css')
    const css = readFileSync(cssPath, 'utf-8')
    
    assert(css.includes('@tailwind base'), 'Tailwind base included')
    assert(css.includes('@tailwind components'), 'Tailwind components included')
    assert(css.includes('@tailwind utilities'), 'Tailwind utilities included')
    assert(css.includes('.dm-btn'), 'Button class defined')
    assert(css.includes('.dm-card'), 'Card class defined')
    assert(css.includes('.dm-input'), 'Input class defined')
  })
  
  // ========== 组件测试 ==========
  await runSuite('Project Structure - Components', async () => {
    const headerPath = join(frontendRoot, 'src/components/Header.js')
    const header = readFileSync(headerPath, 'utf-8')
    
    assert(header.includes('export default'), 'Header exported')
    assert(header.includes('render()'), 'Header has render method')
    assert(header.includes('🌐 域名监控'), 'Header contains logo')
    
    const footerPath = join(frontendRoot, 'src/components/Footer.js')
    const footer = readFileSync(footerPath, 'utf-8')
    
    assert(footer.includes('export default'), 'Footer exported')
    assert(footer.includes('export function Footer'), 'Footer has Footer function')
  })
  
  // ========== 路由测试 ==========
  await runSuite('Project Structure - Router', async () => {
    const routerPath = join(frontendRoot, 'src/router/index.js')
    const router = readFileSync(routerPath, 'utf-8')
    
    assert(router.includes('getCurrentPage'), 'getCurrentPage exported')
    assert(router.includes('navigate'), 'navigate exported')
    assert(router.includes('init'), 'init exported')
    assert(router.includes('hashchange'), 'Hash change listener')
  })
  
  // ========== API 工具测试 ==========
  await runSuite('Project Structure - API Utils', async () => {
    const apiPath = join(frontendRoot, 'src/utils/api.js')
    const api = readFileSync(apiPath, 'utf-8')
    
    assert(api.includes('request'), 'request function exported')
    assert(api.includes('get'), 'get function exported')
    assert(api.includes('post'), 'post function exported')
    assert(api.includes('put'), 'put function exported')
    assert(api.includes('del'), 'delete function exported')
    assert(api.includes('X-API-Token'), 'Token header configured')
  })
  
  // ========== Storage 工具测试 ==========
  await runSuite('Project Structure - Storage Utils', async () => {
    const storagePath = join(frontendRoot, 'src/utils/storage.js')
    const storage = readFileSync(storagePath, 'utf-8')
    
    assert(storage.includes('getConfig'), 'getConfig exported')
    assert(storage.includes('setConfig'), 'setConfig exported')
    assert(storage.includes('getApiEndpoint'), 'getApiEndpoint exported')
    assert(storage.includes('getApiToken'), 'getApiToken exported')
    assert(storage.includes('isLoggedIn'), 'isLoggedIn exported')
  })
}

export { runProjectTests as runStructureTests }
