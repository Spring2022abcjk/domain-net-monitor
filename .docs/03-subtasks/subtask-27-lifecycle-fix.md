# 子任务 27：页面组件生命周期完整性修复

**状态**: 🟡 待开始
**优先级**: P1 (中高)
**预计工时**: 4-5 小时
**创建日期**: 2026-06-22
**前置依赖**: 子任务 26（inline handler 架构重构）✅

---

## 任务目标

修复 6 个页面组件的生命周期缺陷：destroy() 内存泄漏、事件监听器累积、配置缓存缺失。

## 问题分布

| 问题 | 影响组件 | 严重度 | 描述 |
|------|---------|--------|------|
| #1 destroy() 空实现 | AdminConfig | 高 | 3 个匿名事件监听器无法移除 |
| #2 destroy() 不完整 | PublicDashboard | 高 | removeEventListener 用了新匿名函数 + debounce setTimeout 未清除 |
| #2 destroy() 不完整 | LoginPage | 中 | 登录成功 800ms setTimeout 未在 destroy 中清除 |
| #5 重复 bindEvents | AdminConfig (12 次) | 高 | handleSave/handleReset/handleTestDoh 每次重渲染都叠加监听器 |
| #5 重复 bindEvents | AdminLayout (3 次) | 中 | toggleSidebar/closeSidebar 叠加监听器 |
| #5 重复 bindEvents | AdminDomains (4 次) | 中 | 开关/删除/全选后重渲染叠加 |
| #5 重复 bindEvents | AdminHistory (3 次) | 低 | 查询/清理后重渲染, 已有引用存储 |
| #5 重复 bindEvents | AdminStats (2 次) | 低 | 已有引用存储 + destroy 正确 |
| #4 render 过长 | AdminConfig | 低 | 44 行已拆分, 可进一步提取按钮条 |
| #6 配置缓存 | AdminConfig | 低 | 每次进页面都发 2 个 HTTP 请求, 无可置 |

---

## 子步骤

### 27.1 AdminConfig destroy() 修复 + bindEvents 去重

**当前问题**:
- `destroy()` 完全空实现（第 389 行）
- `bindEvents()` 3 个监听器全是匿名函数，无法 removeEventListener（第 219-231 行）
- `handleSave()` 7 个分支 / `handleReset()` / `handleTestDoh()` 3 个分支 → bindEvents 被调用 12 次

**根因**: 每次 `handleXxx()` 成功后执行 `this.bindEvents()` → 累加监听器。

**修复方案**:

1. 将匿名函数提升为实例方法引用：
```javascript
// constructor 中
this.__saveHandler = () => this.handleSave()
this.__resetHandler = () => this.handleReset()
this.__testDohHandler = () => this.handleTestDoh()
```

2. bindEvents 先清理再绑定：
```javascript
bindEvents() {
    const saveBtn = document.getElementById('saveConfigBtn')
    const resetBtn = document.getElementById('resetConfigBtn')
    const testDohBtn = document.getElementById('testDohBtn')
    
    // 先移除旧监听器（防止叠加）
    saveBtn?.removeEventListener('click', this.__saveHandler)
    resetBtn?.removeEventListener('click', this.__resetHandler)
    testDohBtn?.removeEventListener('click', this.__testDohHandler)
    
    // 再绑定
    saveBtn?.addEventListener('click', this.__saveHandler)
    resetBtn?.addEventListener('click', this.__resetHandler)
    testDohBtn?.addEventListener('click', this.__testDohHandler)
}
```

3. destroy 移除监听器：
```javascript
destroy() {
    document.getElementById('saveConfigBtn')?.removeEventListener('click', this.__saveHandler)
    document.getElementById('resetConfigBtn')?.removeEventListener('click', this.__resetHandler)
    document.getElementById('testDohBtn')?.removeEventListener('click', this.__testDohHandler)
}
```

**影响范围**: 仅 AdminConfig.js

**验收标准**:
- [ ] destroy() 正确移除 3 个事件监听器
- [ ] handleSave/handleReset/handleTestDoh 多次调用不累积监听器
- [ ] 页面离开后无内存泄漏

---

### 27.2 PublicDashboard destroy() 修复

**当前问题**:
- `removeEventListener` 传入新匿名函数，**永远不会成功移除**（第 199/202 行）
- `this.debouncedSearch` 内部 `setTimeout` 未清除
- `searchInput` 的 input 事件从未写入清理代码

**修复方案**:

1. 存储 handler 引用：
```javascript
// constructor 中
this.__searchClickHandler = () => this.debouncedSearch()
this.__searchKeyHandler = (e) => { if (e.key === 'Enter') this.debouncedSearch() }
this.__searchInputHandler = (e) => { this.query = e.target.value; this.debouncedSearch() }
```

2. bindEvents 先清理再绑定（同 AdminConfig 模式）

3. destroy 正确移除：
```javascript
destroy() {
    document.getElementById('btn-search')?.removeEventListener('click', this.__searchClickHandler)
    document.getElementById('domain-search')?.removeEventListener('keydown', this.__searchKeyHandler)
    document.getElementById('domain-search')?.removeEventListener('input', this.__searchInputHandler)
    // 清除 pending debounce 定时器
    if (this.debouncedSearch?.cancel) {
        this.debouncedSearch.cancel()
    }
}
```

4. debounce 工具函数增强（`utils/index.js`）：
   - 返回的函数添加 `.cancel()` 方法，用于清除内部 timer

**影响范围**: PublicDashboard.js + utils/index.js

**验收标准**:
- [ ] destroy 后搜索按钮 click 不再触发
- [ ] debounce 内部 setTimeout 被清除
- [ ] 3 个 input/keydown/click 监听器完全移除

---

### 27.3 LoginPage destroy() 修复

**当前问题**: 登录成功后 `setTimeout(() => { window.location.hash = '/admin/dashboard' }, 800)` 未存储 timer ID。

**修复方案**:

```javascript
// handleSubmit 中
this._redirectTimer = setTimeout(() => {
    window.location.hash = '/admin/dashboard'
}, 800)

// destroy 中
destroy() {
    if (this._redirectTimer) {
        clearTimeout(this._redirectTimer)
        this._redirectTimer = null
    }
}
```

**影响范围**: 仅 Login.js

**验收标准**:
- [ ] 登录成功后在 800ms 内离开页面，不再触发路由跳转

---

### 27.4 AdminLayout bindEvents 去重

**当前问题**: `closeSidebar()` / `toggleSidebar()` 每次都调用 `this.bindEvents()` 叠加监听器。

**修复方案**: 与 AdminConfig 相同模式——存储引用 + 先 remove 再 add。

```javascript
constructor() {
    this.__sidebarCloseHandler = () => this.closeSidebar()
    this.__sidebarToggleHandler = () => this.toggleSidebar()
    this.__topbarLogoutHandler = () => this.handleLogout()
    this.__overlayCloseHandler = () => this.closeSidebar()
}

bindEvents() {
    document.getElementById('topbar-menu-btn')?.removeEventListener('click', this.__sidebarToggleHandler)
    document.getElementById('topbar-menu-btn')?.addEventListener('click', this.__sidebarToggleHandler)
    // ... 其余 3 个同理
}
```

**影响范围**: 仅 AdminLayout.js

**验收标准**:
- [ ] toggle/close 多次调用不累积监听器
- [ ] 汉堡菜单/退出/X 按钮/遮罩功能正常

---

### 27.5 AdminDomains bindEvents 去重

**当前问题**: 全选/删除/开关切换后重渲染叠加监听器（4 处）。

**修复方案**: 存储 handler 引用 + 先 remove 再 add（同 27.1 模式）。

需存储引用的 handler：
- `selectAll` change
- 每个域名 checkbox change（动态生成，需改用事件委托）
- 每个 Toggle change（已在 bindEvents 中 forEach 绑定）
- cancelAddBtn / confirmAddBtn / batchDeleteBtn / addDomainBtn / modal-close-btn
- deleteDomainHandler（window 全局变量，可改为实例方法）

**注意**: 域名复选框使用事件委托方案，在 `dm-table` 容器上绑定单次事件，避免 forEach 绑定：
```javascript
const container = document.getElementById('admin-content')
container?.addEventListener('click', (e) => {
    if (e.target.matches('.dm-domain-checkbox')) {
        // 处理选中逻辑
    }
})
```

**影响范围**: 仅 AdminDomains.js

**验收标准**:
- [ ] 全选/删除/开关/弹窗操作不累积监听器
- [ ] destroy 正确移除所有监听器

---

### 27.6 AdminHistory bindEvents 去重

**当前问题**: 已有 `this.__queryHandler` 引用存储，但 bindEvents 3 处调用仍叠加。

**修复方案**: 在 bindEvents 开头先 remove 已有的监听器。

**影响范围**: 仅 AdminHistory.js（改动最小，参考现有 __queryHandler 模式补全其他引用）

**验收标准**:
- [ ] 查询/清理后重渲染不累积监听器

---

### 27.7 低优先级优化

#### render 按钮条提取

仅 AdminConfig.render() 第 78-93 行提取为 `renderActionButtons()`（~15 行）

#### 配置缓存

利用 `this.config` 实例属性实现内存缓存：
```javascript
async loadConfig() {
    if (this.config && !this._configDirty) {
        // 配置已缓存且未被修改，跳过请求
        return
    }
    // ... 现有加载逻辑
}
// handleSave 成功后设置 this._configDirty = false
// 离开页面时缓存随实例销毁
```

---

## 执行顺序

```
27.3 LoginPage    (单行改动, 零风险)
  ↓
27.1 AdminConfig  (核心: destroy + bindEvents 去重)
  ↓
27.2 PublicDashboard (需 debounce 工具函数增强)
  ↓
27.4 AdminLayout  (独立模块)
  ↓
27.5 AdminDomains (最复杂, 含事件委托改造)
  ↓
27.6 AdminHistory  (最小改动, 参考已有模式)
  ↓
27.7 低优先级     (可选: 按钮条提取 + 配置缓存)
```

---

## 影响文件

| 文件 | 改动类型 |
|------|---------|
| `frontend/src/pages/admin/AdminConfig.js` | destroy 实现 + 引用存储 + bindEvents 去重 |
| `frontend/src/pages/PublicDashboard.js` | destroy 修复 + debounce 清理 |
| `frontend/src/pages/Login.js` | setTimeout ID 存储 + destroy 清理 |
| `frontend/src/utils/index.js` | debounce 增加 .cancel() 方法 |
| `frontend/src/pages/admin/AdminLayout.js` | handler 引用去重 |
| `frontend/src/pages/admin/AdminDomains.js` | 事件委托改造 + bindEvents 去重 |
| `frontend/src/pages/admin/AdminHistory.js` | bindEvents 去重 |

## 后续

- AdminDashboard 的 `window.__dashboardRefreshHandler` 不在共享组件范围，但可一起改为实例方法引用
