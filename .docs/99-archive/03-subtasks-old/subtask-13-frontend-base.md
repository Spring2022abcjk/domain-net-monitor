# 子任务 13：前端基础组件

**状态**: 🔴 未启动  
**优先级**: 高  
**预计工时**: 1 天  
**创建日期**: 2026-06-01  
**更新日期**: 2026-06-01  

---

## 任务目标

在任务 12 项目初始化的基础上，实现前端基础组件和工具库，为后续页面开发提供通用的 UI 组件、API 封装和路由功能。

### 核心需求

1. **API 请求封装**：统一的 API 请求方法，自动注入 Token、处理超时和错误
2. **路由系统完善**：配置式路由、路由参数、查询参数、404 页面（已在任务 12 完成，需验收）
3. **通用 UI 组件**：按钮、输入框、卡片、表格、通知、加载状态
4. **错误处理**：全局错误处理、通知系统
5. **工具函数**：日期格式化、数据验证等

---

## 依赖关系

### 前置依赖
- ✅ 任务 12：前端项目初始化（Vite + Tailwind + 基础路由）
- ✅ 任务 1-11：后端 API 全部完成

### 后续依赖
- 任务 14：公开 Dashboard 页面（依赖本任务的 UI 组件和 API 封装）
- 任务 15-21：管理后台页面（依赖本任务的基础组件）

---

## 实现步骤

### 13.1 完善 API 请求封装

**文件**: `frontend/src/utils/api.js`（修改）

**需求分析**:
- 当前已有 `request()` 函数和 `get/post/put/del` 方法
- 需要增强：超时处理、错误统一处理、请求拦截器、响应拦截器

**实现内容**:

```javascript
/**
 * API 请求配置
 */
const API_CONFIG = {
  baseUrl: '',
  timeout: 5000,
  retryCount: 0
}

/**
 * API 错误类
 */
export class APIError extends Error {
  constructor(message, status, code, data) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.code = code
    this.data = data
  }
}

/**
 * API 请求封装
 * @param {string} url - 请求 URL
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 响应数据
 */
export async function request(url, options = {}) {
  const token = getToken()
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  // 添加 Token
  if (token) {
    headers['X-API-Token'] = token
  }
  
  const config = {
    ...options,
    headers
  }
  
  // 创建带超时的 Promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${API_CONFIG.timeout}ms`))
    }, API_CONFIG.timeout)
  })
  
  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, config)
      const data = await response.json()
      
      if (!response.ok) {
        throw new APIError(
          data.msg || `HTTP ${response.status}`,
          response.status,
          data.code || 'ERROR',
          data
        )
      }
      
      return data
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }
      
      // 网络错误
      throw new APIError(
        '网络错误，请检查连接',
        0,
        'NETWORK_ERROR',
        null
      )
    }
  })()
  
  // 竞速：超时或请求完成
  return Promise.race([fetchPromise, timeoutPromise])
}

/**
 * GET 请求
 * @param {string} url - 请求 URL
 * @param {Object} [params] - 查询参数
 * @returns {Promise<Object>} 响应数据
 */
export function get(url, params) {
  const queryString = params 
    ? '?' + new URLSearchParams(params).toString()
    : ''
  return request(url + queryString, { method: 'GET' })
}

/**
 * POST 请求
 * @param {string} url - 请求 URL
 * @param {Object} body - 请求体
 * @returns {Promise<Object>} 响应数据
 */
export function post(url, body) {
  return request(url, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * PUT 请求
 * @param {string} url - 请求 URL
 * @param {Object} body - 请求体
 * @returns {Promise<Object>} 响应数据
 */
export function put(url, body) {
  return request(url, {
    method: 'PUT',
    body: JSON.stringify(body)
  })
}

/**
 * DELETE 请求
 * @param {string} url - 请求 URL
 * @returns {Promise<Object>} 响应数据
 */
export function del(url) {
  return request(url, { method: 'DELETE' })
}

/**
 * 设置 API 基础 URL
 * @param {string} url - API 基础 URL
 */
export function setApiBaseUrl(url) {
  API_CONFIG.baseUrl = url
}

/**
 * 设置请求超时
 * @param {number} ms - 超时毫秒数
 */
export function setTimeout(ms) {
  API_CONFIG.timeout = ms
}
```

**验收要点**:
- [ ] `get()` 支持查询参数对象
- [ ] 超时处理正常工作（5 秒默认）
- [ ] 错误统一为 `APIError` 类型
- [ ] 包含 `status`, `code`, `data` 信息
- [ ] 网络错误友好提示

---

### 13.2 完善 Storage 工具

**文件**: `frontend/src/utils/storage.js`（修改）

**需求分析**:
- 当前已有基础的 `getConfig/setConfig/clearConfig` 等方法
- 需要增强：登录状态检查、自动清理过期 Token（可选）

**实现内容**:

```javascript
/**
 * localStorage 凭据管理
 */

const STORAGE_KEY = 'domain_monitor_config'
const TOKEN_EXPIRY_KEY = 'domain_monitor_token_expiry'

/**
 * 获取存储的配置
 * @returns {Object} 配置对象
 */
export function getConfig() {
  const config = localStorage.getItem(STORAGE_KEY)
  if (config) {
    try {
      return JSON.parse(config)
    } catch (e) {
      console.error('[Storage] Failed to parse config:', e)
      return {}
    }
  }
  return {}
}

/**
 * 存储配置
 * @param {Object} config - 配置对象
 */
export function setConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

/**
 * 清除配置
 */
export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * 获取 API 端点
 * @returns {string} API 端点
 */
export function getApiEndpoint() {
  const config = getConfig()
  return config.apiEndpoint || ''
}

/**
 * 设置 API 端点
 * @param {string} endpoint - API 端点
 */
export function setApiEndpoint(endpoint) {
  const config = getConfig()
  config.apiEndpoint = endpoint
  setConfig(config)
}

/**
 * 获取 API Token
 * @returns {string} Token
 */
export function getApiToken() {
  const config = getConfig()
  return config.apiToken || ''
}

/**
 * 设置 API Token
 * @param {string} token - Token
 */
export function setApiToken(token) {
  const config = getConfig()
  config.apiToken = token
  setConfig(config)
}

/**
 * 清除登录信息
 */
export function clearAuth() {
  clearConfig()
}

/**
 * 检查是否已登录
 * @returns {boolean} 是否已登录
 */
export function isLoggedIn() {
  const config = getConfig()
  return !!(config.apiEndpoint && config.apiToken)
}

/**
 * 获取当前用户信息（从 Token 解析，可选）
 * @returns {Object|null} 用户信息
 */
export function getCurrentUser() {
  const token = getApiToken()
  if (!token) return null
  
  try {
    // 如果是 JWT，可以解析 payload
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]))
      return {
        id: payload.sub,
        name: payload.name,
        exp: payload.exp
      }
    }
  } catch (e) {
    console.warn('[Storage] Failed to parse token:', e)
  }
  
  return null
}

/**
 * 导航到指定路径
 * @param {string} path - 路径
 */
export function navigate(path) {
  window.location.hash = path
}
```

**验收要点**:
- [ ] `isLoggedIn()` 正确判断登录状态
- [ ] `getCurrentUser()` 可解析 JWT Token（如果后端使用 JWT）
- [ ] `clearAuth()` 清除所有登录信息
- [ ] `navigate()` 用于路由跳转

---

### 13.3 创建通知组件

**文件**: `frontend/src/components/Notification.js`（新建）

**需求分析**:
- 任务 12 Login.js 中已有简单的 `showMessage` 方法
- 需要抽取为独立组件，支持全局调用

**实现内容**:

```javascript
/**
 * 通知组件
 * 支持全局调用：Notification.show('消息内容', 'success')
 */

const NOTIFICATION_TYPES = {
  success: {
    icon: '✅',
    class: 'bg-green-50 border-green-200 text-green-800'
  },
  error: {
    icon: '❌',
    class: 'bg-red-50 border-red-200 text-red-800'
  },
  warning: {
    icon: '⚠️',
    class: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  },
  info: {
    icon: 'ℹ️',
    class: 'bg-blue-50 border-blue-200 text-blue-800'
  }
}

let notificationContainer = null

/**
 * 获取或创建通知容器
 */
function getContainer() {
  if (!notificationContainer) {
    notificationContainer = document.createElement('div')
    notificationContainer.className = 'fixed top-4 right-4 z-50 space-y-2'
    document.body.appendChild(notificationContainer)
  }
  return notificationContainer
}

/**
 * 显示通知
 * @param {string} message - 通知内容
 * @param {string} [type='info'] - 通知类型 (success/error/warning/info)
 * @param {number} [duration=3000] - 显示时长（毫秒）
 */
export function show(message, type = 'info', duration = 3000) {
  const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info
  const container = getContainer()
  
  const notification = document.createElement('div')
  notification.className = `dm-notification ${config.class} border rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 animate-slide-in-right`
  notification.innerHTML = `
    <span class="text-lg">${config.icon}</span>
    <span class="flex-1">${message}</span>
    <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
      ✕
    </button>
  `
  
  container.appendChild(notification)
  
  // 自动移除
  setTimeout(() => {
    if (notification.parentElement) {
      notification.classList.add('animate-slide-out-right')
      setTimeout(() => notification.remove(), 300)
    }
  }, duration)
}

/**
 * 成功通知
 * @param {string} message - 通知内容
 * @param {number} [duration=3000] - 显示时长
 */
export function success(message, duration) {
  show(message, 'success', duration)
}

/**
 * 错误通知
 * @param {string} message - 通知内容
 * @param {number} [duration=3000] - 显示时长
 */
export function error(message, duration) {
  show(message, 'error', duration)
}

/**
 * 警告通知
 * @param {string} message - 通知内容
 * @param {number} [duration=3000] - 显示时长
 */
export function warning(message, duration) {
  show(message, 'warning', duration)
}

/**
 * 信息通知
 * @param {string} message - 通知内容
 * @param {number} [duration=3000] - 显示时长
 */
export function info(message, duration) {
  show(message, 'info', duration)
}

/**
 * 清除所有通知
 */
export function clear() {
  if (notificationContainer) {
    notificationContainer.innerHTML = ''
  }
}

export default {
  show,
  success,
  error,
  warning,
  info,
  clear
}

```

**文件**: `frontend/src/styles/components.css`（新建）

```css
/* 通知组件动画 */
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-out-right {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}

.animate-slide-out-right {
  animation: slide-out-right 0.3s ease-out;
}

/* 加载动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 按钮禁用状态 */
.dm-btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}

/* 输入框焦点状态 */
.dm-input:focus {
  @apply ring-2 ring-primary-500 border-transparent;
}

/* 卡片悬停效果 */
.dm-card:hover {
  @apply shadow-md;
}
```

**验收要点**:
- [ ] 支持 4 种通知类型（success/error/warning/info）
- [ ] 自动消失（默认 3 秒）
- [ ] 可手动关闭
- [ ] 滑入/滑出动画
- [ ] 支持全局调用

---

### 13.4 创建通用 UI 组件

**文件**: `frontend/src/components/Button.js`（新建）

```javascript
/**
 * 按钮组件
 * @param {Object} props - 属性
 * @param {string} props.text - 按钮文本
 * @param {string} [props.variant='primary'] - 变体 (primary/secondary/danger)
 * @param {string} [props.size='md'] - 尺寸 (sm/md/lg)
 * @param {boolean} [props.disabled=false] - 是否禁用
 * @param {boolean} [props.loading=false] - 加载状态
 * @param {string} [props.onClick] - 点击事件
 */
export function Button({ 
  text, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  onClick = '' 
}) {
  const variantClasses = {
    primary: 'dm-btn dm-btn-primary',
    secondary: 'dm-btn dm-btn-secondary',
    danger: 'dm-btn dm-btn-danger'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
  
  return `
    <button 
      class="${variantClasses[variant]} ${sizeClasses[size]}"
      ${disabled || loading ? 'disabled' : ''}
      ${onClick ? `onclick="${onClick}"` : ''}
    >
      ${loading ? '<span class="animate-spin mr-2">⟳</span>' : ''}
      ${text}
    </button>
  `
}

export default Button

```

**文件**: `frontend/src/components/Input.js`（新建）

```javascript
/**
 * 输入框组件
 * @param {Object} props - 属性
 * @param {string} props.type - 输入类型 (text/password/email/url/number)
 * @param {string} props.id - 输入框 ID
 * @param {string} props.placeholder - 占位符
 * @param {string} [props.value] - 值
 * @param {boolean} [props.required=false] - 是否必填
 * @param {string} [props.label] - 标签文本
 * @param {string} [props.error] - 错误信息
 */
export function Input({ 
  type, 
  id, 
  placeholder, 
  value = '', 
  required = false,
  label,
  error
}) {
  return `
    <div class="mb-4">
      ${label ? `<label class="block text-sm font-medium text-gray-700 mb-1">${label}</label>` : ''}
      <input 
        type="${type}" 
        id="${id}"
        class="dm-input"
        placeholder="${placeholder}"
        value="${value}"
        ${required ? 'required' : ''}
      />
      ${error ? `<p class="mt-1 text-sm text-danger">${error}</p>` : ''}
    </div>
  `
}

export default Input

```

**文件**: `frontend/src/components/Card.js`（新建）

```javascript
/**
 * 卡片组件
 * @param {Object} props - 属性
 * @param {string} props.title - 标题
 * @param {string} props.content - 内容
 * @param {string} [props.footer] - 底部内容
 * @param {boolean} [props.hoverable=false] - 是否支持悬停
 */
export function Card({ title, content, footer, hoverable = false }) {
  return `
    <div class="dm-card ${hoverable ? 'transition-shadow cursor-pointer' : ''}">
      ${title ? `<h3 class="text-lg font-semibold mb-3">${title}</h3>` : ''}
      <div class="text-gray-600">
        ${content}
      </div>
      ${footer ? `<div class="mt-4 pt-4 border-t border-gray-100">${footer}</div>` : ''}
    </div>
  `
}

export default Card

```

**文件**: `frontend/src/components/Loading.js`（新建）

```javascript
/**
 * 加载状态组件
 * @param {Object} props - 属性
 * @param {string} [props.text='加载中...'] - 加载文本
 * @param {string} [props.size='md'] - 尺寸 (sm/md/lg)
 */
export function Loading({ text = '加载中...', size = 'md' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }
  
  return `
    <div class="flex flex-col items-center justify-center py-8">
      <div class="${sizeClasses[size]} animate-spin text-primary-600">
        <svg class="w-full h-full" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="4"/>
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      </div>
      ${text ? `<p class="mt-4 text-gray-600">${text}</p>` : ''}
    </div>
  `
}

export default Loading

```

**文件**: `frontend/src/components/Table.js`（新建）

```javascript
/**
 * 表格组件
 * @param {Object} props - 属性
 * @param {Array} props.columns - 列定义 [{ key: 'name', title: '名称', width: '100px' }]
 * @param {Array} props.data - 数据数组
 * @param {string} [props.emptyText='暂无数据'] - 空数据提示
 */
export function Table({ columns, data, emptyText = '暂无数据' }) {
  if (!data || data.length === 0) {
    return `
      <div class="text-center py-8 text-gray-500">
        ${emptyText}
      </div>
    `
  }
  
  return `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            ${columns.map(col => `
              <th 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                ${col.width ? `style="width: ${col.width}"` : ''}
              >
                ${col.title}
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${data.map(row => `
            <tr class="hover:bg-gray-50">
              ${columns.map(col => `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${row[col.key] || '-'}
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

export default Table

```

**验收要点**:
- [ ] Button 支持多种变体和尺寸
- [ ] Button 支持 loading 状态
- [ ] Input 支持错误提示
- [ ] Card 支持标题和内容
- [ ] Loading 带动画
- [ ] Table 支持列定义和数据渲染
- [ ] 所有组件使用 `dm-` 前缀样式

---

### 13.5 创建工具函数库

**文件**: `frontend/src/utils/index.js`（新建）

```javascript
/**
 * 日期格式化
 * @param {Date|string|number} date - 日期
 * @param {string} [format='YYYY-MM-DD HH:mm:ss'] - 格式
 * @returns {string} 格式化后的日期
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date)
  if (isNaN(d.getTime())) {
    return '无效日期'
  }
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 相对时间格式化
 * @param {Date|string|number} date - 日期
 * @returns {string} 相对时间描述
 */
export function formatRelativeTime(date) {
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * 验证 URL 格式
 * @param {string} url - URL 地址
 * @returns {boolean} 是否有效
 */
export function isValidURL(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 防抖函数
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟毫秒数
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn - 要执行的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, limit = 300) {
  let inThrottle = false
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 深拷贝
 * @param {*} obj - 要拷贝的对象
 * @returns {*} 拷贝后的对象
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 格式化数字（添加千分位）
 * @param {number} num - 数字
 * @returns {string} 格式化后的字符串
 */
export function formatNumber(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

```

**验收要点**:
- [ ] `formatDate()` 支持多种格式
- [ ] `formatRelativeTime()` 输出相对时间
- [ ] `isValidEmail()` 验证邮箱
- [ ] `isValidURL()` 验证 URL
- [ ] `debounce()` 防抖
- [ ] `throttle()` 节流
- [ ] 所有函数有 JSDoc 注释

---

### 13.6 创建组件索引文件

**文件**: `frontend/src/components/index.js`（新建）

```javascript
/**
 * 组件统一导出
 */

export { default as Header } from './Header.js'
export { default as Footer } from './Footer.js'
export { default as Button } from './Button.js'
export { default as Input } from './Input.js'
export { default as Card } from './Card.js'
export { default as Loading } from './Loading.js'
export { default as Table } from './Table.js'
export { default as Notification } from './Notification.js'

// 辅助函数导出
export { Button as createButton } from './Button.js'
export { Input as createInput } from './Input.js'
export { Card as createCard } from './Card.js'
export { Loading as createLoading } from './Loading.js'
export { Table as createTable } from './Table.js'

```

**验收要点**:
- [ ] 导出所有通用组件
- [ ] 支持命名导出和默认导出
- [ ] 方便页面组件引用

---

### 13.7 路由系统验收

**文件**: `frontend/src/router/`（已存在，需验收）

**验收检查清单**:
- [ ] `routes.js` - 路由配置表存在
- [ ] `utils.js` - 路由参数解析工具存在
- [ ] `index.js` - 路由初始化逻辑完善
- [ ] 支持动态路由参数 (`:name`)
- [ ] 支持查询参数 (`?key=value`)
- [ ] 404 页面正常显示
- [ ] 路由守卫支持 (`requiresAuth`)
- [ ] 自动设置页面标题

**测试方法**:
```bash
cd frontend
npm test

# 验证路由测试通过
# Router Config - routes.js Exists
# Router Utils - Match Route
# Router - 404 Page Exists
# Router Config - Routes Definition
# Router - Initialization Logic
# Router - Dynamic Route Support
```

---

## 测试用例

### 单元测试

**文件**: `frontend/tests/utils.test.js`（新建）

```javascript
// tests/utils.test.js

import { runSuite, assertEqual } from './test-runner.js'
import { 
  formatDate, 
  formatRelativeTime, 
  isValidEmail, 
  isValidURL,
  debounce,
  throttle
} from '../src/utils/index.js'

export async function runUtilsTests() {
  await runSuite('Utils - formatDate', async () => {
    const date = '2026-06-01T12:30:45'
    assertEqual(
      formatDate(date, 'YYYY-MM-DD'),
      '2026-06-01',
      'Formats date to YYYY-MM-DD'
    )
    assertEqual(
      formatDate(date, 'YYYY/MM/DD HH:mm:ss'),
      '2026/06/01 12:30:45',
      'Formats date with custom format'
    )
  })
  
  await runSuite('Utils - isValidEmail', async () => {
    assertEqual(isValidEmail('test@example.com'), true, 'Valid email')
    assertEqual(isValidEmail('invalid'), false, 'Invalid email')
  })
  
  await runSuite('Utils - isValidURL', async () => {
    assertEqual(isValidURL('https://example.com'), true, 'Valid URL')
    assertEqual(isValidURL('not-a-url'), false, 'Invalid URL')
  })
}

export { runUtilsTests }
```

**文件**: `frontend/tests/components.test.js`（新建）

```javascript
// tests/components.test.js

import { runSuite, assertEqual } from './test-runner.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const frontendRoot = join(process.cwd())

export async function runComponentsTests() {
  await runSuite('Components - All Files Exist', async () => {
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/Button.js')),
      true,
      'Button.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/Input.js')),
      true,
      'Input.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/Card.js')),
      true,
      'Card.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/Loading.js')),
      true,
      'Loading.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/Table.js')),
      true,
      'Table.js exists'
    )
    assertEqual(
      existsSync(join(frontendRoot, 'src/components/Notification.js')),
      true,
      'Notification.js exists'
    )
  })
  
  await runSuite('Components - Use dm- Prefix', async () => {
    const button = readFileSync(join(frontendRoot, 'src/components/Button.js'), 'utf-8')
    const input = readFileSync(join(frontendRoot, 'src/components/Input.js'), 'utf-8')
    
    assertEqual(button.includes('dm-btn'), true, 'Button uses dm- prefix')
    assertEqual(input.includes('dm-input'), true, 'Input uses dm- prefix')
  })
}

export { runComponentsTests }
```

---

### 手动测试

**测试 API 封装**:
```bash
# 1. 启动开发服务器
cd frontend
npm run dev

# 2. 在浏览器控制台测试
import { get, post, APIError } from './src/utils/api.js'
import { setApiToken } from './src/utils/storage.js'

# 设置 Token
setApiToken('test-token')

# 测试 GET 请求
get('/api/admin/stats').then(console.log).catch(console.error)

# 测试超时
import { setTimeout } from './src/utils/api.js'
setTimeout(100)  # 设置 100ms 超时
get('/api/admin/slow-endpoint').then(console.log).catch(console.error)

# 测试错误处理
get('/api/admin/non-existent').then(console.log).catch(err => {
  console.log(err instanceof APIError)  # 应该为 true
  console.log(err.status)  # HTTP 状态码
  console.log(err.code)    # 错误代码
})
```

**测试通知组件**:
```javascript
// 在浏览器控制台
import Notification from './src/components/Notification.js'

Notification.success('操作成功！')
Notification.error('发生错误')
Notification.warning('请注意')
Notification.info('提示信息')

# 测试手动关闭
# 测试自动消失（3 秒后）
```

**测试 UI 组件**:
```javascript
// 在页面中渲染组件
import { Button, Input, Card, Loading, Table } from './src/components/index.js'

document.getElementById('app').innerHTML = `
  ${Button({ text: '点击我', variant: 'primary' })}
  ${Input({ type: 'email', id: 'email', placeholder: '输入邮箱' })}
  ${Card({ title: '标题', content: '内容' })}
  ${Loading({ text: '加载中...' })}
  ${Table({ 
    columns: [
      { key: 'name', title: '名称' },
      { key: 'value', title: '值' }
    ],
    data: [
      { name: '项目 1', value: '100' },
      { name: '项目 2', value: '200' }
    ]
  })}
`
```

---

## 验收标准

### 功能验收

- [ ] API 请求封装正常工作（get/post/put/del）
- [ ] API 超时处理正常（5 秒默认）
- [ ] API 错误统一处理（APIError 类型）
- [ ] Storage 工具函数完整（登录状态检查等）
- [ ] 通知组件支持 4 种类型
- [ ] 通知自动消失（3 秒）
- [ ] Button 组件支持多种变体
- [ ] Button 支持 loading 状态
- [ ] Input 支持错误提示
- [ ] Card 组件正常渲染
- [ ] Loading 带动画
- [ ] Table 支持列定义和数据
- [ ] 工具函数正常工作（日期格式化、验证等）
- [ ] 路由参数解析正常
- [ ] 查询参数解析正常
- [ ] 404 页面正常显示

### 代码质量验收

- [ ] 所有函数有 JSDoc 注释
- [ ] 组件使用 `dm-` 前缀样式
- [ ] 错误处理完善
- [ ] 代码符合 ES Modules 规范
- [ ] 通过 ESLint（如配置）
- [ ] 通过预提交检查

### 测试验收

- [ ] 单元测试覆盖所有工具函数
- [ ] 单元测试覆盖所有组件
- [ ] `npm test` 全部通过
- [ ] 手动测试用例全部验证
- [ ] 构建正常 `npm run build`

---

## 相关文件

### 新建文件
- `frontend/src/utils/index.js` - 工具函数库
- `frontend/src/components/Button.js` - 按钮组件
- `frontend/src/components/Input.js` - 输入框组件
- `frontend/src/components/Card.js` - 卡片组件
- `frontend/src/components/Loading.js` - 加载组件
- `frontend/src/components/Table.js` - 表格组件
- `frontend/src/components/Notification.js` - 通知组件
- `frontend/src/components/index.js` - 组件统一导出
- `frontend/src/styles/components.css` - 组件样式
- `frontend/tests/utils.test.js` - 工具函数测试
- `frontend/tests/components.test.js` - 组件测试

### 修改文件
- `frontend/src/utils/api.js` - 增强 API 请求封装
- `frontend/src/utils/storage.js` - 增强 Storage 工具

### 现有文件（验收）
- `frontend/src/router/routes.js` - 路由配置
- `frontend/src/router/utils.js` - 路由工具
- `frontend/src/router/index.js` - 路由初始化

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 组件样式冲突 | 中 | 统一使用 `dm-` 前缀 |
| 通知组件 Z-index 问题 | 低 | 设置足够大的 z-index（50+） |
| API 超时与后端不匹配 | 中 | 默认 5 秒，可按需调整 |
| 路由参数解析复杂 | 低 | 使用简单的前缀匹配法 |
| 组件文档不足 | 低 | 添加 JSDoc 注释 |

---

## 下一步

1. 完善 API 请求封装（错误处理、超时）
2. 完善 Storage 工具（登录状态检查）
3. 创建通知组件及样式
4. 创建通用 UI 组件（Button/Input/Card/Loading/Table）
5. 创建工具函数库
6. 创建组件索引文件
7. 编写单元测试
8. 运行测试验证
9. 构建验证
10. 准备提交

---

## 注意事项

### 1. 样式命名规范

所有自定义组件样式必须使用 `dm-` 前缀：
- ✅ `dm-btn`, `dm-btn-primary`
- ❌ `btn`, `btn-primary`

### 2. 组件 API 设计

组件函数接收 `props` 对象，返回 HTML 字符串：
```javascript
export function Button(props) {
  return `<button>...</button>`
}
```

### 3. 错误处理

API 请求统一抛出 `APIError`：
```javascript
try {
  const data = await get('/api/endpoint')
} catch (error) {
  if (error instanceof APIError) {
    console.log(error.status, error.code)
  }
}
```

### 4. 通知使用

推荐直接使用导入：
```javascript
import { Notification } from './components/index.js'
Notification.success('操作成功')
```

### 5. 路由参数

页面组件通过 `init()` 接收参数：
```javascript
export default {
  init({ params, query }) {
    const id = params.id
    const tab = query.get('tab')
  }
}
```

---

## 常见问题排查

**Q: 通知组件不显示？**
- 检查是否导入了 `Notification.js`
- 检查样式文件是否引入
- 检查 z-index 是否被覆盖

**Q: API 请求超时？**
- 检查后端服务是否启动
- 检查网络延迟
- 增加超时时间 `setTimeout(10000)`

**Q: 组件样式不生效？**
- 检查是否使用 `dm-` 前缀
- 检查 Tailwind 配置
- 重启开发服务器

**Q: 路由参数解析失败？**
- 检查路由模式是否匹配（`/domain/:name`）
- 检查 URL 编码（使用 `decodeURIComponent`）

**Q: 工具函数未定义？**
- 检查导出语句 `export function xxx`
- 检查导入路径是否正确

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-06-01 | 1.0 | 初始版本，基于任务 12 成果创建 |
