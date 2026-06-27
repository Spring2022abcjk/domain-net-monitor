# 子任务 28：公开域名详情页

**状态**: 🟢 已完成
**优先级**: 中
**预计工时**: 3-4 小时
**创建日期**: 2026-06-26
**更新日期**: 2026-06-26

---

## 任务目标

实现公开域名详情页，用户在 PublicDashboard 点击域名卡片后跳转到详情页，展示完整检测结果与近期趋势。

### 核心需求

1. **域名详情展示**: 显示域名名称、当前状态、统计卡片（总检测次数、成功率、状态）
2. **最新记录表格**: 展示最近 10 条检测记录的 timestamp 和 status
3. **返回导航**: 从详情页可返回公开 Dashboard
4. **与现有架构一致**: 遵循 Class-based 生命周期 + addEventListener 模式

---

## 现状分析

| 资产 | 状态 | 说明 |
|------|------|------|
| `GET /api/public/stats/:domain` | ✅ 已上线 | 返回 `{ domain, status, firstSeen, lastChecked, totalChecks, successCount, failureCount, successRate, latestResults: [...] }` |
| PublicDashboard 点击链路 | ✅ 已上线 | `DomainCard` 按钮有 `data-domain` 属性，事件委托已绑定，`handleViewDetail(domain)` 内部是 TODO 占位 |
| 路由系统 | ✅ 动态参数已支持 | `matchRoute` 支持 `:domain` 参数和 `decodeURIComponent` |
| 前端组件库 | ✅ 可复用 | Card / Button / Table 已就绪 |

当前唯一的缺口是 `handleViewDetail(domain)` 只弹提示 "域名详情页开发中" + `console.debug`。

---

## 实现步骤

### 28.1 新增域名详情路由

**文件**: `frontend/src/router/routes.js`（修改）

在 `{ name: 'public', path: '/' }` 之后新增：

```javascript
{
  name: 'domain-detail',
  path: '/domain/:domain',
  component: () => import('../pages/DomainDetail.js'),
  meta: { requiresAuth: false, title: '域名详情' }
}
```

路由 `renderRoute` 已支持 `params` 传递（从 `matchRoute` 解析），`DomainDetail.init(params)` 会收到 `{ domain: 'example.com' }`。

**验收要点**:
- [ ] 访问 `#/domain/example.com` 时路由匹配到 domain-detail
- [ ] `params.domain` 正确传递给 page.init()

---

### 28.2 实现 DomainDetail 页面组件

**文件**: `frontend/src/pages/DomainDetail.js`（新建）

**页面布局**:

```
┌──────────────────────────────────────────┐
│  ← 返回公开页面    域名详情              │  导航栏
├──────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 总检测   │ │ 成功率   │ │ 当前状态 │ │  统计卡片
│  │ 150 次   │ │ 96.7%   │ │ 运行中🟢 │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│                                          │
│  首次检测: 2026-01-15 10:30             │  元信息
│  最近检测: 2026-06-26 08:00             │
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ 检测时间         │ 状态            ││  最新记录表
│  │ 2026-06-26 08:00 │ 正常            ││  (latestResults)
│  │ 2026-06-25 20:00 │ 正常            ││
│  └──────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

**核心代码结构**:

```javascript
import { get } from '../utils/api.js'
import { Card } from '../components/Card.js'
import { Table } from '../components/Table.js'
import { formatDate } from '../utils/index.js'

export class DomainDetail {
  constructor() {
    this.domain = null
    this.stats = null
    this.loading = true
    this.error = null
    this.__backHandler = () => { window.location.hash = '#/' }
  }

  async init(params) {
    this.domain = decodeURIComponent(params.domain)
    document.title = `${this.domain} - 域名详情`
    await this.loadStats()
  }

  async loadStats() {
    this.loading = true
    try {
      const res = await get(`/api/public/stats/${encodeURIComponent(this.domain)}`)
      this.stats = res.data
      this.loading = false
    } catch (e) {
      this.error = '加载域名数据失败，请返回重试'
      this.loading = false
    }
  }

  render() {
    if (this.loading) return '<div class="...">加载中...</div>'
    if (this.error) return `<div class="...">${this.error}</div>`
    // 导航栏 + 统计卡片 + 元信息 + 最新记录表格
  }

  bindEvents() {
    const btn = document.getElementById('domain-detail-back-btn')
    btn?.removeEventListener('click', this.__backHandler)
    btn?.addEventListener('click', this.__backHandler)
  }

  destroy() {
    document.getElementById('domain-detail-back-btn')
      ?.removeEventListener('click', this.__backHandler)
  }
}
```

**设计要点**:
- handler 引用保存在 `this.__backHandler`，remove-before-add 模式
- 数据来源: `GET /api/public/stats/:domain` → `res.data`
- 状态颜色映射: `active` → 绿色 `bg-green-100 text-green-800`，`stopped` → 红色
- latestResults 作为 Table 的 data 源，每行显示 timestamp + status
- 表格空数据时显示 "暂无检测记录"

**验收要点**:
- [ ] 页面展示域名名称和状态标签
- [ ] 3 张统计卡片（totalChecks / successRate / status）
- [ ] 元信息行（firstSeen / lastChecked）
- [ ] latestResults 表格渲染
- [ ] 返回按钮可用
- [ ] 加载中和错误状态有恰当 UI
- [ ] constructor/init/render/bindEvents/destroy 生命周期完整

---

### 28.3 修改 PublicDashboard 跳转逻辑

**文件**: `frontend/src/pages/PublicDashboard.js`（修改）

```diff
  handleViewDetail(domain) {
-     // TODO: 跳转到域名详情页（任务 16）
-     show.info('域名详情页开发中，敬请期待')
-     console.debug('Viewing domain:', domain)
+     window.location.hash = '#/domain/' + encodeURIComponent(domain)
  }
```

不改变事件绑定或 handler 引用，仅替换方法体。

**验收要点**:
- [ ] 点击 DomainCard "状态详情" 按钮跳转到 `#/domain/xxx`
- [ ] 点击后浏览器 URL hash 正确更新
- [ ] 特殊字符域名被 encodeURIComponent 编码

---

### 28.4 路由 utils 动态参数兼容性验证

**文件**: `frontend/src/router/utils.js`（确认，无需修改；如不兼容则修复）

当前 `matchRoute` 通过 `split('/')` 分段匹配。对于 `/domain/:domain`，需要确认 `example.com` 作为单个路径段能否被正确捕获。

**验证项**:
- [ ] `matchRoute('/domain/example.com', '/domain/:domain')` → `{ domain: 'example.com' }`
- [ ] `matchRoute('/domain/sub.example.com', '/domain/:domain')` → `{ domain: 'sub.example.com' }`
- [ ] `matchRoute('/domain/测试.cn', '/domain/:domain')` → `{ domain: '测试.cn' }` (IDN)

如果不兼容（split 按点号拆分段），需要改用通配符捕获或调整路由 pattern 为正则。

---

## API 端点（全部复用，无新增）

| 方法 | 路径 | 说明 | 鉴权 | 限流 |
|------|------|------|------|------|
| GET | `/api/public/stats/:domain` | 获取单域名统计 + 最新记录 | ❌ | ❌ |

---

## 测试用例

### 单元测试

**新文件**: `frontend/tests/pages/domain-detail.test.js`

| # | 测试内容 | 类型 |
|---|---------|------|
| 1 | DomainDetail.js 文件存在 | 文件检查 |
| 2 | 导出 DomainDetail 类 | 代码检查 |
| 3 | 包含 init / render / bindEvents / destroy 方法 | 代码检查 |
| 4 | handler 存储在 this.__backHandler | 代码检查 |
| 5 | bindEvents 使用 remove-before-add 模式 | 代码检查 |
| 6 | destroy 中 removeEventListener | 代码检查 |
| 7 | render 中包含域名和 successRate 字段 | 代码检查 |
| 8 | 无 onclick="window.__*" 模式 | 代码检查 |

**修改文件**: `frontend/tests/pages/public-dashboard.test.js`

更新 `handleViewDetail` 相关检查：从 TODO 注释 → `window.location.hash` 跳转。

**修改文件**: `frontend/tests/index.js`

注册 `runDomainDetailTests`。

---

## 验收标准

### 功能验收

- [ ] PublicDashboard 点击域名卡片 → 跳转到 `#/domain/:domain`
- [ ] 详情页展示: 域名 + 状态 + 统计卡片 + 最新记录表格 + 返回按钮
- [ ] 返回按钮跳回 `#/`
- [ ] 加载中/错误状态有 UI
- [ ] 特殊字符域名路由参数正确传递

### 代码质量验收

- [ ] 页面组件完整生命周期: constructor → init → render → bindEvents → destroy
- [ ] 无 `onclick="window.__*"` 或 `window.__*` 全局变量
- [ ] handler 引用存储在 instance property 上，remove-before-add 模式
- [ ] destroy 中 removeEventListener

### 测试验收

- [ ] 新增 `domain-detail.test.js` 8 项测试全部通过
- [ ] 已有测试套件无回归（`npm test` 通过）

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 域名含特殊字符（`@`, `/`, 中文）导致路由解析错误 | 页面 404 或参数截断 | `encodeURIComponent` 编码 + 路由 utils 验证，必要时改用 query string 传参 |
| `latestResults` 字段名在后端与前端不一致 | 表格无数据 | 先 curl 验证 API 实际返回字段名，前端兼容映射 |
| PublicDashboard 测试依赖 handleViewDetail 内部逻辑 | 测试失败 | 同步更新测试中对该方法的检查 |

---

## 相关文件

### 新建文件
- `frontend/src/pages/DomainDetail.js` — 域名详情页组件
- `frontend/tests/pages/domain-detail.test.js` — 域名详情页测试

### 修改文件
- `frontend/src/router/routes.js` — 新增 `/domain/:domain` 路由
- `frontend/src/pages/PublicDashboard.js` — handleViewDetail 改为 hash 跳转
- `frontend/tests/pages/public-dashboard.test.js` — 更新检查项
- `frontend/tests/index.js` — 注册新测试

### 复用文件
- `frontend/src/components/Card.js` — 统计卡片
- `frontend/src/components/Table.js` — 最新记录表格
- `frontend/src/components/Button.js` — 返回按钮
- `frontend/src/utils/api.js` — API 请求封装
- `frontend/src/utils/index.js` — formatDate 等工具函数

---

## 下一步

1. ~~执行 28.1-28.5 子步骤~~ ✅ 已完成
2. ~~运行 `npm test` 全量验证~~ ✅ 全部通过
3. 构建并部署到 Pages 预览

---

## 完成记录

| 步骤 | 状态 | 备注 |
|------|------|------|
| 28.1 路由注册 | ✅ | routes.js 新增 `/domain/:domain` |
| 28.2 DomainDetail 页面 | ✅ | 新建 184 行，完整生命周期 |
| 28.3 PublicDashboard 跳转 | ✅ | handleViewDetail → hash 跳转 |
| 28.4 路由参数兼容 | ✅ | matchRoute 兼容域名中点号/中文 |
| 28.5 测试覆盖 | ✅ | 5 suites，22 项检查全部通过 |
