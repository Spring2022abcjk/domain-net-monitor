# 子任务 14：公开 Dashboard 页面

**状态**: 🔴 未启动  
**优先级**: 高  
**预计工时**: 3 小时  
**创建日期**: 2026-06-01  
**更新日期**: 2026-06-01  
**前置依赖**: 任务 13（前端基础组件）✅  

---

## 任务目标

实现公开访问的 Dashboard 首页，展示所有被监控域名的状态概览，支持搜索过滤。

### 核心需求

1. **域名列表展示**: 以卡片形式展示所有被监控域名及其状态
2. **搜索功能**: 支持按域名关键词搜索过滤
3. **状态可视化**: 清晰显示域名运行状态（运行中/已停止/检测中）
4. **响应式布局**: 适配桌面和移动设备
5. **无需认证**: 公开页面，任何人可访问

---

## 页面结构

```
#/ (PublicDashboard)
├── Header
│   ├── Logo ("域名监控平台")
│   └── Nav Links ("首页" | "管理后台" → #/login)
├── SearchBox
│   ├── 搜索输入框
│   └── 搜索按钮
├── DomainList
│   └── DomainCard[] (卡片列表)
│       ├── 域名
│       ├── 状态徽章
│       ├── 首次检测时间
│       ├── 最近检测时间
│       └── 状态详情按钮
└── Footer
    └── 版权信息
```

---

## API 端点

### 公开 API（无需认证）

| 方法 | 路径 | 说明 | 鉴权 | 限流豁免 |
|------|------|------|------|----------|
| GET | `/api/public/domains` | 获取所有域名列表 | ❌ | ✅ |
| GET | `/api/public/stats/:domain` | 获取单个域名统计 | ❌ | ✅ |

### 响应格式

#### `GET /api/public/domains`

**响应**:
```json
{
  "code": 200,
  "data": {
    "domains": [
      {
        "domain": "cloudflare.com",
        "firstSeen": 1717200000000,
        "lastChecked": 1717286400000,
        "status": "active"
      }
    ],
    "count": 1
  },
  "msg": "success"
}
```

#### `GET /api/public/stats/:domain`

**响应**:
```json
{
  "code": 200,
  "data": {
    "domain": "cloudflare.com",
    "status": "active",
    "firstSeen": 1717200000000,
    "lastChecked": 1717286400000,
    "totalChecks": 100,
    "successCount": 98,
    "failureCount": 2,
    "successRate": 98,
    "latestResults": [
      {
        "timestamp": 1717286400000,
        "statusCode": 200,
        "responseTime": 150,
        "success": true,
        "error": null
      }
    ]
  },
  "msg": "success"
}
```

---

## 实现步骤

### 14.1 创建公开 API 路由

**文件**: `worker/src/routes/public/domains.js`（新建）

实现获取域名列表的公开接口：

```javascript
import { jsonResponse } from '../../utils/helper.js'

/**
 * 获取所有域名列表（公开）
 */
export async function handleGetPublicDomains(request, env) {
  try {
    const domainList = await env.KV_DOMAIN_LIST.get('domain_list', { type: 'json' }) || []
    
    const domains = await Promise.all(domainList.map(async (domain) => {
      const stats = await env.KV_DOMAIN_LIST.get(`stats:${domain}`, { type: 'json' })
      return {
        domain,
        firstSeen: stats?.firstSeen || null,
        lastChecked: stats?.lastChecked || null,
        status: stats?.status || 'unknown'
      }
    }))
    
    return jsonResponse({
      domains,
      count: domains.length
    }, 200)
  } catch (error) {
    console.error('Error in handleGetPublicDomains:', error.message)
    return jsonResponse(null, 500, 'Internal server error')
  }
}
```

**文件**: `worker/src/routes/public/stats.js`（新建）

实现获取单个域名统计的公开接口。

**验收要点**:
- [ ] 无需 API Token 即可访问
- [ ] 返回格式符合项目规范（`jsonResponse`）
- [ ] 错误处理完整
- [ ] 单元测试覆盖

---

### 14.2 创建新组件

#### 14.2.1 DomainCard 组件

**文件**: `frontend/src/components/DomainCard.js`（新建）

```javascript
export function DomainCard({ domain, status, firstSeen, lastChecked, onViewDetail }) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    stopped: 'bg-red-100 text-red-800',
    checking: 'bg-yellow-100 text-yellow-800',
    unknown: 'bg-gray-100 text-gray-800'
  }
  
  const statusLabels = {
    active: '运行中',
    stopped: '已停止',
    checking: '检测中',
    unknown: '未知'
  }
  
  return `
    <div class="dm-card p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">${domain}</h3>
        <span class="px-2 py-1 text-sm rounded-full ${statusColors[status] || statusColors.unknown}">
          ${statusLabels[status] || statusLabels.unknown}
        </span>
      </div>
      <div class="space-y-2 text-sm text-gray-600">
        <p>首次检测：<span class="text-gray-900">${formatDate(firstSeen)}</span></p>
        <p>最近检测：<span class="text-gray-900">${formatDate(lastChecked)}</span></p>
      </div>
      <div class="mt-4">
        <button 
          class="dm-btn dm-btn-primary dm-btn-sm"
          onclick="window.__domainCardHandler('${domain}')"
        >
          状态详情
        </button>
      </div>
    </div>
  `
}

export default DomainCard
```

#### 14.2.2 SearchBox 组件

**文件**: `frontend/src/components/SearchBox.js`（新建）

```javascript
export function SearchBox({ value, onSearch, placeholder = '搜索域名...' }) {
  return `
    <div class="dm-search-box mb-6">
      <div class="flex gap-2">
        <input 
          type="text" 
          id="domain-search"
          class="dm-input flex-1"
          placeholder="${placeholder}"
          value="${value}"
          onkeydown="if(event.key==='Enter')window.__searchBoxHandler('${value}')"
        />
        <button 
          class="dm-btn dm-btn-primary"
          onclick="window.__searchBoxHandler('${value}')"
        >
          搜索
        </button>
      </div>
    </div>
  `
}

export default SearchBox
```

#### 14.2.3 Footer 组件

**文件**: `frontend/src/components/Footer.js`（新建）

```javascript
export function Footer() {
  const year = new Date().getFullYear()
  return `
    <footer class="dm-footer mt-auto py-4 border-t border-gray-200">
      <div class="text-center text-sm text-gray-500">
        <p>&copy; ${year} 域名监控平台。All rights reserved.</p>
      </div>
    </footer>
  `
}

export default Footer
```

**验收要点**:
- [ ] 所有组件使用 `dm-` 前缀
- [ ] 支持 Tailwind CSS 样式
- [ ] 导出默认和具名导出
- [ ] 组件测试覆盖

---

### 14.3 创建公开 Dashboard 页面

**文件**: `frontend/src/pages/PublicDashboard.js`（新建）

```javascript
import { DomainCard } from '../components/DomainCard.js'
import { SearchBox } from '../components/SearchBox.js'
import { Footer } from '../components/Footer.js'
import { get } from '../utils/api.js'
import { formatDate } from '../utils/index.js'

export class PublicDashboard {
  constructor() {
    this.domains = []
    this.filteredDomains = []
    this.searchQuery = ''
  }
  
  async init() {
    await this.loadDomains()
    this.render()
    this.bindEvents()
  }
  
  async loadDomains() {
    try {
      const res = await get('/api/public/domains')
      this.domains = res.data.domains || []
      this.filteredDomains = this.domains
    } catch (error) {
      console.error('Failed to load domains:', error)
      this.domains = []
      this.filteredDomains = []
    }
  }
  
  render() {
    return `
      <div class="min-h-screen flex flex-col bg-gray-50">
        <!-- Header -->
        <header class="dm-header bg-white shadow-sm">
          <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
              <h1 class="text-xl font-bold text-gray-900">域名监控平台</h1>
              <nav class="space-x-4">
                <a href="#/" class="text-gray-600 hover:text-gray-900">首页</a>
                <a href="#/login" class="dm-btn dm-btn-primary dm-btn-sm">管理后台</a>
              </nav>
            </div>
          </div>
        </header>
        
        <!-- Main Content -->
        <main class="container mx-auto px-4 py-8 flex-1">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">监控域名列表</h2>
          
          ${SearchBox({ 
            value: this.searchQuery, 
            onSearch: (query) => this.handleSearch(query)
          })}
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${this.filteredDomains.map(d => DomainCard({
              domain: d.domain,
              status: d.status,
              firstSeen: d.firstSeen,
              lastChecked: d.lastChecked,
              onViewDetail: () => this.handleViewDetail(d.domain)
            })).join('')}
          </div>
          
          ${this.filteredDomains.length === 0 ? `
            <div class="text-center py-12 text-gray-500">
              <p>暂无监控域名</p>
            </div>
          ` : ''}
        </main>
        
        ${Footer()}
      </div>
    `
  }
  
  bindEvents() {
    window.__searchBoxHandler = (query) => this.handleSearch(query)
    window.__domainCardHandler = (domain) => this.handleViewDetail(domain)
  }
  
  handleSearch(query) {
    this.searchQuery = query.trim().toLowerCase()
    if (!this.searchQuery) {
      this.filteredDomains = this.domains
    } else {
      this.filteredDomains = this.domains.filter(d => 
        d.domain.toLowerCase().includes(this.searchQuery)
      )
    }
    this.render()
  }
  
  handleViewDetail(domain) {
    // TODO: 跳转到域名详情页（任务 16）
    console.log('Viewing domain:', domain)
  }
  
  destroy() {
    window.__searchBoxHandler = null
    window.__domainCardHandler = null
  }
}

export default PublicDashboard
```

**验收要点**:
- [ ] 页面加载自动获取域名列表
- [ ] 搜索功能正常工作
- [ ] 响应式布局（移动端单列，桌面端三列）
- [ ] 空状态提示
- [ ] 组件卸载时清理全局事件

---

### 14.4 注册路由

**文件**: `frontend/src/router/routes.js`（修改）

添加公开 Dashboard 路由：

```javascript
import { PublicDashboard } from '../pages/PublicDashboard.js'

export const routes = [
  {
    path: '/',
    component: PublicDashboard,
    meta: {
      title: '域名监控平台',
      auth: false // 无需认证
    }
  },
  // ... 其他路由
]
```

**验收要点**:
- [ ] 访问 `#/` 能正确渲染页面
- [ ] 页面标题正确设置
- [ ] 无需认证即可访问

---

### 14.5 编写测试

**文件**: `frontend/tests/pages/public-dashboard.test.js`（新建）

```javascript
import { runSuite, assertEqual } from '../test-runner.js'

export function runPublicDashboardTests() {
  await runSuite('Pages - PublicDashboard', async () => {
    // 组件存在测试
    // 搜索功能测试
    // 空状态测试
    // 事件绑定测试
  })
}
```

**验收要点**:
- [ ] 覆盖所有核心功能
- [ ] 测试通过

---

## 测试用例

### 单元测试

**文件**: `frontend/tests/pages/public-dashboard.test.js`

```javascript
// 组件渲染测试
assertEqual(DomainCard({ domain: 'test.com' }).includes('test.com'), true)
assertEqual(SearchBox({ value: '' }).includes('搜索'), true)
assertEqual(Footer().includes('©'), true)

// 搜索功能测试
const page = new PublicDashboard()
page.domains = [{ domain: 'cloudflare.com' }, { domain: 'google.com' }]
page.handleSearch('cloud')
assertEqual(page.filteredDomains.length, 1)
assertEqual(page.filteredDomains[0].domain, 'cloudflare.com')

// 空状态测试
page.domains = []
page.render()
assertEqual(page.render().includes('暂无监控域名'), true)
```

### 集成测试

**文件**: `tests/integration/public-api.test.js`

```bash
# 手动测试命令
curl http://localhost:8787/api/public/domains | jq
curl http://localhost:8787/api/public/stats/cloudflare.com | jq
```

---

## 验收标准

### 功能验收

- [ ] 访问 `#/` 能正常加载 Dashboard 页面
- [ ] 域名卡片列表正确显示
- [ ] 搜索框能过滤域名
- [ ] 域名状态颜色正确（运行中=绿色，已停止=红色）
- [ ] 响应式布局正常
- [ ] 无需认证即可访问

### 代码质量验收

- [ ] 所有组件使用 `dm-` 前缀
- [ ] API 调用使用统一错误处理
- [ ] 无 ESLint 警告
- [ ] 测试覆盖率 100%
- [ ] 无 console.log 调试代码

### 视觉验收

- [ ] Header 样式与项目一致
- [ ] 卡片布局整齐
- [ ] 搜索框样式美观
- [ ] Footer 样式简洁

---

## 相关文件

- `worker/src/routes/public/domains.js` - 公开域名列表 API
- `worker/src/routes/public/stats.js` - 公开统计 API
- `frontend/src/pages/PublicDashboard.js` - 公开 Dashboard 页面
- `frontend/src/components/DomainCard.js` - 域名卡片组件
- `frontend/src/components/SearchBox.js` - 搜索框组件
- `frontend/src/components/Footer.js` - 页脚组件

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-06-01 | 1.0 | 初始版本 | AI Assistant |
