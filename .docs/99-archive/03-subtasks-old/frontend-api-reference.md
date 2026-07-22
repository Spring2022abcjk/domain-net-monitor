# 前端 API 接口文档

本文档汇总前端使用的所有 API 接口，包括端点、参数、响应格式和使用示例。

---

## 📋 目录

1. [API 基础配置](#api-基础配置)
2. [公开接口（无需认证）](#公开接口无需认证)
3. [管理员认证接口](#管理员认证接口)
4. [域名管理接口](#域名管理接口)
5. [检测配置接口](#检测配置接口)
6. [DoH 配置接口](#doh-配置接口)
7. [检测操作接口](#检测操作接口)
8. [历史记录接口](#历史记录接口)
9. [统计概览接口](#统计概览接口)

---

## API 基础配置

### 端点配置

```javascript
import { setApiBaseUrl, getApiBaseUrl } from '@/utils/api.js'

// 生产环境
setApiBaseUrl('https://your-worker.your-domain.workers.dev')

// 开发环境
setApiBaseUrl('http://localhost:8787')
```

### 响应格式

所有 API 响应遵循统一格式：

```javascript
{
  "code": 200,          // 状态码
  "data": {},           // 响应数据
  "msg": "success"      // 消息
}
```

### 错误处理

```javascript
import { APIError } from '@/utils/api.js'

try {
  const result = await get('/api/domains')
} catch (error) {
  if (error instanceof APIError) {
    console.error('API 错误:', error.status, error.code, error.message)
  }
}
```

### 认证 Token

```javascript
import { setToken, clearToken } from '@/utils/api.js'

// 登录后保存 Token
setToken(token)

// 退出登录清除 Token
clearToken()
```

---

## 公开接口（无需认证）

### 1. 获取域名列表（公开）

**端点**: `GET /api/public/domains`

**认证**: 不需要

**响应**:
```javascript
{
  "code": 200,
  "data": [
    {
      "domain": "example.com",
      "lastCheck": "2026-06-08T10:00:00Z",
      "httpsRR": "ok",
      "ech": "yes",
      "ipv6": 2,
      "overall": "full"
    }
  ],
  "msg": "success"
}
```

**使用示例**:
```javascript
import { get } from '@/utils/api.js'

const domains = await get('/api/public/domains')
```

---

### 2. 获取域名统计（公开）

**端点**: `GET /api/public/stats/:domain`

**认证**: 不需要

**路径参数**:
- `domain` - 域名（URL 编码）

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "domain": "example.com",
    "totalChecks": 100,
    "successRate": 95.5,
    "avgLatency": 45.2,
    "history": [
      {
        "timestamp": "2026-06-08T10:00:00Z",
        "httpsRR": "ok",
        "ech": "yes",
        "ipv6": 2,
        "latency": 42
      }
    ]
  },
  "msg": "success"
}
```

**使用示例**:
```javascript
const stats = await get(`/api/public/stats/${encodeURIComponent('example.com')}`)
```

---

### 3. 健康检查

**端点**: `GET /health`

**认证**: 不需要

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "status": "ok",
    "timestamp": "2026-06-08T10:00:00Z"
  },
  "msg": "OK"
}
```

**使用示例**:
```javascript
const health = await get('/health')
```

---

## 管理员认证接口

### 4. 登录验证

**端点**: `POST /api/admin/auth/verify`

**认证**: 不需要（但需要传入 `apiToken`）

**请求体**:
```javascript
{
  "token": "cfat_xxxxx"  // Cloudflare API Token
}
```

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "isValid": true,
    "expiresIn": 86400  // Token 有效期（秒）
  },
  "msg": "Verification successful"
}
```

**使用示例**:
```javascript
import { post, setToken } from '@/utils/api.js'

const response = await post('/api/admin/auth/verify', { token: 'cfat_xxxxx' })
if (response.data.isValid) {
  setToken(response.data.token)
}
```

---

### 5. 登出

**端点**: `POST /api/admin/auth/logout`

**认证**: 需要

**响应**:
```javascript
{
  "code": 200,
  "data": null,
  "msg": "Logout successful"
}
```

**使用示例**:
```javascript
import { post, clearToken } from '@/utils/api.js'

await post('/api/admin/auth/logout')
clearToken()
```

---

## 域名管理接口

### 6. 获取所有域名

**端点**: `GET /api/admin/domains`

**认证**: 需要

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "domains": ["example.com", "test.com"],
    "count": 2
  },
  "msg": "success"
}
```

**使用示例**:
```javascript
const result = await get('/api/admin/domains')
console.log(result.data.domains)
```

---

### 7. 添加域名

**端点**: `POST /api/admin/domains`

**认证**: 需要

**请求体**:
```javascript
{
  "domain": "newdomain.com"
}
```

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "domain": "newdomain.com",
    "added": true
  },
  "msg": "Domain added"
}
```

**使用示例**:
```javascript
import { post } from '@/utils/api.js'

await post('/api/admin/domains', { domain: 'newdomain.com' })
```

---

### 8. 删除域名

**端点**: `DELETE /api/admin/domains/:domain`

**认证**: 需要

**路径参数**:
- `domain` - 要删除的域名

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "domain": "example.com",
    "deleted": true
  },
  "msg": "Domain deleted"
}
```

**使用示例**:
```javascript
import { del } from '@/utils/api.js'

await del('/api/admin/domains/example.com')
```

---

### 9. 设为默认展示

**端点**: `POST /api/admin/domains/:domain/default`

**认证**: 需要

**路径参数**:
- `domain` - 域名

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "domain": "example.com",
    "isDefault": true
  },
  "msg": "Domain set as default"
}
```

**使用示例**:
```javascript
import { post } from '@/utils/api.js'

await post('/api/admin/domains/example.com/default')
```

---

### 10. 取消默认展示

**端点**: `DELETE /api/admin/domains/:domain/default`

**认证**: 需要

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "domain": "example.com",
    "isDefault": false
  },
  "msg": "Domain removed from default"
}
```

**使用示例**:
```javascript
import { del } from '@/utils/api.js'

await del('/api/admin/domains/example.com/default')
```

---

## 检测配置接口

### 11. 获取检测配置

**端点**: `GET /api/admin/config`

**认证**: 需要

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "refreshInterval": 43200,      // 刷新间隔（秒）
    "historyRetention": 7,         // 历史保留天数
    "rateLimit": {
      "windowMs": 60000,           // 限流窗口（毫秒）
      "maxRequests": 10            // 最大请求数
    }
  },
  "msg": "success"
}
```

**使用示例**:
```javascript
const config = await get('/api/admin/config')
```

---

### 12. 更新检测配置

**端点**: `PUT /api/admin/config`

**认证**: 需要

**请求体**:
```javascript
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
```javascript
{
  "code": 200,
  "data": null,
  "msg": "Configuration updated"
}
```

**使用示例**:
```javascript
import { put } from '@/utils/api.js'

await put('/api/admin/config', {
  refreshInterval: 86400,
  historyRetention: 14
})
```

---

### 13. 获取安全配置

**端点**: `GET /api/admin/config/security`

**认证**: 需要

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "allowedOrigins": "*",
    "requireAuth": true,
    "tokenExpiry": 86400
  },
  "msg": "success"
}
```

**使用示例**:
```javascript
const security = await get('/api/admin/config/security')
```

---

## DoH 配置接口

### 14. 获取 DoH 配置

**端点**: `GET /api/admin/doh`

**认证**: 需要

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "endpoints": [
      {
        "url": "https://cloudflare-dns.com/dns-query",
        "enabled": true,
        "priority": 1
      },
      {
        "url": "https://dns.google/resolve",
        "enabled": false,
        "priority": 2
      }
    ]
  },
  "msg": "success"
}
```

**使用示例**:
```javascript
const doh = await get('/api/admin/doh')
```

---

### 15. 更新 DoH 配置

**端点**: `PUT /api/admin/doh`

**认证**: 需要

**请求体**:
```javascript
{
  "endpoints": [
    {
      "url": "https://cloudflare-dns.com/dns-query",
      "enabled": true,
      "priority": 1
    }
  ]
}
```

**响应**:
```javascript
{
  "code": 200,
  "data": null,
  "msg": "DoH configuration updated"
}
```

**使用示例**:
```javascript
import { put } from '@/utils/api.js'

await put('/api/admin/doh', {
  endpoints: [
    { url: 'https://dns.google/resolve', enabled: true, priority: 1 }
  ]
})
```

---

### 16. 测试 DoH 端点

**端点**: `POST /api/admin/doh/test`

**认证**: 需要

**请求体**:
```javascript
{
  "url": "https://cloudflare-dns.com/dns-query",
  "domain": "example.com"
}
```

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "success": true,
    "latency": 45.2,
    "result": {
      "httpsRR": "ok",
      "ech": "yes",
      "ipv6": 2
    }
  },
  "msg": "DoH endpoint test completed"
}
```

**使用示例**:
```javascript
import { post } from '@/utils/api.js'

const test = await post('/api/admin/doh/test', {
  url: 'https://cloudflare-dns.com/dns-query',
  domain: 'example.com'
})
```

---

## 检测操作接口

### 17. 单域名检测

**端点**: `POST /api/admin/detect/single`

**认证**: 需要

**请求体**:
```javascript
{
  "domain": "example.com"
}
```

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "domain": "example.com",
    "timestamp": "2026-06-08T10:00:00Z",
    "httpsRR": { "status": "ok", "details": [...] },
    "ech": { "status": "yes", "value": "..." },
    "ipv6": { "status": "ok", "count": 2 },
    "overall": "full"
  },
  "msg": "Detection completed"
}
```

**使用示例**:
```javascript
const result = await post('/api/admin/detect/single', {
  domain: 'example.com'
})
```

---

### 18. 批量检测

**端点**: `POST /api/admin/detect/all`

**认证**: 需要

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "total": 5,
    "success": 5,
    "failed": 0,
    "results": [...]
  },
  "msg": "Batch detection completed"
}
```

**使用示例**:
```javascript
const batch = await post('/api/admin/detect/all')
```

---

### 19. 默认列表检测

**端点**: `POST /api/admin/detect/default`

**认证**: 需要

**响应**: 同批量检测

**使用示例**:
```javascript
const result = await post('/api/admin/detect/default')
```

---

## 历史记录接口

### 20. 获取历史记录

**端点**: `GET /api/admin/history`

**认证**: 需要

**查询参数**:
- `domain` - 域名（可选，默认 all）
- `page` - 页码（默认 1）
- `pageSize` - 每页数量（默认 20）
- `status` - 状态筛选（可选：ok, partial, no, error）

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  },
  "msg": "success"
}
```

**使用示例**:
```javascript
const history = await get('/api/admin/history', {
  domain: 'example.com',
  page: 1,
  pageSize: 50
})
```

---

### 21. 删除域名历史

**端点**: `DELETE /api/admin/history/:domain`

**认证**: 需要

**路径参数**:
- `domain` - 域名

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "domain": "example.com",
    "deleted": true
  },
  "msg": "History deleted"
}
```

**使用示例**:
```javascript
await del('/api/admin/history/example.com')
```

---

### 22. 清理所有历史

**端点**: `DELETE /api/admin/history`

**认证**: 需要

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "deleted": 150
  },
  "msg": "History cleanup completed"
}
```

**使用示例**:
```javascript
await del('/api/admin/history')
```

---

## 统计概览接口

### 23. 获取统计数据

**端点**: `GET /api/admin/stats`

**认证**: 需要

**响应**:
```javascript
{
  "code": 200,
  "data": {
    "overview": {
      "totalDomains": 10,
      "defaultDomains": 3,
      "historyDomains": 150,
      "cachedResults": 8
    },
    "today": {
      "requests": 1250,
      "rateLimitHits": 50,
      "rateLimitRate": "4.00%"
    },
    "config": {
      "refreshInterval": 43200,
      "refreshIntervalHuman": "12.0 hours",
      "historyRetention": 7,
      "rateLimit": {
        "windowMs": 60000,
        "maxRequests": 10
      }
    },
    "lastReset": "2026-06-08T00:00:00Z"
  },
  "msg": "success"
}
```

**使用示例**:
```javascript
const stats = await get('/api/admin/stats')
```

---

## 📝 使用注意事项

### 1. Token 管理

```javascript
// 登录时保存 Token
import { setToken } from '@/utils/api.js'
setToken(response.data.token)

// 退出时清除
import { clearToken } from '@/utils/api.js'
clearToken()

// 检查登录状态
import { getToken } from '@/utils/api.js'
const isLoggedIn = !!getToken()
```

### 2. 错误处理最佳实践

```javascript
import { APIError } from '@/utils/api.js'
import { show } from '@/components/Notification.js'

try {
  const result = await get('/api/admin/domains')
  // 处理成功
} catch (error) {
  if (error instanceof APIError) {
    // API 错误
    if (error.status === 401) {
      show.error('认证失败，请重新登录')
      // 跳转到登录页
    } else if (error.status === 403) {
      show.error('权限不足')
    } else if (error.status >= 500) {
      show.error('服务器错误，请稍后重试')
    } else {
      show.error(error.message)
    }
  } else {
    // 网络错误
    show.error('网络错误，请检查连接')
  }
}
```

### 3. 请求参数编码

```javascript
// 域名作为路径参数时需要 URL 编码
const domain = 'example.com'
await get(`/api/admin/history/${encodeURIComponent(domain)}`)
```

### 4. 批量操作

```javascript
// 批量检测所有域名
const batchResult = await post('/api/admin/detect/all')
console.log(`检测完成：${batchResult.data.success}/${batchResult.data.total}`)
```

---

## 🔗 相关文档

- [后端 API 文档](./subtask-05-domains-api.md)
- [API 错误处理规范](../04-skills/02-backend/api-response.md)
- [环境变量配置](./env-variables-guide.md)
