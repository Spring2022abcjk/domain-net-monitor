# 子任务 17：域名管理页面

**状态**: 🔴 未启动  
**优先级**: 高  
**预计工时**: 4 小时  
**创建日期**: 2026-06-04  
**更新日期**: 2026-06-04  
**前置依赖**: 任务 16（管理后台主布局）✅  

---

## 任务目标

实现域名管理页面，提供域名列表展示、添加、删除、设为默认展示等操作，是管理后台的核心功能页面。

### 核心需求

1. **域名列表展示**: 表格形式展示所有监控域名，包含状态、最近检测时间等信息
2. **添加域名**: 支持单个添加，批量添加（逗号分隔）
3. **删除域名**: 支持批量删除、单个删除
4. **默认展示管理**: 设置/取消默认展示域名（公开 Dashboard 显示这些域名）
5. **状态显示**: 显示域名检测状态（运行中/已停止）
6. **操作确认**: 删除操作需要二次确认

### 与任务 18-19 的联动

- **任务 18（配置页）**: 域名管理页的"批量操作"与配置页的"默认设置"联动
- **任务 19（历史页）**: 点击域名可跳转到历史记录页查看该域名的历史数据
- **路由导航**: 三个页面共享 Sidebar 导航结构

---

## API 端点

### 域名管理 API（需要认证）

| 方法 | 路径 | 说明 | 鉴权 | 限流豁免 |
|------|------|------|------|----------|
| GET | `/api/admin/domains` | 获取所有域名 | ✅ | ✅ |
| POST | `/api/admin/domains` | 添加域名 | ✅ | ✅ |
| DELETE | `/api/admin/domains/:domain` | 删除域名 | ✅ | ✅ |
| POST | `/api/admin/domains/:domain/default` | 设为默认展示 | ✅ | ✅ |
| DELETE | `/api/admin/domains/:domain/default` | 取消默认展示 | ✅ | ✅ |

### 请求格式

#### `POST /api/admin/domains`

**请求体**:
```json
{
  "domain": "example.com"
}
```

**响应 (成功)**:
```json
{
  "code": 200,
  "data": {
    "domain": "example.com",
    "success": true
  },
  "msg": "Domain added successfully"
}
```

**响应 (冲突)**:
```json
{
  "code": 409,
  "data": null,
  "msg": "Domain already exists"
}
```

---

## 页面结构

```
#/admin/domains (AdminDomains)
├── PageHeader
│   ├── Title ("域名管理")
│   └── Actions
│       ├── Batch Delete Button
│       └── Add Domain Button (打开 Modal)
├── FilterBar (可选)
│   ├── Search Box (搜索域名)
│   └── Status Filter (全部/运行中/已停止)
├── DomainTable
│   ├── Header
│   │   ├── Checkbox (全选)
│   │   ├── 域名
│   │   ├── 状态
│   │   ├── 最近检测
│   │   ├── 默认展示
│   │   └── 操作
│   └── Rows
│       ├── Checkbox (行选择)
│       ├── 域名 (可点击跳转历史)
│       ├── Status Badge (运行中/已停止)
│       ├── 时间格式化
│       ├── Toggle Switch (默认展示开关)
│       └── Action Buttons (删除)
└── Pagination (可选，如果域名超过 20 个)
```

---

## 实现步骤

### 17.1 创建域名管理页面组件

**文件**: `frontend/src/pages/admin/AdminDomains.js`（重构占位文件）

**目标**:
- 替换占位内容，实现完整的域名管理功能
- 使用 Table 组件展示域名列表
- 实现添加、删除、批量操作

**代码框架**:

```javascript
/**
 * 域名管理页面
 * 任务 17：完整的域名 CRUD 操作
 */
import { Table } from '../../components/Table.js'
import { Button } from '../../components/Button.js'
import { Modal } from '../../components/Modal.js'
import { Toggle } from '../../components/Toggle.js'
import { show } from '../../components/Notification.js'
import { get, post, del } from '../../utils/api.js'
import { formatDate } from '../../utils/index.js'

/**
 * 域名管理页面类
 */
export class AdminDomains {
  constructor() {
    this.domains = []
    this.selectedDomains = []
    this.loading = false
    this.showAddModal = false
    this.newDomainInput = ''
  }
  
  async init() {
    await this.loadData()
  }
  
  async loadData() {
    try {
      this.loading = true
      const res = await get('/api/admin/domains')
      this.domains = res.data.domains || []
      this.loading = false
    } catch (error) {
      show.error('加载域名列表失败')
      this.loading = false
    }
  }
  
  render() {
    return `
      <div class="space-y-6">
        <!-- 页面头部 -->
        ${this.renderHeader()}
        
        <!-- 域名表格 -->
        ${this.renderTable()}
        
        <!-- 添加域名弹窗 -->
        ${this.renderAddModal()}
      </div>
    `
  }
  
  renderHeader() {
    return `
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">域名管理</h1>
        <div class="flex items-center gap-3">
          ${Button({
            text: '批量删除',
            variant: 'danger',
            size: 'md',
            disabled: this.selectedDomains.length === 0,
            onclick: () => this.handleBatchDelete()
          })}
          ${Button({
            text: '添加域名',
            variant: 'primary',
            size: 'md',
            onclick: () => this.showAddModal = true
          })}
        </div>
      </div>
    `
  }
  
  renderTable() {
    const columns = [
      { 
        key: 'select',
        title: '<input type="checkbox" id="selectAll" />',
        render: (_, row) => `
          <input 
            type="checkbox" 
            class="dm-domain-checkbox"
            data-domain="${row.domain}"
            ${this.selectedDomains.includes(row.domain) ? 'checked' : ''}
          />
        `
      },
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
        key: 'status', 
        title: '状态',
        render: (value) => this.renderStatusBadge(value)
      },
      { 
        key: 'lastChecked', 
        title: '最近检测',
        render: (value) => value ? formatDate(value) : '暂无'
      },
      { 
        key: 'isDefault', 
        title: '默认展示',
        render: (value, row) => this.renderToggle(value, row.domain)
      },
      { 
        key: 'actions', 
        title: '操作',
        render: (_, row) => this.renderActions(row.domain)
      }
    ]
    
    return Table({
      columns,
      data: this.domains
    })
  }
  
  bindEvents() {
    // 全选
    const selectAll = document.getElementById('selectAll')
    selectAll?.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.selectedDomains = this.domains.map(d => d.domain)
      } else {
        this.selectedDomains = []
      }
      this.render()
    })
    
    // 单选
    document.querySelectorAll('.dm-domain-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const domain = e.target.getAttribute('data-domain')
        if (e.target.checked) {
          this.selectedDomains.push(domain)
        } else {
          this.selectedDomains = this.selectedDomains.filter(d => d !== domain)
        }
      })
    })
  }
  
  // ... 其他方法
}

export default AdminDomains
```

**验收要点**:
- [ ] 域名列表正确显示
- [ ] 状态徽章颜色正确（运行中绿色，已停止红色）
- [ ] 支持单选、全选
- [ ] 全选按钮状态同步正确

---

### 17.2 实现添加域名功能

**文件**: `frontend/src/pages/admin/AdminDomains.js`（续）

**目标**:
- 添加弹窗组件
- 支持单个添加和批量添加
- 域名格式验证

**代码框架**:

```javascript
renderAddModal() {
  if (!this.showAddModal) return ''
  
  return Modal({
    title: '添加域名',
    content: `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            域名（多个域名用逗号分隔）
          </label>
          <textarea 
            id="newDomainInput"
            class="dm-input w-full h-32"
            placeholder="example.com 或 example.com,test.com,abc.com"
            rows="4"
            value="${this.newDomainInput}"
          ></textarea>
          <p class="mt-1 text-sm text-gray-500">
            支持批量添加，用英文逗号分隔多个域名
          </p>
        </div>
      </div>
    `,
    footer: `
      <div class="flex items-center justify-end gap-3">
        ${Button({
          text: '取消',
          variant: 'secondary',
          onclick: () => {
            this.showAddModal = false
            this.newDomainInput = ''
          }
        })}
        ${Button({
          text: '添加',
          variant: 'primary',
          onclick: () => this.handleAddDomain()
        })}
      </div>
    `
  })
}

async handleAddDomain() {
  const input = document.getElementById('newDomainInput')?.value.trim()
  if (!input) {
    show.error('请输入域名')
    return
  }
  
  // 解析多个域名
  const domains = input.split(',').map(d => d.trim()).filter(Boolean)
  
  // 验证域名格式
  const invalidDomains = domains.filter(d => !isValidDomain(d))
  if (invalidDomains.length > 0) {
    show.error(`以下域名格式不正确：${invalidDomains.join(', ')}`)
    return
  }
  
  // 批量添加
  try {
    for (const domain of domains) {
      await post('/api/admin/domains', { domain })
    }
    
    show.success(`成功添加 ${domains.length} 个域名`)
    this.showAddModal = false
    this.newDomainInput = ''
    await this.loadData()
  } catch (error) {
    show.error(error.message || '添加失败')
  }
}
```

**验收要点**:
- [ ] 弹窗正确显示/隐藏
- [ ] 单个域名添加成功
- [ ] 批量添加成功（逗号分隔）
- [ ] 域名格式验证正确
- [ ] 重复添加提示冲突错误

---

### 17.3 实现删除功能

**文件**: `frontend/src/pages/admin/AdminDomains.js`（续）

**目标**:
- 单个删除（带确认）
- 批量删除（带确认）

**代码框架**:

```javascript
renderActions(domain) {
  return `
    <button 
      class="dm-btn dm-btn-danger dm-btn-sm"
      onclick="window.__deleteDomainHandler('${domain}')"
    >
      删除
    </button>
  `
}

bindGlobalHandlers() {
  // 删除域名
  window.__deleteDomainHandler = async (domain) => {
    if (!confirm(`确定要删除域名 ${domain} 吗？`)) return
    
    try {
      await del(`/api/admin/domains/${encodeURIComponent(domain)}`)
      show.success('域名已删除')
      await this.loadData()
      this.render()
      this.bindEvents()
    } catch (error) {
      show.error('删除失败')
    }
  }
}

async handleBatchDelete() {
  if (this.selectedDomains.length === 0) {
    show.error('请选择要删除的域名')
    return
  }
  
  if (!confirm(`确定要删除选中的 ${this.selectedDomains.length} 个域名吗？`)) return
  
  try {
    for (const domain of this.selectedDomains) {
      await del(`/api/admin/domains/${encodeURIComponent(domain)}`)
    }
    
    show.success(`成功删除 ${this.selectedDomains.length} 个域名`)
    this.selectedDomains = []
    await this.loadData()
  } catch (error) {
    show.error('批量删除失败')
  }
}

destroy() {
  window.__deleteDomainHandler = null
}
```

**验收要点**:
- [ ] 删除前有确认提示
- [ ] 单个删除成功
- [ ] 批量删除成功
- [ ] 删除后列表刷新
- [ ] 已删除的域名从选择列表清除

---

### 17.4 实现默认展示管理

**文件**: `frontend/src/pages/admin/AdminDomains.js`（续）

**目标**:
- Toggle 开关控制默认展示
- 与公开 Dashboard 联动

**代码框架**:

```javascript
renderToggle(isDefault, domain) {
  return `
    <label class="dm-toggle">
      <input 
        type="checkbox" 
        ${isDefault ? 'checked' : ''}
        onchange="window.__toggleDefaultHandler('${domain}', this.checked)"
      />
      <span class="dm-toggle-slider"></span>
    </label>
  `
}

bindGlobalHandlers() {
  // ... __deleteDomainHandler ...
  
  // 切换默认展示
  window.__toggleDefaultHandler = async (domain, isDefault) => {
    try {
      if (isDefault) {
        await post(`/api/admin/domains/${encodeURIComponent(domain)}/default`, {})
        show.success('已设为默认展示')
      } else {
        await del(`/api/admin/domains/${encodeURIComponent(domain)}/default`)
        show.success('已取消默认展示')
      }
      await this.loadData()
    } catch (error) {
      show.error('操作失败')
    }
  }
}

destroy() {
  window.__deleteDomainHandler = null
  window.__toggleDefaultHandler = null
}
```

**验收要点**:
- [ ] Toggle 开关状态正确
- [ ] 设为默认成功
- [ ] 取消默认成功
- [ ] 公开 Dashboard 显示正确的默认域名

---

### 17.5 新增 Modal 和 Toggle 组件

**文件**: `frontend/src/components/Modal.js`（新建）

```javascript
/**
 * 模态框组件
 * @param {Object} props - 属性
 * @param {string} props.title - 标题
 * @param {string} props.content - 内容
 * @param {string} [props.footer] - 底部内容
 */
export function Modal({ title, content, footer }) {
  return `
    <div class="dm-modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div class="dm-modal bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
        </div>
        <div class="p-6">
          ${content}
        </div>
        ${footer ? `
          <div class="p-6 border-t border-gray-200 bg-gray-50">
            ${footer}
          </div>
        ` : ''}
      </div>
    </div>
  `
}

export default Modal
```

**文件**: `frontend/src/components/Toggle.js`（新建）

```javascript
/**
 * 开关组件
 * @param {Object} props - 属性
 * @param {boolean} [props.checked=false] - 是否选中
 * @param {string} [props.id] - ID
 * @param {Function} [props.onChange] - change 事件回调
 */
export function Toggle({ checked = false, id, onChange }) {
  return `
    <label class="dm-toggle inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        ${id ? `id="${id}"` : ''}
        class="sr-only peer"
        ${checked ? 'checked' : ''}
        onchange="${onChange ? 'onChange(event)' : ''}"
      />
      <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  `
}

export default Toggle
```

**验收要点**:
- [ ] Modal 正确显示/隐藏
- [ ] Modal 有遮罩层
- [ ] Toggle 样式正确
- [ ] Toggle 状态同步正确

---

### 17.6 编写测试

**文件**: `frontend/tests/pages/admin-domains.test.js`（新建）

```javascript
import { runSuite, assertEqual } from '../test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

export async function runAdminDomainsTests() {
  // 文件存在测试
  await runSuite('Task 17 - AdminDomains Files Exist', async () => {
    assertEqual(
      existsSync(join(frontendRoot, 'src/pages/admin/AdminDomains.js')),
      true,
      'AdminDomains.js exists'
    )
  })
  
  // 组件使用测试
  await runSuite('Task 17 - AdminDomains Uses Components', async () => {
    const code = readFileSync(join(frontendRoot, 'src/pages/admin/AdminDomains.js'), 'utf-8')
    
    assertEqual(code.includes('Table'), true, 'Uses Table component')
    assertEqual(code.includes('Button'), true, 'Uses Button component')
    assertEqual(code.includes('Modal'), true, 'Uses Modal component')
    assertEqual(code.includes('get(\'/api/admin/domains\')'), true, 'Calls GET API')
    assertEqual(code.includes('post(\'/api/admin/domains\''), true, 'Calls POST API')
    assertEqual(code.includes('del(\'/api/admin/domains/'), true, 'Calls DELETE API')
  })
  
  // 功能测试
  await runSuite('Task 17 - AdminDomains Features', async () => {
    const code = readFileSync(join(frontendRoot, 'src/pages/admin/AdminDomains.js'), 'utf-8')
    
    assertEqual(code.includes('selectedDomains'), true, 'Has selection logic')
    assertEqual(code.includes('handleBatchDelete'), true, 'Has batch delete')
    assertEqual(code.includes('handleAddDomain'), true, 'Has add domain')
    assertEqual(code.includes('confirm'), true, 'Has confirmation dialog')
    assertEqual(code.includes('isValidDomain'), true, 'Validates domain format')
  })
}

// 运行测试
runAdminDomainsTests()
  .then(() => console.log('[Test] AdminDomains tests completed'))
  .catch((error) => {
    console.error('[Test] AdminDomains tests failed:', error)
    process.exit(1)
  })
```

---

## 测试用例

### 单元测试

```javascript
// 域名格式验证
assertEqual(isValidDomain('example.com'), true)
assertEqual(isValidDomain('invalid'), false)

// 批量解析
const domains = 'a.com, b.com ,c.com'.split(',').map(d => d.trim()).filter(Boolean)
assertEqual(domains.length, 3)
assertEqual(domains[0], 'a.com')
```

### 手动测试（curl）

```bash
# 获取域名列表
curl -X GET http://localhost:8787/api/admin/domains \
  -H "X-API-Token: $TOKEN" | jq

# 添加域名
curl -X POST http://localhost:8787/api/admin/domains \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}' | jq

# 删除域名
curl -X DELETE http://localhost:8787/api/admin/domains/example.com \
  -H "X-API-Token: $TOKEN" | jq

# 设为默认
curl -X POST http://localhost:8787/api/admin/domains/example.com/default \
  -H "X-API-Token: $TOKEN" | jq
```

---

## 验收标准

### 功能验收

- [ ] 域名列表正确显示（所有字段）
- [ ] 添加域名成功（单个 + 批量）
- [ ] 删除域名成功（单个 + 批量）
- [ ] 默认展示切换成功
- [ ] 域名点击跳转历史页（任务 19）
- [ ] 选择/全选功能正常

### 代码质量验收

- [ ] 使用组件库（Table, Button, Modal, Toggle）
- [ ] 错误处理完善
- [ ] 无 console.log 调试代码
- [ ] 通过 ESLint
- [ ] JSDoc 注释完整

### 测试验收

- [ ] 单元测试覆盖率 100%
- [ ] 所有测试通过
- [ ] 手动测试验证

### UI/UX 验收

- [ ] 表格样式美观
- [ ] Modal 动画流畅
- [ ] 删除确认提示明显
- [ ] Loading 状态显示
- [ ] 响应式布局正常

---

## 相关文件

### 新建文件
- `frontend/src/pages/admin/AdminDomains.js` - 域名管理页面（重构）
- `frontend/src/components/Modal.js` - 模态框组件
- `frontend/src/components/Toggle.js` - 开关组件
- `frontend/tests/pages/admin-domains.test.js` - 测试文件

### 修改文件
- `frontend/tests/index.js` - 添加测试导入

### 现有文件
- `backend/src/routes/admin/domains.js` - 域名管理 API
- `frontend/src/components/Table.js` - 表格组件
- `frontend/src/components/Button.js` - 按钮组件

---

## 依赖关系

### 前置依赖
- ✅ 任务 14: 公开 Dashboard（使用默认域名）
- ✅ 任务 15: 管理后台登录（认证）
- ✅ 任务 16: 管理后台主布局（路由 + 布局）

### 后续依赖
- 任务 18: 系统配置（共享配置管理逻辑）
- 任务 19: 历史记录（域名点击跳转）
- 任务 20: 前后端联调

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 批量操作性能问题 | 大量域名时删除慢 | 分批次处理，显示进度 |
| 域名格式验证复杂 | 用户输入多样 | 宽松验证，后端兜底 |
| Modal 组件缺失 | 需要新增组件 | 参考 Card 组件实现 |
| Toggle 状态同步 | 可能与后端不一致 | 操作后重新加载列表 |

---

## 下一步

1. 创建 Modal 和 Toggle 组件
2. 实现域名列表展示
3. 实现添加功能（单个 + 批量）
4. 实现删除功能（单个 + 批量）
5. 实现默认展示管理
6. 编写测试
7. 手动测试验证

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-06-04 | 1.0 | 初始版本 | AI Assistant |
