# 子任务 16：管理后台主布局

**状态**: 🔴 未启动  
**优先级**: 高  
**预计工时**: 3 小时  
**创建日期**: 2026-06-02  
**更新日期**: 2026-06-02  
**前置依赖**: 任务 15（管理后台登录页）✅  

---

## 任务目标

实现管理后台的主布局框架，包含侧边栏导航、顶部栏、内容区域，并为后续子页面（域名管理、配置、历史记录）提供可扩展的页面结构。

### 核心设计原则（避免重构）

1. **布局与路由分离**: 使用 `AdminLayout` 包裹所有管理页面，而不是每个页面重复写 Sidebar/Topbar
2. **配置式导航**: 导航菜单通过配置生成，新增页面无需修改 Sidebar
3. **路由嵌套设计**: `/admin` 作为父路由，子路由自动继承布局
4. **统一认证检查**: 在 Layout 层检查认证，子页面无需重复检查
5. **组件化设计**: Sidebar, Topbar, Content 独立组件，易于维护和扩展

---

## 整体架构（任务 15+16 联动）

### 认证流程

```
用户访问 #/login → 输入 Token → 验证 → 保存凭证 → 跳转 #/admin/dashboard
                          ↓
              后续访问 /admin/* → 检查凭证 → 已登录直接显示
                          ↓
              点击退出 → 清除凭证 → 跳转 #/login
```

### 路由架构

```javascript
// 公开路由（无需认证）
/ → PublicDashboard
/login → LoginPage

// 管理后台路由（需要认证，共用 AdminLayout）
/admin → AdminLayout
  ├── /dashboard → AdminDashboard
  ├── /domains → AdminDomains
  ├── /config → AdminConfig
  └── /history → AdminHistory
```

### 目录结构

```
frontend/src/
├── pages/
│   ├── PublicDashboard.js    # 任务 14 ✅
│   ├── Login.js              # 任务 15
│   └── admin/                # 任务 16 新建
│       ├── AdminLayout.js    # 主布局组件
│       ├── AdminDashboard.js # Dashboard 页面
│       ├── AdminDomains.js   # 域名管理（后续）
│       ├── AdminConfig.js    # 系统配置（后续）
│       └── AdminHistory.js   # 历史记录（后续）
├── components/
│   ├── admin/                # 管理后台专属组件
│   │   ├── Sidebar.js        # 侧边栏
│   │   ├── Topbar.js         # 顶部栏
│   │   └── NavMenu.js        # 导航菜单
│   └── ...                   # 已有组件
└── router/
    ├── routes.js             # 路由配置（嵌套结构）
    └── index.js              # 路由守卫（任务 15）
```

---

## 页面结构

```
#/admin/* (AdminLayout)
├── Sidebar (固定左侧，宽度 240px)
│   ├── Logo 区域
│   ├── NavMenu (配置式)
│   │   ├── Dashboard (仪表盘)
│   │   ├── Domains (域名管理)
│   │   ├── Config (系统配置)
│   │   └── History (历史记录)
│   └── 底部信息
├── MainArea (右侧，flex-1)
│   ├── Topbar
│   │   ├── Breadcrumb (面包屑)
│   │   ├── UserMenu (用户信息 + 退出)
│   │   └── Theme Toggle (可选)
│   └── Content (内容区域)
│       └── [子页面组件]
└── (Mobile: Sidebar 折叠为汉堡菜单)
```

---

## 实现步骤

### 16.1 创建管理后台布局组件

**文件**: `frontend/src/pages/admin/AdminLayout.js`（新建）

**设计要点**:
- 使用 CSS Grid 或 Flexbox 实现布局
- Sidebar 固定宽度，Content 自适应
- 移动端响应式（Sidebar 折叠）
- 子页面通过 props 或 children 传入

```javascript
import { Sidebar } from '../../components/admin/Sidebar.js'
import { Topbar } from '../../components/admin/Topbar.js'
import { show } from '../../components/Notification.js'
import { isLoggedIn, clearAuth } from '../../utils/storage.js'

/**
 * 管理后台主布局
 * 包裹所有管理后台子页面
 */
export class AdminLayout {
  constructor(childComponent) {
    this.childComponent = childComponent
    this.childInstance = null
    this.sidebarOpen = false // 移动端控制
  }
  
  /**
   * 初始化：检查认证、创建子页面实例
   */
  async init(params, queryParams) {
    // 认证检查（双重保险，路由守卫已检查）
    if (!isLoggedIn()) {
      show.error('请先登录')
      window.location.hash = '/login'
      return
    }
    
    // 子页面不存在时显示 Dashboard
    if (!this.childComponent) {
      const { default: AdminDashboard } = await import('./AdminDashboard.js')
      this.childComponent = AdminDashboard
    }
    
    // 创建子页面实例
    this.childInstance = new this.childComponent()
    
    // 初始化子页面
    if (this.childInstance.init) {
      await this.childInstance.init(params, queryParams)
    }
  }
  
  /**
   * 渲染布局框架 + 子页面内容
   */
  render() {
    return `
      <div class="dm-admin-layout flex h-screen bg-gray-100">
        ${Sidebar({ 
          open: this.sidebarOpen,
          onClose: () => this.toggleSidebar()
        })}
        
        <div class="flex-1 flex flex-col overflow-hidden">
          ${Topbar({
            onMenuClick: () => this.toggleSidebar(),
            onLogout: () => this.handleLogout()
          })}
          
          <main id="admin-content" class="flex-1 overflow-auto p-6">
            ${this.childInstance?.render ? this.childInstance.render() : '<div>Loading...</div>'}
          </main>
        </div>
        
        <!-- 移动端遮罩 -->
        ${this.sidebarOpen ? `
          <div 
            class="dm-sidebar-overlay fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onclick="document.querySelector('.dm-sidebar').classList.remove('dm-sidebar--open')"
          ></div>
        ` : ''}
      </div>
    `
  }
  
  /**
   * 绑定事件：子页面事件由子页面自己绑定
   */
  bindEvents() {
    // 绑定子页面事件
    if (this.childInstance?.bindEvents) {
      this.childInstance.bindEvents()
    }
  }
  
  /**
   * 切换侧边栏（移动端）
   */
  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen
    const sidebar = document.querySelector('.dm-sidebar')
    if (sidebar) {
      sidebar.classList.toggle('dm-sidebar--open', this.sidebarOpen)
    }
  }
  
  /**
   * 退出登录
   */
  async handleLogout() {
    if (!confirm('确定要退出登录吗？')) return
    
    clearAuth()
    show.success('已退出登录')
    window.location.hash = '/login'
  }
  
  /**
   * 清理：调用子页面 destroy
   */
  destroy() {
    if (this.childInstance?.destroy) {
      this.childInstance.destroy()
    }
    this.childInstance = null
  }
}

export default AdminLayout
```

**验收要点**:
- [ ] 布局结构正确（Sidebar + MainArea）
- [ ] 认证检查在 `init()` 中
- [ ] 子页面动态加载和渲染
- [ ] 退出登录功能正常
- [ ] 移动端 Sidebar 可折叠

---

### 16.2 创建侧边栏组件

**文件**: `frontend/src/components/admin/Sidebar.js`（新建）

**设计要点**:
- 配置式导航菜单（易于扩展）
- 当前路由高亮
- 响应式设计（移动端折叠）

```javascript
/**
 * 管理后台侧边栏
 * @param {Object} props - 属性
 * @param {boolean} [props.open=false] - 是否展开（移动端）
 * @param {Function} [props.onClose] - 关闭回调（移动端）
 */
export function Sidebar({ open = false, onClose }) {
  // 导航菜单配置（集中管理，易于扩展）
  const navItems = [
    {
      path: '/admin/dashboard',
      icon: '📊',
      label: '仪表盘',
      active: window.location.hash === '#/admin/dashboard'
    },
    {
      path: '/admin/domains',
      icon: '🌐',
      label: '域名管理',
      active: window.location.hash.startsWith('#/admin/domains')
    },
    {
      path: '/admin/config',
      icon: '⚙️',
      label: '系统配置',
      active: window.location.hash.startsWith('#/admin/config')
    },
    {
      path: '/admin/history',
      icon: '📜',
      label: '历史记录',
      active: window.location.hash.startsWith('#/admin/history')
    }
  ]
  
  const currentPath = window.location.hash
  const activeClass = 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
  const inactiveClass = 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
  
  return `
    <aside 
      class="dm-sidebar fixed lg:static inset-y-0 left-0 z-30 w-60 bg-white border-r border-gray-200 transform ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out flex flex-col"
    >
      <!-- Logo 区域 -->
      <div class="h-16 flex items-center justify-center border-b border-gray-200 px-4">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🔐</span>
          <span class="text-lg font-bold text-gray-900">域名监控</span>
        </div>
        ${open ? `
          <button 
            class="lg:hidden ml-auto text-gray-500 hover:text-gray-700"
            onclick="${onClose ? 'window.__sidebarCloseHandler()' : ''}"
          >
            ✕
          </button>
        ` : ''}
      </div>
      
      <!-- 导航菜单 -->
      <nav class="flex-1 overflow-y-auto py-4">
        ${navItems.map(item => `
          <a
            href="#${item.path}"
            class="dm-nav-item flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${item.active ? activeClass : inactiveClass}"
            onclick="${item.active ? 'event.preventDefault()' : ''}"
          >
            <span class="text-lg">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}
      </nav>
      
      <!-- 底部信息 -->
      <div class="p-4 border-t border-gray-200">
        <div class="flex items-center gap-3 text-xs text-gray-500">
          <div class="w-2 h-2 rounded-full bg-green-500"></div>
          <span>系统运行正常</span>
        </div>
      </div>
    </aside>
  `
}

// 移动端关闭处理（全局绑定一次）
if (typeof window !== 'undefined' && !window.__sidebarCloseHandler) {
  window.__sidebarCloseHandler = () => {
    const sidebar = document.querySelector('.dm-sidebar')
    sidebar?.classList.remove('dm-sidebar--open')
  }
}

export default Sidebar
```

**验收要点**:
- [ ] 导航菜单配置式（易扩展）
- [ ] 当前路由高亮显示
- [ ] 移动端可折叠
- [ ] 使用 `dm-` 前缀

---

### 16.3 创建顶部栏组件

**文件**: `frontend/src/components/admin/Topbar.js`（新建）

**设计要点**:
- 面包屑导航（可选）
- 用户信息显示
- 退出按钮
- 响应式设计

```javascript
import { getCurrentUser } from '../../utils/storage.js'

/**
 * 管理后台顶部栏
 * @param {Object} props - 属性
 * @param {Function} [props.onMenuClick] - 菜单按钮点击（移动端）
 * @param {Function} [props.onLogout] - 退出登录回调
 */
export function Topbar({ onMenuClick, onLogout }) {
  const user = getCurrentUser()
  
  // 面包屑生成（根据当前路径）
  const crumbs = generateBreadcrumbs(window.location.hash)
  
  return `
    <header class="dm-topbar h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <!-- 左侧：菜单按钮 + 面包屑 -->
      <div class="flex items-center gap-4">
        <button 
          class="lg:hidden text-gray-500 hover:text-gray-700"
          onclick="${onMenuClick ? 'window.__sidebarToggleHandler()' : ''}"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        ${crumbs.length > 0 ? `
          <nav class="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            ${crumbs.map((crumb, index) => `
              ${index > 0 ? '<span class="text-gray-400">/</span>' : ''}
              ${index === crumbs.length - 1 ? 
                `<span class="text-gray-900 font-medium">${crumb.label}</span>` : 
                `<a href="#${crumb.path}" class="hover:text-gray-900">${crumb.label}</a>`
              }
            `).join('')}
          </nav>
        ` : ''}
      </div>
      
      <!-- 右侧：用户信息 + 退出 -->
      <div class="flex items-center gap-4">
        ${user?.endpoint ? `
          <div class="hidden md:flex items-center gap-2 text-sm text-gray-600">
            <span class="text-gray-400">|</span>
            <span>${user.endpoint.replace(/^https?:\/\//, '').split('/')[0]}</span>
          </div>
        ` : ''}
        
        <button 
          class="dm-btn dm-btn-secondary dm-btn-sm flex items-center gap-2"
          onclick="${onLogout ? 'window.__logoutHandler()' : ''}"
        >
          <span>🚪</span>
          <span class="hidden sm:inline">退出</span>
        </button>
      </div>
    </header>
  `
}

/**
 * 生成面包屑
 */
function generateBreadcrumbs(hash) {
  const path = hash.replace('#', '')
  const parts = path.split('/').filter(Boolean)
  
  const crumbMap = {
    'admin': '管理后台',
    'dashboard': '仪表盘',
    'domains': '域名管理',
    'config': '系统配置',
    'history': '历史记录'
  }
  
  const crumbs = []
  let accumulatedPath = ''
  
  parts.forEach(part => {
    accumulatedPath += '/' + part
    crumbs.push({
      path: accumulatedPath,
      label: crumbMap[part] || part
    })
  })
  
  return crumbs
}

// 退出处理（全局绑定一次）
if (typeof window !== 'undefined' && !window.__logoutHandler) {
  window.__logoutHandler = () => {
    if (typeof window.__topbarOnLogout === 'function') {
      window.__topbarOnLogout()
    }
  }
}

export default Topbar
```

**验收要点**:
- [ ] 面包屑自动生成
- [ ] 用户信息显示
- [ ] 退出按钮功能正常
- [ ] 响应式（移动端隐藏部分信息）

---

### 16.4 创建管理后台 Dashboard 页面

**文件**: `frontend/src/pages/admin/AdminDashboard.js`（新建）

**设计要点**:
- 作为 AdminLayout 的子页面
- 展示统计概览（域名总数、检测状态等）
- 使用 Card, Table 等基础组件

```javascript
import { Card } from '../../components/Card.js'
import { Table } from '../../components/Table.js'
import { get } from '../../utils/api.js'
import { formatDate } from '../../utils/index.js'

/**
 * 管理后台 Dashboard
 * 在 AdminLayout 中渲染
 */
export class AdminDashboard {
  constructor() {
    this.stats = null
    this.recentDomains = []
  }
  
  async init() {
    await this.loadData()
  }
  
  async loadData() {
    try {
      // 获取统计信息
      const statsRes = await get('/api/admin/stats')
      this.stats = statsRes.data
      
      // 获取最近域名
      const domainsRes = await get('/api/admin/domains')
      this.recentDomains = (domainsRes.data.domains || []).slice(0, 5)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }
  
  render() {
    if (!this.stats) {
      return '<div class="text-center py-12">加载中...</div>'
    }
    
    return `
      <div class="space-y-6">
        <h1 class="text-2xl font-bold text-gray-900">仪表盘</h1>
        
        <!-- 统计卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${Card({
            title: '监控域名',
            content: `
              <div class="text-3xl font-bold text-blue-600">${this.stats?.domainCount || 0}</div>
              <div class="text-sm text-gray-500 mt-1">总计</div>
            `
          })}
          
          ${Card({
            title: '运行中',
            content: `
              <div class="text-3xl font-bold text-green-600">${this.stats?.activeCount || 0}</div>
              <div class="text-sm text-gray-500 mt-1">正常检测</div>
            `
          })}
          
          ${Card({
            title: '已停止',
            content: `
              <div class="text-3xl font-bold text-red-600">${this.stats?.stoppedCount || 0}</div>
              <div class="text-sm text-gray-500 mt-1">检测失败</div>
            `
          })}
          
          ${Card({
            title: '今日检测',
            content: `
              <div class="text-3xl font-bold text-purple-600">${this.stats?.todayChecks || 0}</div>
              <div class="text-sm text-gray-500 mt-1">次</div>
            `
          })}
        </div>
        
        <!-- 最近域名列表 -->
        <div>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">最近域名</h2>
          ${Table({
            columns: [
              { key: 'domain', title: '域名' },
              { 
                key: 'status', 
                title: '状态',
                render: (value) => `
                  <span class="px-2 py-1 text-xs rounded-full ${
                    value === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }">
                    ${value === 'active' ? '运行中' : '已停止'}
                  </span>
                `
              },
              { 
                key: 'lastChecked', 
                title: '最近检测',
                render: (value) => value ? formatDate(value) : '暂无'
              }
            ],
            data: this.recentDomains
          })}
        </div>
      </div>
    `
  }
  
  destroy() {
    // 清理
  }
}

export default AdminDashboard
```

**验收要点**:
- [ ] 统计卡片显示正确
- [ ] 域名列表表格正常
- [ ] Loading 状态处理
- [ ] 错误处理

---

### 16.5 更新路由配置（嵌套路由）

**文件**: `frontend/src/router/routes.js`（重构）

**重要**: 这里需要改变路由结构，使用嵌套方式，避免每个页面都重复包一层 Layout。

```javascript
import PublicDashboard from '../pages/PublicDashboard.js'
import Login from '../pages/Login.js'
import AdminLayout from '../pages/admin/AdminLayout.js'
import NotFound from '../pages/NotFound.js'

export const routes = [
  // === 公开路由 ===
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
  
  // === 管理后台路由（嵌套结构）===
  // 父路由：AdminLayout
  {
    path: '/admin',
    name: 'admin',
    component: AdminLayout,
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: '/admin/dashboard',
        name: 'admin-dashboard',
        component: () => import('../pages/admin/AdminDashboard.js'),
        meta: { title: '仪表盘' }
      },
      {
        path: '/admin/domains',
        name: 'admin-domains',
        component: () => import('../pages/admin/AdminDomains.js'),
        meta: { title: '域名管理' }
      },
      {
        path: '/admin/config',
        name: 'admin-config',
        component: () => import('../pages/admin/AdminConfig.js'),
        meta: { title: '系统配置' }
      },
      {
        path: '/admin/history',
        name: 'admin-history',
        component: () => import('../pages/admin/AdminHistory.js'),
        meta: { title: '历史记录' }
      }
    ]
  },
  
  // === 404 ===
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
- [ ] 嵌套路由结构正确
- [ ] 子页面自动继承 Layout
- [ ] 懒加载配置正确
- [ ] 所有管理路由 `requiresAuth: true`

---

### 16.6 更新路由初始化逻辑

**文件**: `frontend/src/router/index.js`（修改）

**目标**: 支持嵌套路由，处理父路由→子页面的渲染。

```javascript
import { routes } from './routes.js'
import { matchRoute, getQueryParams } from './utils.js'
import { isLoggedIn } from '../utils/storage.js'

let currentPage = null
let currentParentInstance = null // 存储父布局实例

/**
 * 检查路由是否需要认证
 */
function requiresAuth(route) {
  return route.meta?.requiresAuth === true
}

/**
 * 查找嵌套的子路由
 */
function findChildRoute(parentRoute, path) {
  if (!parentRoute.children) return null
  
  for (const child of parentRoute.children) {
    if (child.path === path) return child
  }
  return null
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
  let parentRoute = null
  let childRoute = null
  let params = {}
  
  // 先查找父路由
  for (const route of routes) {
    if (route.path === '*') {
      matchedRoute = route
      continue
    }
    
    const routeParams = matchRoute(path, route.path)
    if (routeParams !== null) {
      matchedRoute = route
      params = routeParams
      
      // 检查是否有子路由
      if (route.children && path.startsWith(route.path + '/')) {
        parentRoute = route
        const childPath = path
        childRoute = findChildRoute(route, childPath)
        if (childRoute) {
          matchedRoute = childRoute
        }
      }
      break
    }
  }
  
  if (!matchedRoute) {
    matchedRoute = routes.find(r => r.path === '*')
  }
  
  // === 路由守卫 ===
  if (requiresAuth(matchedRoute) && !isLoggedIn()) {
    window.location.hash = '/login'
    return
  }
  
  // 已登录访问登录页，重定向
  if (matchedRoute.path === '/login' && isLoggedIn()) {
    window.location.hash = '/'
    return
  }
  
  // 设置页面标题
  document.title = matchedRoute.meta?.title || parentRoute?.meta?.title || '域名监控平台'
  
  // 清理旧页面
  if (currentPage) {
    if (typeof currentPage.destroy === 'function') {
      currentPage.destroy()
    }
    currentPage = null
  }
  
  // === 处理嵌套路由 ===
  if (parentRoute && childRoute) {
    // 有父路由和子路由：创建父布局 + 子页面
    const ParentComponent = parentRoute.component
    
    // 动态导入子组件
    const ChildComponent = typeof childRoute.component === 'function' 
      ? await childRoute.component()
      : childRoute.component
    
    currentParentInstance = new ParentComponent(ChildComponent)
    currentPage = currentParentInstance
  } else {
    // 普通路由
    const PageComponent = matchedRoute.component
    currentPage = new PageComponent()
  }
  
  // 初始化页面
  if (currentPage.init) {
    await currentPage.init(params, queryParams)
  }
  
  // 渲染
  const app = document.getElementById('app')
  if (app && currentPage.render) {
    app.innerHTML = currentPage.render()
    if (currentPage.bindEvents) {
      currentPage.bindEvents()
    }
  }
}

// 初始化
export function initRouter() {
  window.addEventListener('hashchange', renderRoute)
  renderRoute() // 初次加载
}

export function navigate(path) {
  window.location.hash = path
}
```

**验收要点**:
- [ ] 嵌套路由正确解析
- [ ] 父布局 + 子页面渲染
- [ ] 路由守卫工作正常
- [ ] 页面切换时正确清理

---

### 16.7 编写测试

**文件**: `frontend/tests/pages/admin/layout.test.js`（新建）

```javascript
import { runSuite, assertEqual } from '../../test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

/**
 * 管理后台布局测试
 */
export async function runAdminLayoutTests() {
  // 文件存在测试
  await runSuite('Admin - Layout Files Exist', async () => {
    assertEqual(
      existsSync(join(frontendRoot, 'src/pages/admin/AdminLayout.js')),
      true,
      'AdminLayout.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/admin/Sidebar.js')),
      true,
      'Sidebar.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/admin/Topbar.js')),
      true,
      'Topbar.js exists'
    )
  })
  
  // 布局组件测试
  await runSuite('Admin - Layout Structure', async () => {
    const layout = readFileSync(join(frontendRoot, 'src/pages/admin/AdminLayout.js'), 'utf-8')
    
    assertEqual(layout.includes('export class AdminLayout'), true, 'Has AdminLayout class')
    assertEqual(layout.includes('Sidebar'), true, 'Uses Sidebar component')
    assertEqual(layout.includes('Topbar'), true, 'Uses Topbar component')
    assertEqual(layout.includes('childComponent'), true, 'Supports child component')
    assertEqual(layout.includes('isLoggedIn'), true, 'Checks authentication')
  })
  
  // Sidebar 测试
  await runSuite('Admin - Sidebar', async () => {
    const sidebar = readFileSync(join(frontendRoot, 'src/components/admin/Sidebar.js'), 'utf-8')
    
    assertEqual(sidebar.includes('navItems'), true, 'Has navigation config')
    assertEqual(sidebar.includes('/admin/dashboard'), true, 'Has dashboard link')
    assertEqual(sidebar.includes('/admin/domains'), true, 'Has domains link')
    assertEqual(sidebar.includes('dm-sidebar'), true, 'Uses dm- prefix')
  })
  
  // Topbar 测试
  await runSuite('Admin - Topbar', async () => {
    const topbar = readFileSync(join(frontendRoot, 'src/components/admin/Topbar.js'), 'utf-8')
    
    assertEqual(topbar.includes('breadcrumb'), true, 'Has breadcrumbs')
    assertEqual(topbar.includes('退出'), true, 'Has logout button')
    assertEqual(topbar.includes('dm-topbar'), true, 'Uses dm- prefix')
    assertEqual(topbar.includes('getCurrentUser'), true, 'Gets user info')
  })
  
  // 路由嵌套配置测试
  await runSuite('Router - Nested Routes', async () => {
    const routes = readFileSync(join(frontendRoot, 'src/router/routes.js'), 'utf-8')
    
    assertEqual(routes.includes("path: '/admin'"), true, 'Has admin parent route')
    assertEqual(routes.includes('children:'), true, 'Has children routes')
    assertEqual(routes.includes('AdminLayout'), true, 'Uses AdminLayout component')
    assertEqual(routes.includes("import('../pages/admin/AdminDashboard.js')"), true, 'Lazy loads dashboard')
  })
}
```

---

## 测试用例

### 单元测试

```javascript
// Sidebar 渲染测试
const sidebar = Sidebar({ open: true })
assertEqual(sidebar.includes('dm-sidebar'), true, 'Has sidebar class')
assertEqual(sidebar.includes('仪表盘'), true, 'Has dashboard link')

// Topbar 渲染测试
const topbar = Topbar({ onLogout: () => {} })
assertEqual(topbar.includes('退出'), true, 'Has logout button')

// AdminLayout 认证测试
const layout = new AdminLayout()
await layout.init()
// 未登录时应跳转 /login

// 路由嵌套解析测试
const route = findChildRoute(adminRoute, '/admin/dashboard')
assertEqual(route.name, 'admin-dashboard', 'Finds child route')
```

---

## 验收标准

### 功能验收

- [ ] 访问 `/admin/dashboard` 显示管理后台布局
- [ ] Sidebar 显示正确导航菜单
- [ ] Topbar 显示用户信息和退出按钮
- [ ] 点击退出成功跳转 `/login`
- [ ] 未登录访问 `/admin/*` 跳转 `/login`
- [ ] 已登录访问 `/login` 跳转 `/`
- [ ] 移动端 Sidebar 可折叠

### 代码质量验收

- [ ] 布局与子页面分离
- [ ] 导航菜单配置式（易扩展）
- [ ] 使用 `dm-` 前缀
- [ ] 无硬编码路由
- [ ] 测试覆盖率 100%

### 视觉验收

- [ ] Sidebar 固定宽度 240px
- [ ] 响应式布局正常
- [ ] 导航高亮正确
- [ ] 面包屑显示正确

### 扩展性验收

- [ ] 新增页面无需修改 Layout
- [ ] 新增页面只需添加路由配置
- [ ] 导航菜单集中配置

---

## 相关文件

- `frontend/src/pages/admin/AdminLayout.js` - 管理后台主布局
- `frontend/src/pages/admin/AdminDashboard.js` - 管理后台 Dashboard
- `frontend/src/components/admin/Sidebar.js` - 侧边栏组件
- `frontend/src/components/admin/Topbar.js` - 顶部栏组件
- `frontend/src/router/routes.js` - 嵌套路由配置
- `frontend/src/router/index.js` - 路由初始化

---

## 任务 15+16 联动说明

### 认证流程

```
任务 15: 登录页输入 Token → 验证 → 保存凭证
                ↓
任务 16: 管理后台 Layout → 检查凭证 → 显示内容
                ↓
        点击退出 → 清除凭证 → 跳转登录页
```

### 路由结构

```javascript
// 任务 15 配置 /login
{ path: '/login', component: Login, requiresAuth: false }

// 任务 16 配置 /admin (嵌套)
{
  path: '/admin',
  component: AdminLayout,
  requiresAuth: true,
  children: [...]
}
```

### 凭证管理

- `storage.js` 统一存储（`setApiToken`, `isLoggedIn`, `clearAuth`）
- 登录页保存 → Layout 检查 → 退出清除
- 无需修改 storage.js

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-06-02 | 1.0 | 初始版本 | AI Assistant |
