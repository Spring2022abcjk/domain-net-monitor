# 前端内部函数参数文档

**注意**: 本文档仅供开发参考，不提交到仓库。

本文档记录前端所有核心模块的函数参数、返回值和类型定义。

---

## 📚 目录

1. [工具函数 (utils)](#工具函数-utils)
2. [API 模块](#api-模块)
3. [存储模块](#存储模块)
4. [组件 (components)](#组件-components)
5. [页面 (pages)](#页面-pages)
6. [路由 (router)](#路由-router)

---

## 工具函数 (utils)

### index.js - 工具函数集合

#### debounce(fn, delay)

防抖函数

**参数**:
- `fn` (Function) - 要防抖的函数
- `delay` (number) - 延迟时间（毫秒）

**返回**: `(Function)` - 防抖处理后的函数

```javascript
function debounce(fn, delay) {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}
```

---

#### formatTimestamp(timestamp)

格式化时间戳

**参数**:
- `timestamp` (number|string) - 时间戳（毫秒）或 ISO 字符串

**返回**: `(string)` - 格式化后的时间字符串（YYYY-MM-DD HH:mm:ss）

---

#### getDomainStatusText(status)

获取域名状态文本

**参数**:
- `status` (string) - 状态值 (`'full'`, `'partial'`, `'no'`, `'error'`)

**返回**: `(string)` - 人类可读的状态文本

| 输入 | 返回 |
|------|------|
| `'full'` | `'完全支持'` |
| `'partial'` | `'部分支持'` |
| `'no'` | `'不支持'` |
| `'error'` | `'检测失败'` |

---

#### getDomainStatusColor(status)

获取域名状态颜色

**参数**:
- `status` (string) - 状态值

**返回**: `(string)` - Tailwind CSS 颜色类名

| 输入 | 返回 |
|------|------|
| `'full'` | `'bg-green-100 text-green-800'` |
| `'partial'` | `'bg-yellow-100 text-yellow-800'` |
| `'no'` | `'bg-red-100 text-red-800'` |
| `'error'` | `'bg-gray-100 text-gray-800'` |

---

#### calculateDaysAgo(timestamp)

计算时间差（天数）

**参数**:
- `timestamp` (number) - 时间戳（毫秒）

**返回**: `(string)` - 相对时间描述

**示例**:
```javascript
calculateDaysAgo(Date.now() - 86400000)  // "1 天前"
calculateDaysAgo(Date.now() - 172800000) // "2 天前"
```

---

#### parseTimestamp(timestamp)

解析时间戳为日期对象

**参数**:
- `timestamp` (number|string) - 时间戳

**返回**: `(Date)` - 日期对象

---

## API 模块

### api.js

#### APIError 类

**继承**: `Error`

**构造函数参数**:
- `message` (string) - 错误消息
- `status` (number) - HTTP 状态码
- `code` (string) - 错误代码
- `data` (Object|null) - 错误详情

**属性**:
- `.name` (string) - 固定为 `'APIError'`
- `.status` (number) - HTTP 状态码
- `.code` (string) - 错误代码
- `.data` (Object|null) - 错误详情

---

#### getApiBaseUrl()

**参数**: 无

**返回**: `(string)` - 当前 API 基础 URL

---

#### setApiBaseUrl(url)

**参数**:
- `url` (string) - API 基础 URL

**返回**: 无

---

#### getToken()

**参数**: 无

**返回**: `(string|null)` - 存储的 Token，不存在返回 null

---

#### setToken(token)

**参数**:
- `token` (string) - Token 值

**返回**: 无

**副作用**: 将 Token 写入 localStorage

---

#### clearToken()

**参数**: 无

**返回**: 无

**副作用**: 从 localStorage 清除 Token

---

#### request(url, options)

底层请求封装

**参数**:
- `url` (string) - 请求 URL（可以是相对路径或完整 URL）
- `options` (Object) - 请求选项
  - `method` (string) - HTTP 方法（GET, POST, PUT, DELETE）
  - `headers` (Object) - 请求头
  - `body` (string) - 请求体（JSON 字符串）
  - `apiToken` (string) - 可选的 API Token（用于登录等场景）

**返回**: `(Promise<Object>)` - 响应数据对象

**响应格式**:
```javascript
{
  code: number,
  data: any,
  msg: string
}
```

**异常**: `APIError` - API 错误

---

#### get(url, params)

GET 请求

**参数**:
- `url` (string) - 请求 URL
- `params` (Object|null) - 查询参数对象

**返回**: `(Promise<Object>)` - 响应数据

**示例**:
```javascript
const domains = await get('/api/domains', { page: 1, size: 20 })
```

---

#### post(url, body, options)

POST 请求

**参数**:
- `url` (string) - 请求 URL
- `body` (Object) - 请求体对象（会自动 JSON.stringify）
- `options` (Object) - 可选参数
  - `apiToken` (string) - API Token（用于登录）

**返回**: `(Promise<Object>)` - 响应数据

---

#### put(url, body)

PUT 请求

**参数**:
- `url` (string) - 请求 URL
- `body` (Object) - 请求体对象

**返回**: `(Promise<Object>)` - 响应数据

---

#### del(url)

DELETE 请求

**参数**:
- `url` (string) - 请求 URL

**返回**: `(Promise<Object>)` - 响应数据

---

#### setRequestTimeout(ms)

设置请求超时

**参数**:
- `ms` (number) - 超时毫秒数

**返回**: 无

---

## 存储模块

### storage.js

#### isLoggedIn()

检查是否已登录

**参数**: 无

**返回**: `(boolean)` - 是否已登录

---

#### getApiEndpoint()

获取用户配置的 API 端点

**参数**: 无

**返回**: `(string|null)` - API 端点 URL 或 null

---

#### setApiEndpoint(url)

设置用户配置的 API 端点

**参数**:
- `url` (string) - API 端点 URL

**返回**: 无

---

#### clearApiEndpoint()

清除用户配置的 API 端点

**参数**: 无

**返回**: 无

---

## 组件 (components)

### Input.js

#### Input(options)

输入框组件

**参数**:
- `options` (Object) - 配置对象
  - `type` (string) - 输入类型 (`'text'`, `'password'`, `'email'`)，默认 `'text'`
  - `value` (string) - 初始值
  - `placeholder` (string) - 占位符文本
  - `label` (string) - 标签文本
  - `disabled` (boolean) - 是否禁用
  - `required` (boolean) - 是否必填
  - `error` (string) - 错误消息
  - `onInput` (Function) - 输入事件回调
  - `onChange` (Function) - 变更事件回调

**返回**: `(string)` - HTML 字符串

**示例**:
```javascript
Input({
  type: 'password',
  label: '密码',
  placeholder: '请输入密码',
  onInput: (value) => console.log(value)
})
```

---

### Button.js

#### Button(options)

按钮组件

**参数**:
- `options` (Object) - 配置对象
  - `text` (string) - 按钮文本
  - `type` (string) - 按钮类型 (`'primary'`, `'secondary'`, `'danger'`, `'text'`)
  - `size` (string) - 按钮尺寸 (`'sm'`, `'md'`, `'lg'`)
  - `disabled` (boolean) - 是否禁用
  - `loading` (boolean) - 是否加载中
  - `onClick` (Function) - 点击事件回调
  - `className` (string) - 额外的 CSS 类名

**返回**: `(string)` - HTML 字符串

---

#### Button.primary(text, onClick)

主按钮快捷方法

**参数**:
- `text` (string) - 按钮文本
- `onClick` (Function) - 点击回调

**返回**: `(string)` - HTML 字符串

---

#### Button.secondary(text, onClick)

次要按钮快捷方法

**参数**: 同上

**返回**: `(string)` - HTML 字符串

---

#### Button.danger(text, onClick)

危险按钮快捷方法

**参数**: 同上

**返回**: `(string)` - HTML 字符串

---

### Card.js

#### Card(options)

卡片组件

**参数**:
- `options` (Object) - 配置对象
  - `title` (string) - 卡片标题
  - `content` (string) - 卡片内容（HTML）
  - `footer` (string) - 卡片底部内容（可选）
  - `className` (string) - 额外的 CSS 类名

**返回**: `(string)` - HTML 字符串

---

### Modal.js

#### Modal(options)

模态框组件

**参数**:
- `options` (Object) - 配置对象
  - `title` (string) - 标题
  - `content` (string) - 内容（HTML）
  - `showCancel` (boolean) - 是否显示取消按钮，默认 `true`
  - `confirmText` (string) - 确认按钮文本，默认 `'确定'`
  - `cancelText` (string) - 取消按钮文本，默认 `'取消'`
  - `onConfirm` (Function) - 确认回调
  - `onCancel` (Function) - 取消回调
  - `onClose` (Function) - 关闭回调

**返回**: `(string)` - HTML 字符串

---

### Notification.js

#### show.success(message, duration)

显示成功通知

**参数**:
- `message` (string) - 消息文本
- `duration` (number) - 显示时长（毫秒），默认 3000

**返回**: 无

---

#### show.error(message, duration)

显示错误通知

**参数**: 同上

**返回**: 无

---

#### show.info(message, duration)

显示信息通知

**参数**: 同上

**返回**: 无

---

#### show.warning(message, duration)

显示警告通知

**参数**: 同上

**返回**: 无

---

### Loading.js

#### Loading(text)

加载组件

**参数**:
- `text` (string) - 加载提示文本，默认 `'加载中...'`

**返回**: `(string)` - HTML 字符串

---

#### Loading.spinner(size)

Loading-Spinner

**参数**:
- `size` (string) - 尺寸 (`'sm'`, `'md'`, `'lg'`), 默认 `'md'`

**返回**: `(string)` - HTML 字符串

---

### Table.js

#### Table(options)

表格组件

**参数**:
- `options` (Object) - 配置对象
  - `columns` (Array) - 列定义数组
    - `key` (string) - 数据键名
    - `title` (string) - 列标题
    - `width` (string) - 列宽（可选）
    - `render` (Function) - 自定义渲染函数（可选）
  - `data` (Array) - 数据数组
  - `emptyText` (string) - 空数据提示文本，默认 `'暂无数据'`
  - `className` (string) - 额外的 CSS 类名
  -  - `onRowClick` (Function) - 行点击事件回调（可选）

**返回**: `(string)` - HTML 字符串

**示例**:
```javascript
Table({
  columns: [
    { key: 'domain', title: '域名' },
    { key: 'status', title: '状态', render: (val) => `<span class="status">${val}</span>` }
  ],
  data: [{ domain: 'example.com', status: '正常' }],
  onRowClick: (row) => console.log(row)
})
```

---

### DomainCard.js

#### DomainCard(domain)

域名卡片组件

**参数**:
- `domain` (Object) - 域名对象
  - `domain` (string) - 域名
  - `lastCheck` (string) - 最后检测时间
  - `httpsRR` (string) - HTTPS RR 状态
  - `ech` (string) - ECH 状态
  - `ipv6` (number) - IPv6 记录数
  - `overall` (string) - 整体状态

**返回**: `(string)` - HTML 字符串

---

### admin/Sidebar.js

#### Sidebar(options)

管理后台侧边栏

**参数**:
- `options` - 配置对象
  - `open` (boolean) - 是否展开（移动端）
  - `onClose` (Function) - 关闭回调（移动端）

**返回**: `(string)` - HTML 字符串

---

### admin/Topbar.js

#### Topbar(options)

管理后台顶栏

**参数**:
- `options` (Object) - 配置对象
  - `onMenuClick` (Function) - 菜单按钮点击回调
  - `onLogout` (Function) - 退出登录回调

**返回**: `(string)` - HTML 字符串

---

## 页面 (pages)

### PublicDashboard.js

#### PublicDashboard 类

**方法**:

##### constructor()

构造函数，初始化实例属性

**属性**:
- `domains` (Array) - 域名列表
- `filteredDomains` (Array) - 过滤后的域名列表
- `searchQuery` (string) - 搜索关键词
- `loading` (boolean) - 加载状态
- `error` (string|null) - 错误消息

---

##### async init()

初始化页面

**参数**: 无

**返回**: `Promise<void>`

**副作用**:
- 加载域名数据
- 渲染页面
- 绑定事件

---

##### render()

渲染页面

**参数**: 无

**返回**: `(string)` - HTML 字符串

---

##### bindEvents()

绑定事件处理器

**参数**: 无

**返回**: 无

---

##### async loadData()

加载数据

**参数**: 无

**返回**: `Promise<void>`

---

##### filterDomains()

过滤域名列表

**参数**: 无（使用 `this.searchQuery`）

**返回**: 无（更新 `this.filteredDomains`）

---

### Login.js

#### LoginPage 类

**方法**:

##### constructor()

**属性**:
- `token` (string) - API Token
- `error` (string|null) - 错误消息
- `loading` (boolean) - 加载状态

---

##### async init()

**参数**: 无

**返回**: `Promise<void>`

---

##### render()

**返回**: `(string)` - HTML 字符串

渲染登录表单

---

##### bindEvents()

绑定表单提交和输入事件

---

##### async handleLogin(event)

处理登录提交

**参数**:
- `event` (Event) - 表单提交事件

**返回**: `Promise<void>`

**副作用**:
- 验证 Token
- 保存到 localStorage
- 跳转到管理后台

---

### admin/AdminLayout.js

#### AdminLayout 类

**构造函数参数**:
- `childComponent` (Class) - 子页面组件类

**属性**:
- `childComponent` (Class) - 子组件类
- `childInstance` (Object) - 子组件实例
- `sidebarOpen` (boolean) - 侧边栏展开状态（移动端）

---

##### async init(params, queryParams)

初始化布局

**参数**:
- `params` (Object) - 路由参数
- `queryParams` (Object) - 查询参数

**返回**: `Promise<void>`

**副作用**:
- 认证检查
- 创建子页面实例
- 渲染布局

---

##### render()

渲染布局

**返回**: `(string)` - HTML 字符串（包含侧边栏、顶栏、内容区）

---

##### bindEvents()

绑定全局事件（侧边栏切换、退出登录）

---

##### toggleSidebar()

切换侧边栏（移动端）

---

##### async handleLogout()

处理退出登录

**返回**: `Promise<void>`

---

##### destroy()

销毁页面，清理事件

---

### admin/AdminDashboard.js

#### AdminDashboard 类

**属性**:
- `stats` (Object) - 统计数据
- `recentDomains` (Array) - 最近域名列表
- `error` (string|null) - 错误消息

---

##### async loadData()

加载统计数据

---

##### render()

渲染仪表盘

---

### admin/AdminDomains.js

#### AdminDomains 类

**属性**:
- `domains` (Array) - 域名列表
- `selectedDomain` (string|null) - 选中的域名
- `loading` (boolean) - 加载状态
- `showAddModal` (boolean) - 是否显示添加模态框

---

##### async loadDomains()

加载域名列表

---

##### async handleAddDomain(domain)

添加域名

**参数**:
- `domain` (string) - 域名

**返回**: `Promise<void>`

---

##### async handleDeleteDomain(domain)

删除域名

**参数**:
- `domain` (string) - 域名

**返回**: `Promise<void>`

---

##### async handleSetDefault(domain)

设为默认展示

**参数**:
- `domain` (string) - 域名

**返回**: `Promise<void>`

---

### admin/AdminConfig.js

#### AdminConfig 类

**属性**:
- `config` (Object) - 配置对象
- `dohEndpoints` (Array) - DoH 端点列表
- `loading` (boolean)

---

##### async loadConfig()

加载配置

---

##### async saveConfig()

保存配置

---

##### async testDohEndpoint(url)

测试 DoH 端点

**参数**:
- `url` (string) - DoH 端点 URL

**返回**: `Promise<Object>` - 测试结果

---

### admin/AdminHistory.js

#### AdminHistory 类

**属性**:
- `history` (Array) - 历史记录
- `currentPage` (number) - 当前页码
- `totalPages` (number) - 总页数
- `domainFilter` (string) - 域名筛选

---

##### async loadHistory(page, domain)

加载历史记录

**参数**:
- `page` (number) - 页码
- `domain` (string) - 域名筛选

**返回**: `Promise<void>`

---

##### async deleteHistory(domain)

删除域名历史

**参数**:
- `domain` (string) - 域名

---

##### async cleanupHistory()

清理所有历史

---

### admin/AdminStats.js

#### AdminStats 类

**属性**:
- `stats` (Object) - 统计数据
- `chartData` (Array) - 图表数据

---

##### async loadStats()

加载统计数据

---

##### renderCharts()

渲染图表

---

## 路由 (router)

### routes.js

#### routes 数组

路由配置数组，每个路由对象包含：

**属性**:
- `name` (string) - 路由名称
- `path` (string) - 路由路径
- `component` (Function) - 组件加载函数（动态 import）
- `meta` (Object) - 元数据
  - `requiresAuth` (boolean) - 是否需要认证
  - `title` (string) - 页面标题
- `children` (Array) - 子路由数组（可选）

---

### index.js

#### navigateTo(path)

导航到指定路径

**参数**:
- `path` (string) - 路径（不含 #）

**返回**: 无

**副作用**: 修改 `location.hash`

---

#### getCurrentPage()

获取当前页面实例

**参数**: 无

**返回**: `(Object|null)` - 页面对象

---

##### init()

初始化路由系统

**参数**: 无

**返回**: `Promise<void>`

**副作用**:
- 监听 hashchange 事件
- 触发初始路由

---

### utils.js

#### matchRoute(path, pattern)

匹配路由并提取参数

**参数**:
- `path` (string) - 当前路径
- `pattern` (string) - 路由模式（如 `/domain/:name`）

**返回**: `(Object|null)` - 参数对象

**示例**:
```javascript
matchRoute('/domain/example.com', '/domain/:name')
// 返回：{ name: 'example.com' }
```

---

#### getQueryParams(hash)

获取查询参数

**参数**:
- `hash` (string) - hash 路径（可选，默认使用 `location.hash`）

**返回**: `(URLSearchParams)` - 查询参数对象

---

#### navigate(path, params, query)

导航到指定路由

**参数**:
- `path` (string) - 路由路径
- `params` (Object) - 路由参数（动态参数）
- `query` (Object) - 查询参数

**返回**: 无

**示例**:
```javascript
navigate('/domain/:name', { name: 'example.com' }, { tab: 'history' })
// 跳转至：#/domain/example.com?tab=history
```

---

## 📝 更新说明

**最后更新**: 2026-06-10  
**覆盖范围**: 前端所有核心模块（34 个文件）  
**文档类型**: 函数参数、返回值、类型定义
