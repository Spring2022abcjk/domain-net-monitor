# 子任务 18：系统配置页面

**状态**: 🔴 未启动  
**优先级**: 中  
**预计工时**: 3 小时  
**创建日期**: 2026-06-04  
**更新日期**: 2026-06-04  
**前置依赖**: 任务 16（管理后台主布局）✅  

---

## 任务目标

实现系统配置页面，提供检测频率、历史记录保留时间、DoH 服务器配置等系统设置的管理界面。

### 核心需求

1. **检测配置**: 设置定时检测间隔（默认 12 小时）
2. **历史配置**: 设置历史记录保留天数（默认 7 天）
3. **DoH 配置**: 配置主备 DoH 服务器地址
4. **限流配置**: 设置 API 限流参数（可选）
5. **配置保存**: 保存配置到 KV 存储
6. **配置恢复**: 一键恢复默认配置

### 与任务 17-19 的联动

- **任务 17（域名管理）**: 配置页的"默认域名数"与域名管理页的默认展示联动
- **任务 19（历史页）**: 配置页的历史保留天数决定历史页显示的数据范围
- **共享 API**: 三个页面都使用 `/api/admin/config` 接口

---

## API 端点

### 配置管理 API（需要认证）

| 方法 | 路径 | 说明 | 鉴权 | 限流豁免 |
|------|------|------|------|----------|
| GET | `/api/admin/config` | 获取完整配置 | ✅ | ✅ |
| PUT | `/api/admin/config` | 更新配置 | ✅ | ✅ |
| GET | `/api/admin/doh` | 获取 DoH 配置 | ✅ | ✅ |
| PUT | `/api/admin/doh` | 更新 DoH 配置 | ✅ | ✅ |
| POST | `/api/admin/doh/test` | 测试 DoH 服务器 | ✅ | ✅ |

### 请求格式

#### `PUT /api/admin/config`

**请求体**:
```json
{
  "refreshInterval": 43200,
  "historyRetention": 7,
  "rateLimit": {
    "windowMs": 60000,
    "maxRequests": 10
  }
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "refreshInterval": 43200,
    "historyRetention": 7,
    "rateLimit": {...},
    "doh": {...}
  },
  "msg": "Configuration updated successfully"
}
```

---

## 页面结构

```
#/admin/config (AdminConfig)
├── PageHeader
│   └── Title ("系统配置")
├── ConfigForm
│   ├── Section 1: 检测配置
│   │   ├── Input (检测间隔，单位：秒)
│   │   └── Help Text ("默认 43200 秒 = 12 小时")
│   ├── Section 2: 历史配置
│   │   ├── Input (保留天数，单位：天)
│   │   └── Help Text ("超过设定天数的历史记录将被清理")
│   ├── Section 3: DoH 配置
│   │   ├── Input (DoH 主服务器 URL)
│   │   ├── Input (DoH 备用服务器 URL)
│   │   └── Button (测试连接)
│   └── Section 4: 限流配置（可选）
│       ├── Input (时间窗口，单位：毫秒)
│       └── Input (最大请求数)
├── FormActions
│   ├── Button (恢复默认)
│   └── Button (保存配置)
└── Toast (保存成功提示)
```

---

## 实现步骤

### 18.1 创建配置管理页面组件

**文件**: `frontend/src/pages/admin/AdminConfig.js`（重构占位文件）

**目标**:
- 替换占位内容，实现完整的配置管理功能
- 表单分组展示（检测配置、历史配置、DoH 配置）
- 实时验证输入合法性

**代码框架**:

```javascript
/**
 * 系统配置页面
 * 任务 18：配置管理系统
 */
import { Input } from '../../components/Input.js'
import { Button } from '../../components/Button.js'
import { show } from '../../components/Notification.js'
import { get, put, post } from '../../utils/api.js'

/**
 * 配置页面类
 */
export class AdminConfig {
  constructor() {
    this.config = null
    this.loading = false
    this.saving = false
  }
  
  async init() {
    await this.loadConfig()
  }
  
  async loadConfig() {
    try {
      this.loading = true
      const [configRes, dohRes] = await Promise.all([
        get('/api/admin/config'),
        get('/api/admin/doh')
      ])
      this.config = {
        ...configRes.data,
        doh: dohRes.data
      }
      this.loading = false
    } catch (error) {
      show.error('加载配置失败')
      this.loading = false
    }
  }
  
  render() {
    if (this.loading) {
      return '<div class="text-center py-12">加载中...</div>'
    }
    
    if (!this.config) {
      return '<div class="text-center py-12">配置加载失败</div>'
    }
    
    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900">系统配置</h1>
        </div>
        
        <form id="configForm" class="space-y-6">
          ${this.renderDetectionSection()}
          ${this.renderHistorySection()}
          ${this.renderDohSection()}
          ${this.renderRateLimitSection()}
          
          <div class="flex items-center justify-end gap-3 pt-6 border-t">
            ${Button({
              text: '恢复默认',
              variant: 'secondary',
              onclick: () => this.handleReset()
            })}
            ${Button({
              text: this.saving ? '保存中...' : '保存配置',
              variant: 'primary',
              loading: this.saving,
              onclick: () => this.handleSave()
            })}
          </div>
        </form>
      </div>
    `
  }
  
  renderDetectionSection() {
    return `
      <div class="dm-config-section bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">检测配置</h2>
        ${Input({
          type: 'number',
          id: 'refreshInterval',
          label: '检测间隔（秒）',
          value: this.config.refreshInterval || 43200,
          min: 1,
          required: true
        })}
        <p class="mt-2 text-sm text-gray-500">
          默认值：43200 秒（12 小时），最小值：1 秒
        </p>
      </div>
    `
  }
  
  renderHistorySection() {
    return `
      <div class="dm-config-section bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">历史配置</h2>
        ${Input({
          type: 'number',
          id: 'historyRetention',
          label: '保留天数（天）',
          value: this.config.historyRetention || 7,
          min: 1,
          max: 365,
          required: true
        })}
        <p class="mt-2 text-sm text-gray-500">
          默认值：7 天，范围：1-365 天
        </p>
      </div>
    `
  }
  
  renderDohSection() {
    return `
      <div class="dm-config-section bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">DoH 服务器配置</h2>
        ${Input({
          type: 'url',
          id: 'dohPrimary',
          label: 'DoH 主服务器',
          value: this.config.doh?.primary || 'https://cloudflare-dns.com/dns-query',
          placeholder: 'https://...',
          required: true
        })}
        ${Input({
          type: 'url',
          id: 'dohBackup',
          label: 'DoH 备用服务器',
          value: this.config.doh?.backup || 'https://dns.google/resolve',
          placeholder: 'https://...',
          required: true
        })}
        <div class="mt-4">
          ${Button({
            text: '测试连接',
            variant: 'secondary',
            onclick: () => this.handleTestDoh()
          })}
        </div>
      </div>
    `
  }
  
  renderRateLimitSection() {
    return `
      <div class="dm-config-section bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">限流配置（可选）</h2>
        ${Input({
          type: 'number',
          id: 'rateLimitWindow',
          label: '时间窗口（毫秒）',
          value: this.config.rateLimit?.windowMs || 60000,
          min: 1000
        })}
        ${Input({
          type: 'number',
          id: 'rateLimitMax',
          label: '最大请求数',
          value: this.config.rateLimit?.maxRequests || 10,
          min: 1
        })}
      </div>
    `
  }
  
  async handleSave() {
    this.saving = true
    
    try {
      const config = {
        refreshInterval: parseInt(document.getElementById('refreshInterval').value),
        historyRetention: parseInt(document.getElementById('historyRetention').value),
        rateLimit: {
          windowMs: parseInt(document.getElementById('rateLimitWindow').value),
          maxRequests: parseInt(document.getElementById('rateLimitMax').value)
        }
      }
      
      // 验证
      if (config.refreshInterval < 1) {
        show.error('检测间隔不能小于 1 秒')
        this.saving = false
        return
      }
      
      if (config.historyRetention < 1 || config.historyRetention > 365) {
        show.error('保留天数必须在 1-365 之间')
        this.saving = false
        return
      }
      
      // 保存配置
      await put('/api/admin/config', config)
      
      // 保存 DoH 配置
      await put('/api/admin/doh', {
        primary: document.getElementById('dohPrimary').value,
        backup: document.getElementById('dohBackup').value
      })
      
      show.success('配置保存成功')
      this.saving = false
    } catch (error) {
      show.error(error.message || '保存失败')
      this.saving = false
    }
  }
  
  async handleReset() {
    if (!confirm('确定要恢复默认配置吗？')) return
    
    // 恢复默认值
    this.config = {
      refreshInterval: 43200,
      historyRetention: 7,
      rateLimit: {
        windowMs: 60000,
        maxRequests: 10
      },
      doh: {
        primary: 'https://cloudflare-dns.com/dns-query',
        backup: 'https://dns.google/resolve'
      }
    }
    
    this.render()
    show.success('已恢复默认配置')
  }
  
  async handleTestDoh() {
    const primary = document.getElementById('dohPrimary').value
    const backup = document.getElementById('dohBackup').value
    
    try {
      show.info('正在测试 DoH 服务器连接...')
      
      const [primaryRes, backupRes] = await Promise.all([
        post('/api/admin/doh/test', { url: primary }),
        post('/api/admin/doh/test', { url: backup })
      ])
      
      const primaryStatus = primaryRes.data?.success ? '✅' : '❌'
      const backupStatus = backupRes.data?.success ? '✅' : '❌'
      
      show.success(`主服务器：${primaryStatus} 备用服务器：${backupStatus}`)
    } catch (error) {
      show.error('测试失败：' + error.message)
    }
  }
}

export default AdminConfig
```

**验收要点**:
- [ ] 配置加载正确
- [ ] 表单验证正确
- [ ] 保存配置成功
- [ ] 恢复默认功能正常
- [ ] DoH 测试功能正常

---

### 18.2 编写测试

**文件**: `frontend/tests/pages/admin-config.test.js`（新建）

```javascript
import { runSuite, assertEqual } from '../test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

export async function runAdminConfigTests() {
  // 文件存在测试
  await runSuite('Task 18 - AdminConfig Files Exist', async () => {
    assertEqual(
      existsSync(join(frontendRoot, 'src/pages/admin/AdminConfig.js')),
      true,
      'AdminConfig.js exists'
    )
  })
  
  // 组件使用测试
  await runSuite('Task 18 - AdminConfig Uses Components', async () => {
    const code = readFileSync(join(frontendRoot, 'src/pages/admin/AdminConfig.js'), 'utf-8')
    
    assertEqual(code.includes('Input'), true, 'Uses Input component')
    assertEqual(code.includes('Button'), true, 'Uses Button component')
    assertEqual(code.includes('get(\'/api/admin/config\')'), true, 'Calls GET config API')
    assertEqual(code.includes('put(\'/api/admin/config\''), true, 'Calls PUT config API')
  })
  
  // 功能测试
  await runSuite('Task 18 - AdminConfig Features', async () => {
    const code = readFileSync(join(frontendRoot, 'src/pages/admin/AdminConfig.js'), 'utf-8')
    
    assertEqual(code.includes('refreshInterval'), true, 'Has refresh interval')
    assertEqual(code.includes('historyRetention'), true, 'Has history retention')
    assertEqual(code.includes('doh'), true, 'Has DoH config')
    assertEqual(code.includes('handleTestDoh'), true, 'Has DoH test')
    assertEqual(code.includes('handleReset'), true, 'Has reset function')
    assertEqual(code.includes('parseInt'), true, 'Validates number inputs')
  })
}

// 运行测试
runAdminConfigTests()
  .then(() => console.log('[Test] AdminConfig tests completed'))
  .catch((error) => {
    console.error('[Test] AdminConfig tests failed:', error)
    process.exit(1)
  })
```

---

## 测试用例

### 手动测试（curl）

```bash
# 获取配置
curl -X GET http://localhost:8787/api/admin/config \
  -H "X-API-Token: $TOKEN" | jq

# 更新配置
curl -X PUT http://localhost:8787/api/admin/config \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refreshInterval": 86400, "historyRetention": 14}' | jq

# 获取 DoH 配置
curl -X GET http://localhost:8787/api/admin/doh \
  -H "X-API-Token: $TOKEN" | jq

# 更新 DoH 配置
curl -X PUT http://localhost:8787/api/admin/doh \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"primary": "https://cloudflare-dns.com/dns-query", "backup": "https://dns.google/resolve"}' | jq

# 测试 DoH 连接
curl -X POST http://localhost:8787/api/admin/doh/test \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://cloudflare-dns.com/dns-query"}' | jq
```

---

## 验收标准

### 功能验收

- [ ] 配置加载正确
- [ ] 检测间隔配置保存成功
- [ ] 历史保留配置保存成功
- [ ] DoH 配置保存成功
- [ ] DoH 测试功能正常
- [ ] 恢复默认配置功能正常
- [ ] 输入验证正确（数字范围、URL 格式）

### 代码质量验收

- [ ] 使用组件库（Input, Button）
- [ ] 错误处理完善
- [ ] 无 console.log 调试代码
- [ ] 通过 ESLint

### 测试验收

- [ ] 单元测试覆盖率 100%
- [ ] 所有测试通过

### UI/UX 验收

- [ ] 配置分组清晰
- [ ] 帮助文本显示正确
- [ ] Loading 状态显示
- [ ] 成功/失败提示明显

---

## 相关文件

### 新建文件
- `frontend/src/pages/admin/AdminConfig.js` - 配置页面（重构）
- `frontend/tests/pages/admin-config.test.js` - 测试文件

### 修改文件
- `frontend/tests/index.js` - 添加测试导入

### 现有文件
- `backend/src/routes/admin/config.js` - 配置 API
- `backend/src/routes/admin/doh.js` - DoH API
- `frontend/src/components/Input.js` - 输入框组件

---

## 依赖关系

### 前置依赖
- ✅ 任务 16: 管理后台主布局
- ✅ 后端任务 6: 配置管理 API
- ✅ 后端任务 7: DoH 配置 API

### 后续依赖
- 任务 19: 历史记录（使用配置页的保留天数设置）
- 任务 20: 前后端联调

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 配置格式复杂 | 前端解析困难 | 后端返回扁平化结构 |
| DoH 测试超时 | 前端等待时间长 | 设置超时，异步显示结果 |
| 配置冲突 | 用户设置不合理值 | 前端验证 + 后端兜底 |

---

## 下一步

1. 加载配置数据
2. 实现检测配置表单
3. 实现历史配置表单
4. 实现 DoH 配置表单
5. 实现限流配置表单（可选）
6. 实现保存功能
7. 实现恢复默认功能
8. 实现 DoH 测试功能
9. 编写测试

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-06-04 | 1.0 | 初始版本 | AI Assistant |
