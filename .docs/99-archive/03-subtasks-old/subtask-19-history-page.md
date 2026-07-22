# 子任务 19：历史记录页面

**状态**: 🔴 未启动  
**优先级**: 中  
**预计工时**: 3 小时  
**创建日期**: 2026-06-04  
**更新日期**: 2026-06-04  
**前置依赖**: 任务 16（管理后台主布局）✅  

---

## 任务目标

实现历史记录页面，提供域名历史检测记录的查询、筛选、导出等功能，支持按域名、时间范围、检测状态筛选历史记录。

### 核心需求

1. **历史记录列表**: 表格形式展示历史检测记录
2. **域名筛选**: 按域名查询历史记录
3. **时间筛选**: 按时间范围筛选（最近 7 天、最近 30 天、自定义）
4. **状态筛选**: 按检测状态筛选（成功/失败）
5. **记录导出**: 导出历史记录为 CSV 文件
6. **记录清理**: 手动清理指定域名的历史记录
7. **分页加载**: 支持分页，避免一次性加载过多数据

### 与任务 17-18 的联动

- **任务 17（域名管理）**: 点击域名可跳转到历史页查看该域名的历史
- **任务 18（配置页）**: 配置页的历史保留天数决定历史页显示的数据范围
- **共享 API**: 三个页面都使用 `/api/admin/history` 接口

---

## API 端点

### 历史记录 API（需要认证）

| 方法 | 路径 | 说明 | 鉴权 | 限流豁免 |
|------|------|------|------|----------|
| GET | `/api/admin/history` | 获取所有域名的历史记录 | ✅ | ✅ |
| GET | `/api/admin/history?domain=xxx` | 获取指定域名的历史记录 | ✅ | ✅ |
| DELETE | `/api/admin/history/:domain` | 清理指定域名的历史记录 | ✅ | ✅ |
| DELETE | `/api/admin/history` | 批量清理历史记录 | ✅ | ✅ |

### 响应格式

#### `GET /api/admin/history`

**响应**:
```json
{
  "code": 200,
  "data": {
    "domains": [
      {
        "domain": "example.com",
        "count": 10,
        "latestCheck": 1717500000000
      }
    ],
    "totalCount": 100
  },
  "msg": "History retrieved successfully"
}
```

#### `GET /api/admin/history?domain=example.com`

**响应**:
```json
{
  "code": 200,
  "data": {
    "domain": "example.com",
    "history": [
      {
        "timestamp": 1717500000000,
        "httpsRR": "success",
        "ipv6": true,
        "ech": false
      }
    ]
  },
  "msg": "History retrieved successfully"
}
```

---

## 页面结构

```
#/admin/history (AdminHistory)
├── PageHeader
│   ├── Title ("历史记录")
│   └── Actions
│       ├── Export Button (导出 CSV)
│       └── Cleanup Button (清理)
├── FilterBar
│   ├── Domain Select (选择域名)
│   ├── Date Range Picker (时间范围)
│   └── Status Filter (状态筛选)
├── HistoryTable (域名列表视图)
│   ├── 域名
│   ├── 记录数
│   ├── 最近检测时间
│   └── 操作（查看详情、清理）
└── DetailModal (域名详情弹窗)
    ├── 域名
    ├── 历史表格
    │   ├── 检测时间
    │   ├── HTTPS RR
    │   ├── IPv6
    │   └── ECH
    └── Close Button
```

---

## 实现步骤

### 19.1 创建历史记录页面组件

**文件**: `frontend/src/pages/admin/AdminHistory.js`（重构占位文件）

**目标**:
- 替换占位内容，实现完整的历史记录查询功能
- 域名列表视图 + 详情弹窗
- 支持筛选、导出、清理

**代码框架**:

```javascript
/**
 * 历史记录页面
 * 任务 19：历史记录查询、筛选、导出
 */
import { Table } from '../../components/Table.js'
import { Button } from '../../components/Button.js'
import { Modal } from '../../components/Modal.js'
import { show } from '../../components/Notification.js'
import { get, del } from '../../utils/api.js'
import { formatDate } from '../../utils/index.js'

/**
 * 历史记录页面类
 */
export class AdminHistory {
  constructor() {
    this.domains = []
    this.selectedDomain = null
    this.historyDetail = null
    this.showDetailModal = false
    this.loading = false
    this.filters = {
      domain: '',
      days: 7
    }
  }
  
  async init() {
    await this.loadDomains()
  }
  
  async loadDomains() {
    try {
      this.loading = true
      const res = await get('/api/admin/history')
      this.domains = res.data.domains || []
      this.loading = false
    } catch (error) {
      show.error('加载历史记录失败')
      this.loading = false
    }
  }
  
  render() {
    if (this.loading) {
      return '<div class="text-center py-12">加载中...</div>'
    }
    
    return `
      <div class="space-y-6">
        ${this.renderHeader()}
        ${this.renderFilterBar()}
        ${this.renderDomainTable()}
        ${this.renderDetailModal()}
      </div>
    `
  }
  
  renderHeader() {
    return `
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">历史记录</h1>
        <div class="flex items-center gap-3">
          ${Button({
            text: '导出数据',
            variant: 'secondary',
            onclick: () => this.handleExport()
          })}
          ${Button({
            text: '批量清理',
            variant: 'danger',
            onclick: () => this.handleBatchCleanup()
          })}
        </div>
      </div>
    `
  }
  
  renderFilterBar() {
    return `
      <div class="bg-white rounded-lg shadow p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              域名筛选
            </label>
            <select 
              id="domainFilter"
              class="dm-input w-full"
              onchange="window.__historyDomainFilterHandler(this.value)"
            >
              <option value="">全部域名</option>
              ${this.domains.map(d => `
                <option value="${d.domain}" ${this.filters.domain === d.domain ? 'selected' : ''}>
                  ${d.domain}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              时间范围
            </label>
            <select 
              id="daysFilter"
              class="dm-input w-full"
              onchange="window.__historyDaysFilterHandler(this.value)"
            >
              <option value="7" ${this.filters.days === 7 ? 'selected' : ''}>最近 7 天</option>
              <option value="30" ${this.filters.days === 30 ? 'selected' : ''}>最近 30 天</option>
              <option value="90" ${this.filters.days === 90 ? 'selected' : ''}>最近 90 天</option>
            </select>
          </div>
        </div>
      </div>
    `
  }
  
  renderDomainTable() {
    const columns = [
      { 
        key: 'domain', 
        title: '域名',
        render: (value) => `
          <a href="#/admin/history?domain=${value}" class="text-blue-600 hover:underline">
            ${value}
          </a>
        `
      },
      { 
        key: 'count', 
        title: '记录数',
        render: (value) => `<span class="font-medium">${value}</span>`
      },
      { 
        key: 'latestCheck', 
        title: '最近检测',
        render: (value) => value ? formatDate(value) : '暂无'
      },
      { 
        key: 'actions', 
        title: '操作',
        render: (_, row) => `
          <div class="flex items-center gap-2">
            <button 
              class="dm-btn dm-btn-secondary dm-btn-sm"
              onclick="window.__viewHistoryDetailHandler('${row.domain}')"
            >
              详情
            </button>
            <button 
              class="dm-btn dm-btn-danger dm-btn-sm"
              onclick="window.__cleanupDomainHandler('${row.domain}')"
            >
              清理
            </button>
          </div>
        `
      }
    ]
    
    return Table({
      columns,
      data: this.domains
    })
  }
  
  async loadHistoryDetail(domain) {
    try {
      const days = document.getElementById('daysFilter')?.value || 7
      const res = await get(`/api/admin/history?domain=${encodeURIComponent(domain)}&days=${days}`)
      this.historyDetail = res.data
      this.showDetailModal = true
    } catch (error) {
      show.error('加载详情失败')
    }
  }
  
  renderDetailModal() {
    if (!this.showDetailModal || !this.historyDetail) return ''
    
    const history = this.historyDetail.history || []
    
    return Modal({
      title: `历史记录详情 - ${this.historyDetail.domain}`,
      content: `
        <div class="max-h-96 overflow-auto">
          ${history.length > 0 ? `
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">检测时间</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">HTTPS RR</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">IPv6</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">ECH</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${history.map(record => `
                  <tr>
                    <td class="px-4 py-2 text-sm text-gray-900">${formatDate(record.timestamp)}</td>
                    <td class="px-4 py-2 text-sm">
                      <span class="px-2 py-1 text-xs rounded-full ${
                        record.httpsRR === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }">
                        ${record.httpsRR}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-sm">
                      ${record.ipv6 ? '✅' : '❌'}
                    </td>
                    <td class="px-4 py-2 text-sm">
                      ${record.ech ? '✅' : '❌'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="text-center py-8 text-gray-500">暂无历史记录</div>'}
        </div>
      `,
      footer: `
        <div class="flex items-center justify-end">
          ${Button({
            text: '关闭',
            variant: 'secondary',
            onclick: () => {
              this.showDetailModal = false
              this.historyDetail = null
            }
          })}
        </div>
      `
    })
  }
  
  bindGlobalHandlers() {
    window.__viewHistoryDetailHandler = (domain) => {
      this.selectedDomain = domain
      this.loadHistoryDetail(domain)
    }
    
    window.__cleanupDomainHandler = async (domain) => {
      if (!confirm(`确定要清理域名 ${domain} 的历史记录吗？`)) return
      
      try {
        await del(`/api/admin/history/${encodeURIComponent(domain)}`)
        show.success('历史记录已清理')
        await this.loadDomains()
      } catch (error) {
        show.error('清理失败')
      }
    }
  }
  
  async handleExport() {
    if (this.domains.length === 0) {
      show.error('没有可导出的数据')
      return
    }
    
    try {
      // 生成 CSV 内容
      const headers = ['Domain,Latest Check,Record Count']
      const rows = this.domains.map(d => 
        `${d.domain},${new Date(d.latestCheck).toISOString()},${d.count}`
      )
      
      const csv = [headers, ...rows].join('\n')
      
      // 创建下载链接
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `history-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
      
      show.success('导出成功')
    } catch (error) {
      show.error('导出失败')
    }
  }
  
  async handleBatchCleanup() {
    if (!confirm('确定要清理所有历史记录吗？此操作不可恢复。')) return
    
    try {
      await del('/api/admin/history')
      show.success('历史记录已清理')
      await this.loadDomains()
    } catch (error) {
      show.error('清理失败')
    }
  }
  
  destroy() {
    window.__viewHistoryDetailHandler = null
    window.__cleanupDomainHandler = null
  }
}

export default AdminHistory
```

**验收要点**:
- [ ] 历史记录列表正确显示
- [ ] 详情弹窗正常
- [ ] 导出 CSV 功能正常
- [ ] 清理功能正常

---

### 19.2 编写测试

**文件**: `frontend/tests/pages/admin-history.test.js`（新建）

```javascript
import { runSuite, assertEqual } from '../test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

export async function runAdminHistoryTests() {
  // 文件存在测试
  await runSuite('Task 19 - AdminHistory Files Exist', async () => {
    assertEqual(
      existsSync(join(frontendRoot, 'src/pages/admin/AdminHistory.js')),
      true,
      'AdminHistory.js exists'
    )
  })
  
  // 组件使用测试
  await runSuite('Task 19 - AdminHistory Uses Components', async () => {
    const code = readFileSync(join(frontendRoot, 'src/pages/admin/AdminHistory.js'), 'utf-8')
    
    assertEqual(code.includes('Table'), true, 'Uses Table component')
    assertEqual(code.includes('Button'), true, 'Uses Button component')
    assertEqual(code.includes('Modal'), true, 'Uses Modal component')
    assertEqual(code.includes('get(\'/api/admin/history\')'), true, 'Calls GET history API')
    assertEqual(code.includes('del(\'/api/admin/history\')'), true, 'Calls DELETE history API')
  })
  
  // 功能测试
  await runSuite('Task 19 - AdminHistory Features', async () => {
    const code = readFileSync(join(frontendRoot, 'src/pages/admin/AdminHistory.js'), 'utf-8')
    
    assertEqual(code.includes('domainFilter'), true, 'Has domain filter')
    assertEqual(code.includes('daysFilter'), true, 'Has days filter')
    assertEqual(code.includes('handleExport'), true, 'Has export function')
    assertEqual(code.includes('handleBatchCleanup'), true, 'Has cleanup function')
    assertEqual(code.includes('historyDetail'), true, 'Has detail view')
  })
}

// 运行测试
runAdminHistoryTests()
  .then(() => console.log('[Test] AdminHistory tests completed'))
  .catch((error) => {
    console.error('[Test] AdminHistory tests failed:', error)
    process.exit(1)
  })
```

---

## 测试用例

### 手动测试（curl）

```bash
# 获取所有域名的历史统计
curl -X GET http://localhost:8787/api/admin/history \
  -H "X-API-Token: $TOKEN" | jq

# 获取指定域名的历史记录
curl -X GET "http://localhost:8787/api/admin/history?domain=example.com&days=7" \
  -H "X-API-Token: $TOKEN" | jq

# 清理指定域名的历史记录
curl -X DELETE http://localhost:8787/api/admin/history/example.com \
  -H "X-API-Token: $TOKEN" | jq

# 批量清理所有历史记录
curl -X DELETE http://localhost:8787/api/admin/history \
  -H "X-API-Token: $TOKEN" | jq
```

---

## 验收标准

### 功能验收

- [ ] 历史记录列表正确显示
- [ ] 详情弹窗正常
- [ ] 域名筛选功能正常
- [ ] 时间筛选功能正常
- [ ] 导出 CSV 功能正常
- [ ] 清理功能正常（单个 + 批量）

### 代码质量验收

- [ ] 使用组件库（Table, Button, Modal）
- [ ] 错误处理完善
- [ ] 无 console.log 调试代码

### 测试验收

- [ ] 单元测试覆盖率 100%
- [ ] 所有测试通过

### UI/UX 验收

- [ ] 表格样式美观
- [ ] 筛选器布局合理
- [ ] Modal 动画流畅
- [ ] Loading 状态显示

---

## 相关文件

### 新建文件
- `frontend/src/pages/admin/AdminHistory.js` - 历史记录页面（重构）
- `frontend/tests/pages/admin-history.test.js` - 测试文件

### 修改文件
- `frontend/tests/index.js` - 添加测试导入

### 现有文件
- `backend/src/routes/admin/history.js` - 历史记录 API
- `frontend/src/components/Table.js` - 表格组件
- `frontend/src/components/Button.js` - 按钮组件
- `frontend/src/components/Modal.js` - 模态组件（任务 17）

---

## 依赖关系

### 前置依赖
- ✅ 任务 16: 管理后台主布局
- ✅ 后端任务 9: 历史记录 API
- ✅ 任务 17: 域名管理（Modal 组件）

### 后续依赖
- 任务 20: 前后端联调
- 任务 21: 部署配置

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 大量数据加载 | 页面卡顿 | 分页加载，限制显示数量 |
| CSV 导出内存占用 | 大文件导出失败 | 流式导出，分批处理 |
| 清理操作误操作 | 数据丢失 | 二次确认，批量操作更谨慎 |

---

## 下一步

1. 加载历史记录列表
2. 实现筛选器（域名、时间）
3. 实现详情弹窗
4. 实现导出功能
5. 实现清理功能
6. 编写测试
7. 手动测试验证

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-06-04 | 1.0 | 初始版本 | AI Assistant |
