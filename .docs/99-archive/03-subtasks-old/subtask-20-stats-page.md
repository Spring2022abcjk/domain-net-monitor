# 子任务 20：统计概览页面

**状态**: 🔴 未启动  
**优先级**: 中  
**预计工时**: 2.5 小时  
**创建日期**: 2026-06-04  
**更新日期**: 2026-06-04  
**前置依赖**: 任务 16（管理后台主布局）✅，任务 10（统计 API）✅  

---

## 任务目标

实现统计概览页面，展示系统运行数据、检测统计、限流统计等关键指标，提供数据可视化卡片和趋势图表。

### 核心需求

1. **核心指标卡片**: 总域名数、默认域名数、今日检测次数、限流命中次数
2. **系统运行时长**: 显示系统已运行天数
3. **检测统计**: 成功次数、失败次数、成功率
4. **限流统计**: 限流命中次数、限流率
5. **最后重置时间**: 显示统计数据最后重置的时间
6. **数据刷新**: 支持手动刷新统计数据

### 与任务 17-19 的联动

- **任务 17（域名管理）**: 统计数据中的域名数来自域名管理页
- **任务 18（配置页）**: 限流配置影响限流统计数据
- **任务 19（历史页）**: 检测成功率基于历史页的数据计算
- **共享 API**: 都使用 `/api/admin/stats` 接口

---

## API 端点

### 统计概览 API（需要认证）

| 方法 | 路径 | 说明 | 鉴权 | 限流豁免 |
|------|------|------|------|----------|
| GET | `/api/admin/stats` | 获取完整统计数据 | ✅ | ✅ |

### 响应格式

#### `GET /api/admin/stats`

**响应**:
```json
{
  "code": 200,
  "data": {
    "totalDomains": 10,
    "defaultDomains": 3,
    "historyDomains": 8,
    "cachedResults": 5,
    "todayRequests": 1000,
    "rateLimitHits": 50,
    "successCount": 950,
    "failCount": 50,
    "successRate": "95.00%",
    "rateLimitRate": "5.00%",
    "uptime": "1.0 days",
    "lastReset": "2026-06-04T00:00:00.000Z"
  },
  "msg": "Stats retrieved successfully"
}
```

**字段说明**:
- `totalDomains`: 总域名数
- `defaultDomains`: 默认展示域名数
- `historyDomains`: 有历史记录的域名数
- `cachedResults`: 缓存的结果数
- `todayRequests`: 今日请求总数
- `rateLimitHits`: 今日限流命中次数
- `successCount`: 今日检测成功次数
- `failCount`: 今日检测失败次数
- `successRate`: 成功率（百分比字符串）
- `rateLimitRate`: 限流率（百分比字符串）
- `uptime`: 系统运行时长（格式化字符串）
- `lastReset`: 最后重置时间（ISO 8601 格式）

---

## 页面结构

```
#/admin/stats (AdminStats)
├── PageHeader
│   └── Title ("统计概览")
├── StatsGrid
│   ├── StatCard (总域名数)
│   ├── StatCard (默认域名数)
│   ├── StatCard (今日检测)
│   └── StatCard (限流命中)
├── DetectionStats
│   ├── SuccessRate Card (成功率)
│   └── FailRate Card (失败率)
├── SystemInfo
│   ├── Uptime Card (运行时长)
│   └── LastReset Card (最后重置)
└── Actions
    └── Refresh Button (刷新数据)
```

---

## 实现步骤

### 20.1 创建统计概览页面组件

**文件**: `frontend/src/pages/admin/AdminStats.js`（新建）

**目标**:
- 实现完整的统计数据展示功能
- 使用卡片组件分组展示统计指标
- 支持手动刷新数据
- 格式化显示数据（百分比、时长等）

**代码框架**:

```javascript
/**
 * 统计概览页面
 * 任务 20：展示系统统计数据
 */
import { Card } from '../../components/Card.js'
import { Button } from '../../components/Button.js'
import { show } from '../../components/Notification.js'
import { get } from '../../utils/api.js'

/**
 * 统计页面类
 */
export class AdminStats {
  constructor() {
    this.stats = null
    this.loading = false
  }
  
  async init() {
    await this.loadStats()
  }
  
  async loadStats() {
    try {
      this.loading = true
      const res = await get('/api/admin/stats')
      this.stats = res.data
      this.loading = false
    } catch (error) {
      show.error('加载统计数据失败：' + error.message)
      this.loading = false
    }
  }
  
  render() {
    if (this.loading) {
      return '<div class="text-center py-12 text-gray-500">加载中...</div>'
    }
    
    if (!this.stats) {
      return '<div class="text-center py-12 text-gray-500">统计数据加载失败</div>'
    }
    
    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">统计概览</h1>
            <p class="text-sm text-gray-600 mt-1">
              系统运行数据和检测统计
            </p>
          </div>
          ${Button({
            text: '刷新数据',
            variant: 'secondary',
            size: 'md',
            id: 'refreshStatsBtn'
          })}
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${this.renderCoreStats()}
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${this.renderDetectionStats()}
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${this.renderSystemInfo()}
        </div>
      </div>
    `
  }
  
  renderCoreStats() {
    return `
      ${Card({
        title: '总域名数',
        content: `<div class="text-3xl font-bold text-blue-600">${this.stats.totalDomains}</div>`,
        footer: '所有已添加的域名'
      })}
      ${Card({
        title: '默认域名数',
        content: `<div class="text-3xl font-bold text-green-600">${this.stats.defaultDomains}</div>`,
        footer: '在公开页面展示的域名'
      })}
      ${Card({
        title: '今日检测',
        content: `<div class="text-3xl font-bold text-purple-600">${this.stats.todayRequests}</div>`,
        footer: '今日总检测次数'
      })}
      ${Card({
        title: '限流命中',
        content: `<div class="text-3xl font-bold text-orange-600">${this.stats.rateLimitHits}</div>`,
        footer: '今日触发限流次数'
      })}
    `
  }
  
  renderDetectionStats() {
    return `
      ${Card({
        title: '成功率',
        content: `
          <div class="text-3xl font-bold ${this.stats.successRate.startsWith('9') ? 'text-green-600' : 'text-yellow-600'}">
            ${this.stats.successRate}
          </div>
        `,
        footer: '成功次数: ' + this.stats.successCount,
        class: 'border-l-4 border-green-500'
      })}
      ${Card({
        title: '失败次数',
        content: `
          <div class="text-3xl font-bold ${this.stats.failCount > 0 ? 'text-red-600' : 'text-gray-600'}">
            ${this.stats.failCount}
          </div>
        `,
        footer: '失败率: ' + (100 - parseFloat(this.stats.successRate)).toFixed(2) + '%',
        class: 'border-l-4 border-red-500'
      })}
    `
  }
  
  renderSystemInfo() {
    return `
      ${Card({
        title: '系统运行时长',
        content: `<div class="text-3xl font-bold text-blue-600">${this.stats.uptime}</div>`,
        footer: '系统持续运行时间'
      })}
      ${Card({
        title: '最后重置时间',
        content: `<div class="text-lg font-mono text-gray-700">${new Date(this.stats.lastReset).toLocaleString()}</div>`,
        footer: '统计数据每日自动重置'
      })}
    `
  }
  
  bindEvents() {
    document.getElementById('refreshStatsBtn')?.addEventListener('click', () => {
      this.loadStats().then(() => {
        show.success('数据已刷新')
      })
    })
  }
  
  destroy() {
    // 清理逻辑
  }
}

export default AdminStats
```

**验收要点**:
- [ ] 统计数据加载正确
- [ ] 卡片布局响应式
- [ ] 刷新功能正常
- [ ] 数据格式化正确（百分比、时长）

---

### 20.2 编写测试

**文件**: `frontend/tests/pages/admin-stats.test.js`（新建）

```javascript
/**
 * 任务 20 - 统计概览页面测试
 */

import { runSuite, assertEqual } from '../test-runner.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '../..')

/**
 * 运行任务 20 测试
 */
export async function runAdminStatsTests() {
  // 文件存在性测试
  await runSuite('Task 20 - AdminStats Files Exist', () => {
    const adminStatsPath = join(ROOT, 'src/pages/admin/AdminStats.js')
    const exists = fileExists(adminStatsPath)
    assertEqual(exists, true, 'AdminStats.js exists')
  })
  
  // 组件使用测试
  await runSuite('Task 20 - AdminStats Uses Components', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')
    
    assertEqual(content.includes("from '../../components/Card.js'"), true, 'Imports Card component')
    assertEqual(content.includes("from '../../components/Button.js'"), true, 'Imports Button component')
    assertEqual(content.includes('Card({'), true, 'Uses Card component')
    assertEqual(content.includes('Button({'), true, 'Uses Button component')
  })
  
  // API 调用测试
  await runSuite('Task 20 - AdminStats API Calls', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')
    
    assertEqual(content.includes("get('/api/admin/stats')"), true, 'Calls GET stats API')
  })
  
  // 功能完整性测试
  await runSuite('Task 20 - AdminStats Features', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')
    
    assertEqual(content.includes('totalDomains'), true, 'Has total domains stat')
    assertEqual(content.includes('defaultDomains'), true, 'Has default domains stat')
    assertEqual(content.includes('todayRequests'), true, 'Has today requests stat')
    assertEqual(content.includes('rateLimitHits'), true, 'Has rate limit hits stat')
    assertEqual(content.includes('successCount'), true, 'Has success count stat')
    assertEqual(content.includes('failCount'), true, 'Has fail count stat')
    assertEqual(content.includes('successRate'), true, 'Has success rate stat')
    assertEqual(content.includes('uptime'), true, 'Has uptime stat')
    assertEqual(content.includes('lastReset'), true, 'Has last reset stat')
  })
  
  // 方法完整性测试
  await runSuite('Task 20 - AdminStats Methods', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')
    
    assertEqual(content.includes('loadStats'), true, 'Has loadStats method')
    assertEqual(content.includes('renderCoreStats'), true, 'Has core stats render')
    assertEqual(content.includes('renderDetectionStats'), true, 'Has detection stats render')
    assertEqual(content.includes('renderSystemInfo'), true, 'Has system info render')
  })
  
  // Loading 状态测试
  await runSuite('Task 20 - AdminStats Loading States', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')
    
    assertEqual(content.includes('this.loading'), true, 'Has loading state')
    assertEqual(content.includes('加载中'), true, 'Shows loading text')
  })
  
  // 错误处理测试
  await runSuite('Task 20 - AdminStats Error Handling', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')
    
    assertEqual(content.includes('try {'), true, 'Uses try-catch blocks')
    assertEqual(content.includes('catch (error)'), true, 'Catches errors')
    assertEqual(content.includes('show.error'), true, 'Shows error messages')
    assertEqual(content.includes('show.success'), true, 'Shows success messages')
  })
  
  // 响应式布局测试
  await runSuite('Task 20 - AdminStats Responsive Layout', () => {
    const content = readFileSync(join(ROOT, 'src/pages/admin/AdminStats.js'), 'utf-8')
    
    assertEqual(content.includes('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4'), true, 'Has responsive grid')
    assertEqual(content.includes('Card'), true, 'Uses Card component')
  })
}

/**
 * 检查文件是否存在
 */
function fileExists(path) {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}
```

---

## 测试用例

### 手动测试（curl）

```bash
# 获取统计数据
curl -X GET http://localhost:8787/api/admin/stats \
  -H "X-API-Token: $TOKEN" | jq

# 验证响应结构
curl -s -X GET http://localhost:8787/api/admin/stats \
  -H "X-API-Token: $TOKEN" | jq '.data | keys'

# 验证统计数据格式
curl -s -X GET http://localhost:8787/api/admin/stats \
  -H "X-API-Token: $TOKEN" | jq '.data.successRate'
```

---

## 验收标准

### 功能验收

- [ ] 统计数据加载正确
- [ ] 核心指标卡片显示正确（4 个）
- [ ] 检测统计卡片显示正确（2 个）
- [ ] 系统信息卡片显示正确（2 个）
- [ ] 刷新功能正常工作
- [ ] 数据格式化正确（百分比、时长）
- [ ] Loading 状态显示正确
- [ ] 错误处理完善

### 代码质量验收

- [ ] 使用组件库（Card, Button）
- [ ] 错误处理完善
- [ ] 无 console.log 调试代码
- [ ] 响应式布局正确
- [ ] 通过 ESLint

### 测试验收

- [ ] 单元测试覆盖率 100%
- [ ] 所有测试通过（8 个套件）

### UI/UX 验收

- [ ] 卡片布局美观
- [ ] 数据可视化清晰
- [ ] 颜色使用合理（成功绿色、失败红色、警告橙色）
- [ ] 响应式设计正常

---

## 相关文件

### 新建文件
- `frontend/src/pages/admin/AdminStats.js` - 统计页面
- `frontend/tests/pages/admin-stats.test.js` - 测试文件
- `frontend/tests/index.js` - 添加测试导入

### 现有文件
- `backend/src/routes/admin/stats.js` - 统计 API
- `frontend/src/components/Card.js` - 卡片组件
- `frontend/src/components/Button.js` - 按钮组件

---

## 依赖关系

### 前置依赖
- ✅ 任务 16: 管理后台主布局
- ✅ 任务 10: 统计概览 API
- ✅ 任务 17: 域名管理（域名数据来源）
- ✅ 任务 18: 配置管理（限流数据来源）

### 后续依赖
- 任务 21: 前后端联调
- 任务 22: 部署配置

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 统计数据结构复杂 | 前端解析困难 | 后端返回格式化数据 |
| 数据实时性要求高 | 频繁请求 API | 手动刷新而非自动轮询 |
| 卡片布局复杂 | 响应式设计困难 | 使用 Tailwind grid 布局 |

---

## 下一步

1. 创建 AdminStats.js 文件
2. 实现 loadStats 方法
3. 实现核心指标卡片（4 个）
4. 实现检测统计卡片（2 个）
5. 实现系统信息卡片（2 个）
6. 实现刷新功能
7. 编写测试文件
8. 添加测试导入到 index.js

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-06-04 | 1.0 | 初始版本 | AI Assistant |

---

## 设计稿

### 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  统计概历                                       [刷新数据]  │
│  系统运行数据和检测统计                                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ 总域名数│  │默认域名 │  │ 今日检测│  │ 限流命中│       │
│  │   10    │  │    3    │  │  1000   │  │   50    │       │
│  │所有域名 │  │展示域名 │  │今日次数 │  │今日触发 │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │      成功率         │  │       失败次数      │          │
│  │      95.00%         │  │         50          │          │
│  │   成功：950         │  │    失败率：5.00%    │          │
│  └─────────────────────┘  └─────────────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │    系统运行时长     │  │    最后重置时间     │          │
│  │     1.0 days        │  │  2026-06-04 00:00   │          │
│  │  持续运行时间       │  │   每日自动重置      │          │
│  └─────────────────────┘  └─────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 颜色方案

- **总域名数**: 蓝色 (#3B82F6)
- **默认域名数**: 绿色 (#10B981)
- **今日检测**: 紫色 (#8B5CF6)
- **限流命中**: 橙色 (#F97316)
- **成功率**: 绿色（>90%）/ 黄色（<90%）
- **失败次数**: 红色（>0）/ 灰色（=0）
- **运行时长**: 蓝色

---

**任务 20 完成标准**: 8 个统计卡片正确显示，支持手动刷新，测试覆盖率 100%
