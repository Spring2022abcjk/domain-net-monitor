# 子任务 15：管理后台登录页

**状态**: 🔴 未启动  
**优先级**: 高  
**预计工时**: 2 小时  
**创建日期**: 2026-06-02  
**更新日期**: 2026-06-02  
**前置依赖**: 任务 14（公开 Dashboard）✅  
**后续依赖**: 任务 16（管理后台主布局）  

---

## 任务目标

重构现有的登录页面，使用新的组件库，实现完整的 API Token 验证功能，并添加路由守卫确保认证后才能访问管理后台。

### 核心需求

1. **组件化重构**: 使用任务 13 创建的新组件库（Input, Button, Card, Notification）
2. **API Token 验证**: 调用 `/api/admin/auth/verify` 验证 Token 有效性
3. **用户体验优化**: 加载状态、错误提示、表单验证
4. **路由守卫**: 未登录访问管理后台自动跳转到登录页
5. **记住登录状态**: 基于现有 `isLoggedIn()` 实现自动登录
6. **与任务 16 联动**: 
   - 认证成功后跳转到 `/admin/dashboard`（任务 16 的 Dashboard 页面）
   - 登录状态检查与 AdminLayout 的认证检查保持一致
   - 路由守卫在任务 16 中统一实现（`/admin`父路由设置`requiresAuth: true`）

### 设计原则（避免重构）

- **认证统一**: 登录页保存凭证 → 路由守卫检查 → AdminLayout 二次确认
- **跳转统一**: 登录成功跳转 `/admin/dashboard`，退出登录跳转 `/login`
- **存储统一**: 使用 `storage.js` 的 `setApiToken`, `isLoggedIn`, `clearAuth`，不新增存储方法
- **路由嵌套**: 任务 16 使用嵌套路由（`/admin` 为父路由），任务 15 的跳转目标应为 `/admin/dashboard` 而非`/admin`

---

## 页面结构

```
#/login (LoginPage)
├── Container (max-w-md, centered)
├── Card
│   ├── Header
│   │   ├── Icon (🔐)
│   │   └── Title ("管理员登录")
│   ├── Form
│   │   ├── Input (API 端点)
│   │   │   ├── label
│   │   │   ├── input (type="url")
│   │   │   └── error message
│   │   ├── Input (API Token)
│   │   │   ├── label
│   │   │   ├── input (type="password")
│   │   │   └── error message
│   │   ├── Notification (error/success)
│   │   └── Button (登录，带 loading 状态)
│   └── Footer
│       └── 说明文字 ("登录后可以管理...")
└── (Optional) Back to Home 链接
```

---

## API 端点

### 管理 API（需要认证）

| 方法 | 路径 | 说明 | 鉴权 | 限流豁免 |
|------|------|------|------|----------|
| POST | `/api/admin/auth/verify` | 验证 API Token | ❌ (验证接口本身) | ✅ |
| POST | `/api/admin/auth/logout` | 登出（清除 Token） | ✅ | ✅ |

### 请求格式

#### `POST /api/admin/auth/verify`

**请求头**:
```
Authorization: Bearer <API_TOKEN>
```

**响应 (成功)**:
```json
{
  "code": 200,
  "data": {
    "valid": true,
    "expiresIn": 86400
  },
  "msg": "Token is valid"
}
```

**响应 (失败)**:
```json
{
  "code": 401,
  "data": null,
  "msg": "Invalid or expired API Token"
}
```

---

## 实现步骤

### 15.1 重构登录页面组件

**文件**: `frontend/src/pages/Login.js`（重构）

**目标**:
- 使用新的 Input, Button, Card 组件
- 使用 Notification 显示错误/成功消息
- 添加表单验证（URL 格式、必填）
- 添加 loading 状态
- 添加 API Token 验证逻辑

**代码框架**:
```javascript
import { Input } from '../components/Input.js'
import { Button } from '../components/Button.js'
import { Card } from '../components/Card.js'
import { show } from '../components/Notification.js'
import { post } from '../utils/api.js'
import { 
  setApiEndpoint, 
  setApiToken, 
  isLoggedIn,
  getCurrentUser 
} from '../utils/storage.js'

export class LoginPage {
  constructor() {
    this.loading = false
    this.formData = {
      endpoint: '',
      token: ''
    }
  }
  
  async init() {
    // 检查是否已登录
    if (isLoggedIn()) {
      // 已登录：直接跳转到管理后台 Dashboard（任务 16）
      window.location.hash = '/admin/dashboard'
      return
    }
    
    this.render()
    this.bindEvents()
  }
  
  render() {
    return `
      <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        ${Card({
          className: 'max-w-md w-full',
          content: `
            <div class="text-center mb-6">
              <div class="text-4xl mb-2">🔐</div>
              <h1 class="text-2xl font-bold text-gray-900">管理员登录</h1>
              <p class="text-sm text-gray-600 mt-2">
                登录后可以管理域名、配置检测、查看历史记录
              </p>
            </div>
            
            <form id="loginForm" class="space-y-4">
              ${Input({
                type: 'url',
                id: 'apiEndpoint',
                label: 'API 端点',
                placeholder: 'https://your-worker.workers.dev',
                required: true,
                value: this.formData.endpoint
              })}
              
              ${Input({
                type: 'password',
                id: 'apiToken',
                label: 'API Token',
                placeholder: '输入你的 API Token',
                required: true,
                value: this.formData.token
              })}
              
              ${Button({
                text: this.loading ? '登录中...' : '登录',
                variant: 'primary',
                size: 'lg',
                disabled: this.loading,
                loading: this.loading,
                className: 'w-full'
              })}
            </form>
            
            <div class="mt-6 pt-6 border-t border-gray-200">
              <p class="text-sm text-gray-600 text-center">
                提示：Token 将保存在本地，仅用于 API 认证
              </p>
            </div>
          `
        })}
      </div>
    `
  }
  
  bindEvents() {
    const form = document.getElementById('loginForm')
    form.addEventListener('submit', (e) => this.handleSubmit(e))
  }
  
  async handleSubmit(e) {
    e.preventDefault()
    
    const endpoint = document.getElementById('apiEndpoint').value.trim()
    const token = document.getElementById('apiToken').value.trim()
    
    // 验证
    if (!endpoint || !token) {
      show.error('请输入 API 端点和 Token')
      return
    }
    
    // 验证 URL 格式
    try {
      new URL(endpoint)
    } catch {
      show.error('API 端点格式不正确，请输入完整的 URL')
      return
    }
    
    // 验证 Token 格式（至少 10 个字符）
    if (token.length < 10) {
      show.error('Token 格式不正确，长度至少为 10 个字符')
      return
    }
    
    // 开始验证
    this.loading = true
    this.render()
    this.bindEvents()
    
    try {
      // 设置全局 API 端点和 Token
      setApiEndpoint(endpoint)
      setApiToken(token)
      
      // 调用验证 API
      const res = await post('/api/admin/auth/verify', {})
      
      if (res.code === 200) {
        show.success('登录成功！正在跳转...')
        setTimeout(() => {
          window.location.hash = '/admin/dashboard'
        }, 800)
      } else {
        throw new Error(res.msg || '验证失败')
      }
    } catch (error) {
      show.error(error.message || '登录失败，请检查端点和 Token')
      this.loading = false
      this.render()
      this.bindEvents()
    }
  }
  
  destroy() {
    // 清理
  }
}

export default LoginPage
```

**验收要点**:
- [ ] 使用新组件（Input, Button, Card, Notification）
- [ ] 表单验证完整（必填、URL 格式、Token 长度）
- [ ] Loading 状态正确显示
- [ ] API 验证调用正确
- [ ] 登录成功跳转到 `/admin/dashboard`
- [ ] 已登录用户访问登录页自动重定向

---

### 15.2 实现路由守卫

**文件**: `frontend/src/router/index.js`（修改）

**目标**:
- 检测需要认证的路由
- 未登录时重定向到登录页
- 已登录时访问登录页重定向到首页

**修改内容**:
```javascript
import { routes } from './routes.js'
import { matchRoute, getQueryParams } from './utils.js'
import { isLoggedIn } from '../utils/storage.js'

let currentPage = null

export function getCurrentPage() {
  return currentPage
}

/**
 * 检查路由是否需要认证
 */
function requiresAuth(route) {
  return route.meta?.requiresAuth === true
}

/**
 * 渲染路由
 */
async function renderRoute() {
  const hash = window.location.hash || '#/'
  const path = hash.split('?')[0].replace('#', '') || '/'
  const queryParams = getQueryParams(hash)
  
  // 查找匹配的路由
  let matchedRoute = null
  let params = {}
  
  for (const route of routes) {
    if (route.path === '*') {
      matchedRoute = route
      continue
    }
    
    const routeParams = matchRoute(path, route.path)
    if (routeParams !== null) {
      matchedRoute = route
      params = routeParams
      break
    }
  }
  
  if (!matchedRoute) {
    matchedRoute = routes.find(r => r.path === '*')
  }
  
  // 路由守卫：检查认证
  if (requiresAuth(matchedRoute) && !isLoggedIn()) {
    window.location.hash = '/login'
    return
  }
  
  // 已登录访问登录页，重定向到首页
  if (matchedRoute.path === '/login' && isLoggedIn()) {
    window.location.hash = '/'
    return
  }
  
  // 清理旧页面
  if (currentPage && typeof currentPage.destroy === 'function') {
    currentPage.destroy()
    currentPage = null
  }
  
  // 设置页面标题
  document.title = matchedRoute.meta?.title || '域名监控平台'
  
  // 创建新页面实例
  const PageComponent = matchedRoute.component
  currentPage = new PageComponent()
  
  if (currentPage.init) {
    await currentPage.init(params, queryParams)
  }
  
  // 渲染页面
  const app = document.getElementById('app')
  if (app && currentPage.render) {
    app.innerHTML = currentPage.render()
    if (currentPage.bindEvents) {
      currentPage.bindEvents()
    }
  }
}

// 初始化路由
export function initRouter() {
  window.addEventListener('hashchange', renderRoute)
  renderRoute() // 初次加载
}

export function navigate(path) {
  window.location.hash = path
}
```

**验收要点**:
- [ ] 未登录访问 `/admin/*` 自动跳转到 `/login`
- [ ] 已登录访问 `/login` 自动跳转到 `/`
- [ ] 路由守卫在页面渲染前执行
- [ ] 不影响公开页面访问

---

### 15.3 更新路由配置

**文件**: `frontend/src/router/routes.js`（修改）

**目标**:
- 为管理后台路由添加 `requiresAuth: true`
- 规划后续管理后台子路由

**修改内容**:
```javascript
import PublicDashboard from '../pages/PublicDashboard.js'
import Login from '../pages/Login.js'
import NotFound from '../pages/NotFound.js'

export const routes = [
  {
    path: '/',
    name: 'public-dashboard',
    component: PublicDashboard,
    meta: {
      title: '域名监控平台',
      requiresAuth: false
    }
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      title: '管理员登录',
      requiresAuth: false
    }
  },
  // 管理后台路由（需要认证）
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: () => import('../pages/admin/Dashboard.js'), // 任务 16
    meta: {
      title: '管理后台',
      requiresAuth: true
    }
  },
  {
    path: '/admin/domains',
    name: 'admin-domains',
    component: () => import('../pages/admin/Domains.js'), // 后续任务
    meta: {
      title: '域名管理',
      requiresAuth: true
    }
  },
  {
    path: '/admin/config',
    name: 'admin-config',
    component: () => import('../pages/admin/Config.js'), // 后续任务
    meta: {
      title: '系统配置',
      requiresAuth: true
    }
  },
  {
    path: '/admin/history',
    name: 'admin-history',
    component: () => import('../pages/admin/History.js'), // 后续任务
    meta: {
      title: '历史记录',
      requiresAuth: true
    }
  },
  {
    path: '*',
    name: 'catch-all',
    component: NotFound,
    meta: {
      title: '页面不存在'
    }
  }
]

export default routes
```

**验收要点**:
- [ ] 所有 `/admin/*` 路由设置 `requiresAuth: true`
- [ ] 公开页面 `requiresAuth: false`
- [ ] 路由元数据完整（title, requiresAuth）

---

### 15.4 编写测试

**文件**: `frontend/tests/pages/login.test.js`（新建）

**测试内容**:
```javascript
import { runSuite, assertEqual } from '../test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

/**
 * 登录页面测试
 */
export async function runLoginPageTests() {
  // 页面文件存在测试
  await runSuite('Pages - Login Exists', async () => {
    assertEqual(
      existsSync(join(frontendRoot, 'src/pages/Login.js')),
      true,
      'Login.js exists'
    )
  })
  
  // 组件使用测试
  await runSuite('Pages - Login Component Usage', async () => {
    const page = readFileSync(join(frontendRoot, 'src/pages/Login.js'), 'utf-8')
    
    assertEqual(page.includes('Input'), true, 'Uses Input component')
    assertEqual(page.includes('Button'), true, 'Uses Button component')
    assertEqual(page.includes('Card'), true, 'Uses Card component')
    assertEqual(page.includes('Notification') || page.includes('show'), true, 'Uses Notification')
  })
  
  // 表单验证测试
  await runSuite('Pages - Login Form Validation', async () => {
    const page = readFileSync(join(frontendRoot, 'src/pages/Login.js'), 'utf-8')
    
    assertEqual(page.includes('value.trim()'), true, 'Trims input values')
    assertEqual(page.includes('new URL('), true, 'Validates URL format')
    assertEqual(page.includes('.length'), true, 'Validates token length')
    assertEqual(page.includes('show.error'), true, 'Shows error messages')
  })
  
  // API 验证测试
  await runSuite('Pages - Login API Verification', async () => {
    const page = readFileSync(join(frontendRoot, 'src/pages/Login.js'), 'utf-8')
    
    assertEqual(page.includes("post('/api/admin/auth/verify'"), true, 'Calls verify API')
    assertEqual(page.includes('setApiEndpoint'), true, 'Saves endpoint')
    assertEqual(page.includes('setApiToken'), true, 'Saves token')
  })
  
  // Loading 状态测试
  await runSuite('Pages - Login Loading State', async () => {
    const page = readFileSync(join(frontendRoot, 'src/pages/Login.js'), 'utf-8')
    
    assertEqual(page.includes('loading'), true, 'Has loading state')
    assertEqual(page.includes('disabled'), true, 'Disables button during loading')
  })
  
  // 路由守卫测试
  await runSuite('Router - Auth Guard', async () => {
    const router = readFileSync(join(frontendRoot, 'src/router/index.js'), 'utf-8')
    
    assertEqual(router.includes('requiresAuth'), true, 'Has auth guard function')
    assertEqual(router.includes('isLoggedIn'), true, 'Checks login status')
    assertEqual(router.includes("'/login'"), true, 'Redirects to login')
    assertEqual(router.includes("'/admin/dashboard'"), true, 'Redirects after login')
  })
  
  // 路由配置测试
  await runSuite('Router - Admin Routes Config', async () => {
    const routes = readFileSync(join(frontendRoot, 'src/router/routes.js'), 'utf-8')
    
    assertEqual(routes.includes("'/admin/dashboard'"), true, 'Has dashboard route')
    assertEqual(routes.includes('requiresAuth: true'), true, 'Admin routes require auth')
    assertEqual(routes.includes("'/login'"), true, 'Has login route')
  })
}
```

**验收要点**:
- [ ] 测试覆盖核心功能
- [ ] 所有测试通过

---

## 测试用例

### 单元测试

```javascript
// 表单验证测试
assertEqual(validateURL('https://example.com'), true, 'Valid URL')
assertEqual(validateURL('not-a-url'), false, 'Invalid URL')
assertEqual(validateToken('abc123'), false, 'Token too short')
assertEqual(validateToken('abc1234567890'), true, 'Valid token length')

// 组件渲染测试
const page = new LoginPage()
assertEqual(page.render().includes('管理员登录'), true, 'Has title')
assertEqual(page.render().includes('dm-input'), true, 'Uses Input component')
assertEqual(page.render().includes('dm-btn'), true, 'Uses Button component')

// 路由守卫测试
isLoggedIn.mockReturnValue(false)
renderRoute('/admin/dashboard')
assertEqual(window.location.hash, '#/login', 'Redirects to login')

isLoggedIn.mockReturnValue(true)
renderRoute('/login')
assertEqual(window.location.hash, '#/', 'Redirects to home')
```

### 集成测试

```bash
# 验证 API Token
curl -X POST https://your-worker.workers.dev/api/admin/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" | jq

# 预期响应
{
  "code": 200,
  "data": { "valid": true, "expiresIn": 86400 },
  "msg": "Token is valid"
}
```

---

## 验收标准

### 功能验收

- [ ] 可以打开登录页面 (`#/login`)
- [ ] 输入框正常显示和输入
- [ ] 表单验证正确（空值、URL 格式、Token 长度）
- [ ] 点击登录后显示 loading 状态
- [ ] Token 验证成功跳转到 `/admin/dashboard`（任务 16）
- [ ] Token 验证失败显示错误消息
- [ ] 未登录访问 `/admin/*` 自动跳转到 `/login`（任务 16 路由守卫）
- [ ] 已登录访问 `/login` 自动跳转到 `/`（或 `/admin/dashboard`）
- [ ] 与任务 16 联调通过（登录后能正常显示管理后台）

### 代码质量验收

- [ ] 使用新组件库（Input, Button, Card, Notification）
- [ ] 无直接 DOM 操作（使用组件渲染）
- [ ] 错误处理完整
- [ ] 无 console.log 调试代码
- [ ] 测试覆盖率 100%
- [ ] 无 ESLint 警告

### 视觉验收

- [ ] 页面居中显示
- [ ] 卡片样式美观
- [ ] 输入框样式一致
- [ ] 按钮 loading 状态流畅
- [ ] 错误提示明显
- [ ] 响应式布局正常（移动端适配）

### 安全验收

- [ ] Token 存储使用 localStorage（不传到服务器）
- [ ] HTTPS 强制（生产环境）
- [ ] Token 格式验证（防止注入）
- [ ] API 端点 URL 验证（防止 XSS）

---

## 相关文件

- `frontend/src/pages/Login.js` - 登录页面（重构）
- `frontend/src/pages/admin/AdminLayout.js` - 管理后台布局（任务 16）
- `frontend/src/router/index.js` - 路由守卫（任务 16 实现嵌套路由）
- `frontend/src/router/routes.js` - 路由配置（任务 16 实现嵌套结构）
- `frontend/tests/pages/login.test.js` - 登录页面测试
- `worker/src/routes/admin/auth.js` - 认证 API（已有）

---

## 任务 15+16 联动说明

### 认证流程

```
用户访问 #/login 
    ↓
输入 API 端点 + Token
    ↓
调用 /api/admin/auth/verify 验证
    ↓
验证成功 → setApiToken(endpoint, token)
    ↓
跳转到 #/admin/dashboard (任务 16)
    ↓
AdminLayout 检查 isLoggedIn() → 已登录 → 显示 Dashboard
```

### 路由结构（任务 16 实现）

```javascript
// 任务 15: /login
{ path: '/login', component: Login, requiresAuth: false }

// 任务 16: /admin (嵌套父路由)
{
  path: '/admin',
  component: AdminLayout,
  requiresAuth: true,
  children: [
    { path: '/admin/dashboard', component: AdminDashboard },
    { path: '/admin/domains', component: AdminDomains },
    ...
  ]
}
```

### 关键对接点

1. **登录成功跳转**: `window.location.hash = '/admin/dashboard'`（不是 `/admin`）
2. **路由守卫位置**: 在 AdminLayout 的 `init()` 中检查认证
3. **退出登录**: AdminLayout 调用 `clearAuth()` 后跳转 `/login`
4. **凭证存储**: 统一使用 `storage.js`，不新增存储方法

### 避免重构的要点

- 登录页不实现路由守卫（由任务 16 的路由系统统一实现）
- 登录页不检查 `/admin/*` 路径（由路由守卫自动处理）
- AdminLayout 的认证检查是双重保险（路由守卫已经检查过一次）

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-06-02 | 1.0 | 初始版本 | AI Assistant |
