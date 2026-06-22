# 子任务 26：前端组件 inline event handler 架构重构

**状态**: 🟢 已完成
**优先级**: P1 (中高)
**预计工时**: 6-8 小时
**创建日期**: 2026-06-22
**完成日期**: 2026-06-22
**前置依赖**: 子任务 15/16/17/18/19（前端页面组件已就绪）

---

## 任务目标

将 5 个使用 `inline event handler` + `window` 全局变量桥接事件的组件重构为标准模式：**组件只渲染纯净 HTML，页面组件在 bindEvents() 中 addEventListener 绑定**。

## 现状分析

分析揭示 5 个组件中存在 **4 个实际功能缺陷**（window 变量从未被赋值），不只是一个代码风格问题：

| 组件 | window 变量 | 赋值状态 | 实际影响 |
|------|------------|---------|---------|
| Topbar | `__sidebarToggleHandler` | **未赋值** | **移动端汉堡菜单按钮失效** |
| Modal | `__modalCloseHandler` | **未赋值** | **弹窗 X 关闭按钮失效** |
| Table | `__currentTableConfig` | **未赋值** | 行点击是死代码（无调用方传 onRowClick） |
| Input | `__input_*_*` (动态) | **未赋值** | 10 处调用全未传 handler，死代码 |
| Sidebar | `__sidebarCloseHandler` | AdminLayout 赋值 | 功能正常，但走 window 而非 props |
| Topbar | `__topbarOnLogout` | AdminLayout 赋值 | 功能正常，但走 window 而非 props |

> **发现**：AdminLayout 已经通过 props 传了 `onMenuClick`/`onLogout`/`onClose`，但 Topbar/Sidebar 内部完全忽略这些 props，直接读 window 全局变量。这造成了两套并行的事件传递机制。

---

## 子步骤

### 26.1 Table 组件 — 移除死代码

**当前状态**: `onclick="window.__tableRowClickHandler(...)"` 依赖的 `__currentTableConfig` 从未赋值。3 个调用方（AdminDomains/AdminHistory/AdminDashboard）均未传入 `onRowClick`。行点击功能从未被使用。

**目标**: 移除死代码，Table 只渲染纯净 HTML。

**影响范围**:
- `frontend/src/components/Table.js` — 移除 inline onclick + `__tableRowClickHandler` + `__currentTableConfig` 逻辑
- 调用方无修改（从未使用该功能）

**验收标准**:
- [ ] Table 渲染不在 `<tr>` 上生成 onclick 属性
- [ ] 移除 `window.__tableRowClickHandler` 和 `window.__currentTableConfig` 相关代码
- [ ] 构建通过，AdminDomains/AdminHistory/AdminDashboard 表格正常显示

---

### 26.2 Modal 组件 — 修复 X 关闭按钮

**当前状态**: Modal X 关闭按钮 `onclick="window.__modalCloseHandler()"` 依赖的 window 变量从未被赋值，**X 按钮点击无效**。AdminDomains 通过独立的取消按钮 `addEventListener` 关闭弹窗，绕过了此问题。

**目标**: Modal 接收 `onClose` prop，点击 X 时触发，AdminDomains 在 bindEvents 中绑定。

**迁移方案**:
1. Modal 添加 `id` prop，在关闭按钮上标记 `data-modal-close="<id>"`
2. AdminDomains.bindEvents() 中 `querySelector('[data-modal-close]').addEventListener('click', handler)`
3. 移除 Modal 中的 `window.__modalCloseHandler` 逻辑

**影响范围**:
- `frontend/src/components/Modal.js` — 渲染 data 属性，移除 inline onclick
- `frontend/src/pages/admin/AdminDomains.js` — bindEvents 中绑定 X 按钮事件

**验收标准**:
- [ ] Modal X 按钮可正常关闭弹窗
- [ ] 与取消按钮行为一致
- [ ] 无 window 全局变量残留

---

### 26.3 Sidebar 组件 — window 迁移到 props

**当前状态**: Sidebar 的关闭按钮走 `window.__sidebarCloseHandler`（AdminLayout 赋值），功能正常。但 AdminLayout 已通过 `onClose` prop 传递回调，Sidebar 内部完全忽略。

**目标**: Sidebar 使用 `onClose` prop 而非 window 全局变量。

**迁移方案**:
1. Sidebar 渲染时，在关闭按钮上加 `id="sidebar-close-btn"`
2. AdminLayout.bindEvents() 中 `getElementById('sidebar-close-btn').addEventListener('click', this.toggleSidebar)`
3. 移除 `window.__sidebarCloseHandler` 赋值和清理
4. 遮罩层 `onclick="window.__sidebarCloseHandler()"` 也改为 `id` + addEventListener

**影响范围**:
- `frontend/src/components/admin/Sidebar.js` — 移除 inline onclick，保留 `id`
- `frontend/src/pages/admin/AdminLayout.js` — bindEvents 绑定，移除 window 赋值

**验收标准**:
- [ ] 移动端侧边栏 X 按钮可正常关闭
- [ ] 遮罩层点击可正常关闭
- [ ] `window.__sidebarCloseHandler` 无残留

---

### 26.4 Topbar 组件 — 修复汉堡菜单 + 迁移 logout

**当前状态 — 两个独立问题**:

| 问题 | window 变量 | 状态 |
|------|------------|------|
| 汉堡菜单按钮 | `__sidebarToggleHandler` | **未赋值，完全失效 (P0)** |
| 退出登录按钮 | `__topbarOnLogout` | AdminLayout 赋值，功能正常 |

AdminLayout 已通过 `onMenuClick` / `onLogout` props 传递回调，Topbar 完全忽略。

**目标**: Topbar 使用 props 中的回调而非 window 全局变量。

**迁移方案**:
1. Topbar 渲染时在汉堡按钮上加 `id="topbar-menu-btn"`，退出按钮加 `id="topbar-logout-btn"`
2. AdminLayout.bindEvents() 中绑定两个按钮事件
3. 移除 `window.__sidebarToggleHandler` 和 `window.__topbarOnLogout`

**影响范围**:
- `frontend/src/components/admin/Topbar.js` — 移除 inline onclick，保留 `id`
- `frontend/src/pages/admin/AdminLayout.js` — bindEvents 绑定，移除 window 赋值

**验收标准**:
- [ ] 移动端汉堡菜单按钮可正常展开侧边栏
- [ ] 退出登录按钮功能正常
- [ ] `window.__sidebarToggleHandler` / `__topbarOnLogout` 无残留

---

### 26.5 Input 组件 — 移除死代码

**当前状态**: Input 设计了基于 `window.__input_${id}_${eventName}` 的事件委托系统，支持 onInput/onChange/onFocus/onBlur/onKeydown。但 **全部 10 处调用方均未传入任何 event handler**，所有页面都通过 `document.getElementById(id).addEventListener(...)` 自行绑定。

**目标**: 移除 Input 中的 inline handler 生成逻辑，保持纯 HTML 渲染。

**变更**:
- 移除 `onInput`/`onChange`/`onFocus`/`onBlur`/`onKeydown` 参数解析
- 移除 `window[handlerName]` 赋值
- 移除 `eventHandlers` 数组拼接
- 移除 input 标签上的 `${eventHandlers}` 注入

**影响范围**:
- `frontend/src/components/Input.js` — 仅删代码
- 调用方无修改（AdminHistory/AdminConfig/Login，10 处调用均不受影响）

**验收标准**:
- [ ] Input 渲染纯净 HTML（无 onclick/oninput 等 inline 属性生成代码）
- [ ] 构建通过
- [ ] AdminConfig 表单字段仍正常（通过现有 addEventListener 绑定）
- [ ] Login 表单字段正常

---

## 执行顺序

```
26.5 Input    (纯删代码，无调用方修改，零风险)
  ↓
26.1 Table    (纯删代码，无调用方修改，零风险)
  ↓
26.3 Sidebar  (需改 AdminLayout，但功能原本正常，风险低)
  ↓
26.4 Topbar   (修复 P0 汉堡菜单 + 迁移 logout，涉及 AdminLayout)
  ↓
26.2 Modal    (修复 P1 X 按钮 + AdminDomains 改动，依赖 AdminDomains 生命周期)
```

> Sidebar 和 Topbar 都修改 AdminLayout.bindEvents()，可以合并为一次 commit。

## 重复模式识别

重构后形成统一模式，可提取到 MEMORY.md：

1. 组件渲染纯 HTML + `id`/`data-*` 属性
2. 页面组件 `render()` 后调用 `bindEvents()`，其中 `getElementById` / `querySelectorAll` + `addEventListener`
3. 页面组件 `destroy()` 中清理事件监听器（如有需要）

---

## 风险

| 风险 | 缓解 |
|------|------|
| AdminLayout 同时修改 Sidebar + Topbar 绑定，可能引入回归 | 逐个组件改，每步构建验证 |
| Modal X 按钮修复后与其他弹窗行为不一致 | 当前仅 AdminDomains 使用 Modal，无影响 |
| Input 死代码移除后影响未知调用方 | 已 grep 确认全部 10 处调用方无一传 handler |

## 对现有文档的变更

修改文件清单：
- `frontend/src/components/Table.js`
- `frontend/src/components/Modal.js`
- `frontend/src/components/Input.js`
- `frontend/src/components/admin/Sidebar.js`
- `frontend/src/components/admin/Topbar.js`
- `frontend/src/pages/admin/AdminLayout.js`
- `frontend/src/pages/admin/AdminDomains.js`

## 执行结果

**所有验收标准已通过**, 构建成功, 后端 535/536（1 个预存网络波动失败）。

### 改动摘要

| 子步骤 | 文件 | 行数变化 |
|--------|------|---------|
| 26.5 Input | `Input.js` | 94→64 行 (-30) |
| 26.1 Table | `Table.js` | 88→72 行 (-16) |
| 26.3 Sidebar | `Sidebar.js` | 移除 inline onclick + onClose prop |
| 26.4 Topbar | `Topbar.js` | 移除 inline onclick + onMenuClick/onLogout prop |
| 26.3+26.4 | `AdminLayout.js` | bindEvents 用 addEventListener 替代 window 赋值 |
| 26.2 Modal | `Modal.js` | X 按钮用 id 替代 inline onclick |
| 26.2 | `AdminDomains.js` | bindEvents 中绑定 modal-close-btn |

### 清扫确认

- `window.__*` 全局变量在 `frontend/src/components/` 下 **零残留**
- 页面内部自用变量（`__deleteDomainHandler`, `__dashboardRefreshHandler`）不属于本次共享组件重构范围，留待后续处理
