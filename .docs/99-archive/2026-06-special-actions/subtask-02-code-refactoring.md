# 专项行动子任务 2：代码重构与优化

**专项行动**: SPECIAL-001（前端路由系统）  
**子任务编号**: SA001-SUB02  
**优先级**: P0  
**预计工时**: 2 小时  

---

## 任务目标

基于子任务 1 的审查结果，对所有发现的问题进行系统性重构和优化。

---

## 重构范围

### 核心重构

1. **嵌套路由匹配修复** (P0)
   - 文件：`router/index.js`
   - 函数：`findChildRoute()`
   - 优先级：🔴 立即修复

2. **调试日志系统完善** (P1)
   - 文件：`router/index.js`
   - 位置：路由匹配、模块加载、错误处理
   - 优先级：🟡 高优先级

3. **JSDoc 注释补充** (P2)
   - 文件：`router/index.js`, `router/utils.js`
   - 范围：所有公开函数
   - 优先级：🟢 中优先级

4. **错误处理优化** (P1)
   - 文件：`router/index.js`
   - 范围：动态 import、路由渲染
   - 优先级：🟡 高优先级

---

## 实施步骤

### 步骤 1：嵌套路由匹配修复（30 分钟）

#### 当前问题

```javascript
// ❌ 问题代码
function findChildRoute(parentRoute, path) {
  if (!parentRoute.children) return null
  for (const child of parentRoute.children) {
    if (child.path === path) return child  // path = '/admin/dashboard', child.path = 'dashboard'
  }
  return null
}
```

#### 修复方案

```javascript
// ✅ 修复后代码
/**
 * 查找嵌套的子路由
 * @param {Object} parentRoute - 父路由对象
 * @param {string} fullPath - 完整路径（如 '/admin/dashboard'）
 * @returns {Object|null} 子路由对象，不存在返回 null
 */
function findChildRoute(parentRoute, fullPath) {
  if (!parentRoute.children) return null
  
  // 从完整路径中提取子路径
  // 例如：'/admin/dashboard' → 'dashboard'
  const parentPath = parentRoute.path
  const childPath = fullPath.startsWith(parentPath + '/')
    ? fullPath.slice(parentPath.length + 1)
    : fullPath
  
  // 查找匹配的子路由
  for (const child of parentRoute.children) {
    if (child.path === childPath) return child
  }
  
  return null
}
```

#### 验收测试

```javascript
// 测试用例
const adminRoute = {
  path: '/admin',
  children: [
    { path: 'dashboard', name: 'admin-dashboard' },
    { path: 'domains', name: 'admin-domains' }
  ]
}

console.assert(
  findChildRoute(adminRoute, '/admin/dashboard')?.name === 'admin-dashboard',
  '应正确匹配 dashboard 子路由'
)

console.assert(
  findChildRoute(adminRoute, '/admin/domains')?.name === 'admin-domains',
  '应正确匹配 domains 子路由'
)

console.assert(
  findChildRoute(adminRoute, '/admin/invalid') === null,
  '无效路径应返回 null'
)
```

---

### 步骤 2：调试日志系统完善（30 分钟）

#### 添加路由匹配日志

```javascript
// 在 init() 函数的路由匹配循环中
for (const route of routes) {
  const routeParams = matchRoute(path, route.path)
  if (routeParams) {
    matchedRoute = route
    console.log('[Router] Matched route:', route.name, 'params:', routeParams)
    
    // 检查嵌套路由
    if (route.children && path.startsWith(route.path + '/')) {
      parentRoute = route
      const childRoute = findChildRoute(route, path)
      if (childRoute) {
        matchedRoute = childRoute
        console.log('[Router] ✓ Matched child route:', childRoute.name, '(parent:', parentRoute.name + ')')
      } else {
        console.warn('[Router] ✗ Child route not found for path:', path, 'in parent:', route.path)
      }
      break
    }
    break
  }
}
```

#### 添加模块加载日志

```javascript
// 在 renderRoute() 函数中
if (typeof route.component === 'function') {
  try {
    console.log('[Router] Loading module:', route.name)
    const module = await route.component()
    console.log('[Router] ✓ Loaded module:', route.name, module)
    
    PageComponent = module.default || module[Object.keys(module)[0]]
    console.log('[Router] ✓ Component resolved:', PageComponent?.name || 'anonymous')
  } catch (error) {
    console.error('[Router] ✗ Failed to load module:', route.name, error)
    throw error
  }
}
```

#### 添加渲染完成日志

```javascript
// 渲染完成后
console.log('[Router] ✓ Rendered:', route.name, parentRoute ? `(parent: ${parentRoute.name})` : '')
```

---

### 步骤 3：JSDoc 注释补充（30 分钟）

#### router/index.js 注释模板

```javascript
/**
 * 路由系统 - 配置式实现（支持嵌套路由）
 * @module router/index
 * @version 2.0
 * @author MonkeyCode-AI
 */

/**
 * 导航到指定路径
 * @function navigateTo
 * @param {string} path - 目标路径（不含 #）
 * @returns {void}
 * 
 * @example
 * navigateTo('/admin/dashboard')
 * // 设置 location.hash = '#/admin/dashboard'
 */
export function navigateTo(path) {
  window.location.hash = path
}

/**
 * 清理当前页面实例
 * @function cleanupCurrentPage
 * @returns {void}
 * @private
 */
function cleanupCurrentPage() {
  if (currentPageInstance && currentPageInstance.destroy) {
    currentPageInstance.destroy()
  }
  currentPageInstance = null
}
```

#### router/utils.js 注释模板

```javascript
/**
 * 路由工具函数
 * @module router/utils
 */

/**
 * 匹配路由并提取参数
 * @function matchRoute
 * @param {string} path - 当前路径（如 '/domain/example.com'）
 * @param {string} pattern - 路由模式（如 '/domain/:name'）
 * @returns {Object|null} 参数对象，匹配失败返回 null
 * 
 * @example
 * matchRoute('/domain/example.com', '/domain/:name')
 * // 返回：{ name: 'example.com' }
 * 
 * matchRoute('/admin', '/login')
 * // 返回：null
 */
export function matchRoute(path, pattern) {
  // ...实现...
}
```

---

### 步骤 4：错误处理优化（30 分钟）

#### 完善动态 import 错误处理

```javascript
/**
 * 动态加载组件
 * @param {Function} loadFn - 组件加载函数（返回 Promise）
 * @param {string} componentName - 组件名称（用于错误提示）
 * @returns {Promise<Class>} 组件类
 * @throws {Error} 加载失败时抛出错误
 */
async function loadComponent(loadFn, componentName) {
  try {
    const module = await loadFn()
    if (!module || (!module.default && !module[componentName])) {
      throw new Error(`Module does not export component: ${componentName}`)
    }
    return module.default || module[componentName]
  } catch (error) {
    console.error(`[Router] Failed to load component "${componentName}":`, error)
    throw new Error(
      `无法加载组件 "${componentName}": ${error.message}. ` +
      `请检查文件路径是否正确，组件是否正确导出。`
    )
  }
}

// 使用示例
const ChildComponent = await loadComponent(
  () => import('../pages/admin/AdminDashboard.js'),
  'AdminDashboard'
)
```

#### 添加 404 友好提示

```javascript
/**
 * 处理 404 路由
 * @function handleNotFound
 * @returns {void}
 */
function handleNotFound() {
  const notFoundRoute = routes.find(r => r.path === '*' || r.path === '/404')
  
  if (notFoundRoute) {
    console.warn('[Router] Route not found, showing 404 page')
    renderRoute(notFoundRoute, {}, new URLSearchParams())
  } else {
    console.error('[Router] No 404 route configured')
    // 回退方案：直接显示 404 消息
    const app = document.getElementById('app')
    if (app) {
      app.innerHTML = `
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
            <h1 class="text-6xl font-bold text-gray-300 mb-4">404</h1>
            <p class="text-xl text-gray-600 mb-8">页面不存在</p>
            <button onclick="window.location.hash='/'" 
                    class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              返回首页
            </button>
          </div>
        </div>
      `
    }
  }
}
```

---

## 验收标准

### 代码验收

- [ ] `findChildRoute()` 修复并通过所有单元测试
- [ ] 所有路由函数添加调试日志
- [ ] 所有公开函数添加 JSDoc 注释
- [ ] 错误处理完善，用户提示友好
- [ ] 代码通过 ESLint 检查
- [ ] 无 TypeScript 类型错误（如果使用 TS）

### 功能验收

- [ ] `/admin/dashboard` 正确加载
- [ ] `/admin/domains` 正确加载
- [ ] `/admin/config` 正确加载
- [ ] `/admin/history` 正确加载
- [ ] `/admin/stats` 正确加载
- [ ] 无效路径显示 404
- [ ] 未登录访问后台重定向
- [ ] 已登录访问登录页重定向

### 日志验收

```bash
# 访问 /admin/dashboard 应看到
[Router] Initialized with 4 routes
[Router] Hash changed: /admin/dashboard
[Router] Matched route: admin params: {}
[Router] ✓ Matched child route: admin-dashboard (parent: admin)
[Router] Loading module: admin-dashboard
[Router] ✓ Loaded module: admin-dashboard Module {...}
[Router] ✓ Component resolved: AdminDashboard
[Router] ✓ Rendered: admin-dashboard (parent: admin)
```

---

## 检查清单

### 嵌套路由修复

- [ ] `findChildRoute()` 正确提取子路径
- [ ] 所有嵌套路由正确匹配
- [ ] 单元测试通过

### 调试日志

- [ ] 路由匹配日志
- [ ] 模块加载日志
- [ ] 组件解析日志
- [ ] 渲染完成日志
- [ ] 错误详细日志
- [ ] 警告日志

### JSDoc 注释

- [ ] `navigateTo()` 注释
- [ ] `getCurrentPage()` 注释
- [ ] `renderRoute()` 注释
- [ ] `init()` 注释
- [ ] `matchRoute()` 注释
- [ ] `getQueryParams()` 注释
- [ ] `findChildRoute()` 注释

### 错误处理

- [ ] 动态 import 错误捕获
- [ ] 404 友好提示
- [ ] 认证失败处理
- [ ] 网络错误处理
- [ ] 用户提示本地化

---

**状态**: ⬜ 未开始 → 🟡 进行中 → ✅ 已完成  
**实际工时**: ___ 小时  
**完成日期**: ___
