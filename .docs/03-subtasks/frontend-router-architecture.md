# 前端路由架构文档

**更新日期**: 2026-06-20  
**路由模式**: Hash（`#/path`）  
**组件模式**: 类组件 + innerHTML 渲染

---

## 一、架构概览

```
main.js                         # 入口：挂载 App，触发 init()
  └── App.js                    # 根组件：render() + init() 触发路由初始化
        └── router/index.js     # 路由核心：init() 监听 hashchange → renderRoute()
              ├── routes.js     # 路由表（配置式，7 条路由）
              ├── utils.js      # matchRoute / getQueryParams / navigate
              └── storage.js    # isLoggedIn（权限判断依赖）
```

**渲染流水线**：

```
hashchange → 解析 path + query → 遍历 routes 匹配 → renderRoute() → new PageClass() → init() → render() → bindEvents()
```

---

## 二、路由表 `routes.js`

### 数据结构

```typescript
// Route 对象
interface Route {
  name: string                          // 路由标识（用于日志），如 'public'
  path: string                          // 路径模式，如 '/admin'、'*'（通配符）
  component: Function | Class           // 组件类 或 懒加载函数 () => import(...)
  meta?: {
    requiresAuth?: boolean              // 是否需要登录，默认 false
    title?: string                      // 页面标题（设置 document.title）
  }
  children?: Route[]                    // 子路由（仅父路由有，如 /admin 下的子页面）
}

// 子路由的 path 是相对路径（不含父路径前缀），如 'dashboard'
```

### 路由表定义

| name | hash 路径 | 组件 | 认证 | title | 子路由 |
|------|----------|------|------|-------|--------|
| `public` | `#/` | `PublicDashboard` | 否 | 首页 | 无 |
| `login` | `#/login` | `LoginPage` | 否 | 登录 | 无 |
| `admin` | `#/admin` | `AdminLayout` | **是** | 管理后台 | **6 个子路由** |
| `admin-dashboard` | `#/admin/dashboard` | `AdminDashboard` | — | 仪表盘 | — |
| `admin-domains` | `#/admin/domains` | `AdminDomains` | — | 域名管理 | — |
| `admin-config` | `#/admin/config` | `AdminConfig` | — | 系统配置 | — |
| `admin-history` | `#/admin/history` | `AdminHistory` | — | 历史记录 | — |
| `admin-stats` | `#/admin/stats` | `AdminStats` | — | 统计概览 | — |
| `notfound` | `#/*`（通配） | `NotFound` | 否 | 404 - Not Found | 无 |

**注**：所有 `component` 均使用懒加载 `() => import('./path/to/Page.js')`，由 router 在渲染时动态 import。

---

## 三、路由核心 `router/index.js`

### 模块导出

| 导出 | 签名 | 用途 |
|------|------|------|
| `init()` | `async () => void` | 绑定 `hashchange` 事件，触发首次路由。**main.js 中 App.init() → 调用此函数** |
| `navigateTo(path)` | `(path: string) => void` | 编程式导航，等价于 `window.location.hash = path` |
| `getCurrentPage()` | `() => Object\|null` | 获取当前渲染的页面实例 |

### 内部函数

---

#### `cleanupCurrentPage()`

```
签名: () => void
调用时机: renderRoute() 开始时（路由切换前）
行为:
  1. 若 currentPageInstance.destroy 存在 → 调用销毁
  2. currentPageInstance = null
```

---

#### `findChildRoute(parentRoute, fullPath)`

```
入参:
  parentRoute: Route    — 父路由对象（必须有 children 字段）
  fullPath:   string    — 完整 hash 路径，如 '/admin/dashboard'

出参: Route | null

逻辑:
  1. 从 fullPath 中提取子路径: '/admin/dashboard'.slice('/admin'.length + 1) → 'dashboard'
  2. 遍历 parentRoute.children，匹配 child.path === 子路径
  3. 匹配成功返回子 Route，否则 null
```

---

#### `handleNotFound()`

```
签名: () => void
触发: 所有路由均未匹配时
行为: 查找 routes 中 path === '/404' 的路由，调用 renderRoute() 渲染
      若无 /404 路由，不做任何事（静默失败）
```

---

#### `renderRoute(route, params, query, parentRoute?)`

这是路由系统的核心渲染函数。

```
入参:
  route:        Route              — 匹配到的路由对象
  params:       Object             — 路径参数（如 :domain 提取的值）
  query:        URLSearchParams    — 查询参数
  parentRoute?: Route | null       — 父路由（嵌套场景传入）

返回值: Promise<void>
```

**执行流程**（按优先级）：

1. **权限守卫**
   ```
   // 子路由从父路由继承 requiresAuth
   const requiresAuth = route.meta?.requiresAuth || parentRoute?.meta?.requiresAuth
   if (requiresAuth && !isLoggedIn()) → navigateTo('/login'); return
   if (route.path === '/login' && isLoggedIn()) → navigateTo('/admin/dashboard'); return
   ```

2. **标题设置**
   ```
   document.title = route.meta?.title || parentRoute?.meta?.title
   ```

3. **清理旧页** → `cleanupCurrentPage()`

4. **组件解析**（分支逻辑）

   **分支 A — 嵌套路由** (`parentRoute && route !== parentRoute`)：
   ```
   ① 父组件懒加载:
      await parentRoute.component() → module → module.default || module[Object.keys(module)[0]]
      出参: ParentComponent (Class)

   ② 子组件懒加载（同上）:
      出参: ChildComponent (Class)

   ③ 构造: currentPageInstance = new ParentComponent(ChildComponent)
          （AdminLayout 构造器接收子组件类作为参数）
   ```

   **分支 B — 普通路由**：
   ```
   ① 懒加载（同上）:
      出参: PageComponent (Class)

   ② 构造: currentPageInstance = new PageComponent()
   ```

5. **生命周期调用**
   ```
   if (currentPageInstance.init) → await currentPageInstance.init({ params, query })
   ```

   **注**：`init()` 接收 `{ params, query }` 对象。
   - `params`：路径动态参数（如 `{ domain: 'example.com' }`），当前项目中始终为空对象 `{}`
   - `query`：`URLSearchParams` 实例

6. **渲染到 DOM**
   ```
   if (currentPageInstance.render) {
     app.innerHTML = currentPageInstance.render()    // 返回 HTML string
     if (currentPageInstance.bindEvents) {
       currentPageInstance.bindEvents()              // 绑定 DOM 事件
     }
   }
   ```

---

#### `init()`

```
签名 (导出): async () => void
调用者:   App.init() → router/init()

行为:
  1. window.addEventListener('hashchange', async handler)
     handler 逻辑：
       a. 解析 hash: '#/admin/dashboard?key=val' → path='/admin/dashboard', query='key=val'
       b. 遍历 routes（跳过 path === '*'）：
          - 若 route.children 存在 且 path.startsWith(route.path + '/')：
            → parentRoute = route，调用 findChildRoute(route, path)
            → 匹配成功：matchedRoute = childRoute，break
          - 调用 matchRoute(path, route.path)：
            → 匹配成功：matchedRoute = route，params = 提取的参数，break
       c. 未匹配：使用 path === '*' 通配符路由 → NotFound
       d. await renderRoute(matchedRoute, params, query, parentRoute)

  2. window.dispatchEvent(new Event('hashchange'))   // 触发首次渲染
```

---

### 路由匹配器 `utils.js`

#### `matchRoute(path, pattern)`

```
入参:
  path:    string — 当前 hash 路径，如 '/domain/example.com'
  pattern: string — 路由模式，如 '/domain/:name'

出参: Object | null   — 匹配成功返回 { name: 'example.com' }，失败返回 null

逻辑:
  1. 按 '/' 分割 path 和 pattern
  2. 段数不同 → null
  3. 逐段比较：
     - pattern 段以 ':' 开头 → 提取为参数 params[name] = pathPart
     - 否则直接字符串比较 → 不匹配返回 null
  4. 返回 params
```

#### `getQueryParams(hash?)`

```
入参: hash?: string  — 可选，默认取 window.location.hash
出参: URLSearchParams

逻辑: hash.split('?')[1] → new URLSearchParams(queryString)
```

#### `navigate(path, params?, query?)`

```
入参:
  path:   string  — 路由路径
  params: Object  — 替换 :param 部分
  query:  Object  — 拼接 ?key=val

行为: window.location.hash = finalPath
```

---

### 权限依赖 `storage.js`

#### `isLoggedIn()`

```
签名: () => boolean
逻辑: 读取 localStorage 中的 'api_token'，非空即视为已登录
      localStorage.getItem('api_token') → !!token
```

#### `clearAuth()`

```
签名: () => void
逻辑: localStorage.removeItem('api_token')
      同时清理 api_config（API 端点配置）
```

---

## 四、页面组件接口规范

所有页面组件必须遵循以下生命周期契约（基于 duck typing，无基类）：

### 4.1 普通页面（PublicDashboard、Login、NotFound、AdminDashboard 等）

| 方法 | 签名 | 必需 | 说明 |
|------|------|------|------|
| `constructor()` | `() => void` | 是 | 初始化实例字段（domains、loading 等） |
| `init(params, queryParams)` | `({ params: Object, query: URLSearchParams }) => Promise<void>` | 推荐 | 异步加载数据，通常调用 `this.loadData()` |
| `render()` | `() => string` | **是** | 返回 HTML 字符串，由 router 通过 `app.innerHTML = ...` 插入 DOM |
| `bindEvents()` | `() => void` | 推荐 | 在 render() 之后调用，绑定 DOM 事件监听器 |
| `destroy()` | `() => void` | 推荐 | 路由切换时调用，清理事件监听器和全局引用 |

### 4.2 布局组件（AdminLayout）

| 方法 | 签名 | 必需 | 说明 |
|------|------|------|------|
| `constructor(childComponent)` | `(childComponent: Class) => void` | **是** | 接收子页面类，由 router 传入 |
| `init(params, queryParams)` | `({ params: Object, query: Object }) => Promise<void>` | **是** | 内部需 `new childComponent()` 创建子实例，调用子实例 init() |
| `render()` | `() => string` | **是** | 渲染布局框架 + `childInstance.render()` 插入内容区 |
| `bindEvents()` | `() => void` | 推荐 | 绑定布局级事件（Sidebar 切换、登出等） |
| `bindGlobalHandlers()` | `() => void` | 推荐 | 设置 window 级处理器，委托给子实例同名方法 |
| `destroy()` | `() => void` | **是** | 清理全局引用 + 调用 `childInstance.destroy()` |

### 4.3 各组件实现状态

| 组件 | constructor | init | render | bindEvents | destroy | bindGlobalHandlers |
|------|:--:|:--:|:--:|:--:|:--:|:--:|
| PublicDashboard | 无参 | 无参 | string | 有 | 部分清理 | 无 |
| LoginPage | 无参 | 无参 | string | 有 | 部分清理 | 无 |
| NotFound | 无 | 无 | string | 无 | 无 | 无 |
| AdminLayout | **childComponent** | **params, queryParams** | string | 有 | 有（委托子实例） | **有** |
| AdminDashboard | 无参 | 无参 | string | 有 | 有 | 无 |
| AdminDomains | 无参 | 无参 | string | 有 | 有 | **有** |
| AdminConfig | 无参 | 无参 | string | 有 | 占位 | 无 |
| AdminHistory | 无参 | 无参 | string | 有 | **正确清理** | 无 |
| AdminStats | 无参 | 无参 | string | 有 | **正确清理** | 无 |

---

## 五、嵌套路由渲染流程（以 `#/admin/domains` 为例）

```
1. hashchange 触发
   hash = '#/admin/domains'
   path = '/admin/domains'
   query = URLSearchParams('')

2. 遍历 routes：
   - 'public' (/):      不匹配
   - 'login'  (/login): 不匹配
   - 'admin'  (/admin): path.startsWith('/admin/') = true, 有 children
     → parentRoute = routes[2] (admin)
     → findChildRoute(adminRoute, '/admin/domains')
       → childPath = '/admin/domains'.slice(6) = 'domains'
       → 匹配 child.path === 'domains' ✓
       → matchedRoute = child (admin-domains), break

3. renderRoute(matchedRoute, {}, query, parentRoute)
   a. 权限：子路由无 requiresAuth → 向上查找 parentRoute.meta.requiresAuth = true → 触发守卫
      → 若未登录，navigateTo('/login'); return

   b. 组件解析（嵌套分支）：
      ① 父组件懒加载：
         module = await import('../pages/admin/AdminLayout.js')
         ParentComponent = module.default → AdminLayout 类

      ② 子组件懒加载：
         module = await import('../pages/admin/AdminDomains.js')
         ChildComponent = module.default → AdminDomains 类

      ③ currentPageInstance = new AdminLayout(AdminDomains)

   c. 生命周期：
      await currentPageInstance.init({ params: {}, query: URLSearchParams })
        → AdminLayout.init() 内部: new AdminDomains() → childInstance.init()

   d. 渲染：
      app.innerHTML = currentPageInstance.render()
        → Sidebar + Topbar + childInstance.render()（域名管理表格）
      currentPageInstance.bindEvents()
```

---

## 六、已知问题

1. **AdminConfig.destroy() 空实现**：未清理事件监听器，切换路由时可能造成内存泄漏。

2. **PublicDashboard / LoginPage.destroy() 部分清理**：只清理了特定 DOM 元素事件，未系统清理。

3. **NotFound 无 destroy()**：静态页面不需要清理，但缺少该方法时 `cleanupCurrentPage()` 会跳过销毁步骤。

4. **组件 init() 参数未充分使用**：`params` 始终为空 `{}`，当前无动态路由参数场景。

---

## 七、完整调用链

```
DOMContentLoaded
  → main.js init()
    → app.innerHTML = App.render()        // 初始 loader
    → App.init()
      → router/init()
        → window.addEventListener('hashchange', handler)
        → dispatchEvent('hashchange')      // 触发首次路由

          → handler():
            → 解析 hash = '#/'             // 首次加载默认路径
            → matchRoute('/', '/')         // 匹配 public 路由
            → renderRoute(publicRoute, {}, query)

              → cleanupCurrentPage()       // null，无操作
              → module = await import('PublicDashboard.js')
              → PageComponent = PublicDashboard 类
              → currentPageInstance = new PublicDashboard()

              → await currentPageInstance.init({ params: {}, query })
                → loadDomains()            // GET /api/public/domains
                → render() + bindEvents()

              → app.innerHTML = currentPageInstance.render()
                → 搜索框 + 域名卡片 HTML

              → currentPageInstance.bindEvents()
                → 搜索框 input 防抖 + 搜索按钮 click

          // 用户点击 "管理后台" → navigateTo('/admin/dashboard')
          → hashchange 再次触发
          → 遍历 routes，匹配 admin 父路由 + admin-dashboard 子路由
          → renderRoute(childRoute, {}, query, adminRoute)

            → cleanupCurrentPage()
              → publicPageInstance.destroy()   // 清理搜索框事件

            → 父组件懒加载: AdminLayout 类
            → 子组件懒加载: AdminDashboard 类
            → currentPageInstance = new AdminLayout(AdminDashboard)
            → await currentPageInstance.init({ params: {}, query })
              → AdminLayout 检查 isLoggedIn()
              → new AdminDashboard() → childInstance.init()
              → render() + bindEvents() + bindGlobalHandlers()

            → app.innerHTML = currentPageInstance.render()
              → Sidebar + Topbar + Dashboard 统计卡片

            → currentPageInstance.bindEvents()
              → Sidebar 切换 + 登出按钮
```
