# API 文档

**更新日期**: 2026-06-20

**基础 URL**:
- 开发环境: `http://localhost:8787`
- 生产环境: `https://monitor-bk.inthub.top`

## 统一响应格式

所有 API 返回 JSON，结构如下：

```json
{
  "code": 200,
  "data": { ... },
  "msg": "success"
}
```

## 认证

所有 Admin API 需在请求头中携带 Token:

```
X-API-Token: <your-api-token>
```

Token 通过 Worker Secret (`ADMIN_API_TOKEN`，向后兼容 `CLOUDFLARE_API_TOKEN`) 进行常量时间比对，验证失败返回 401。

### 限流说明

- 未认证请求: 每 IP 每 60 秒最多 10 次
- Admin API (携带有效 Token): 豁免限流
- 限流超限返回: `{ code: 429, msg: "Rate limit exceeded. Try again later." }`

响应头:
- `X-RateLimit-Limit`: 窗口内最大请求数
- `X-RateLimit-Remaining`: 剩余可用次数
- `X-RateLimit-Window`: 窗口时长 (秒)

---

## 健康检查

### GET /health

无需认证，无限流豁免。

**响应**:

```json
{
  "code": 200,
  "data": { "status": "ok", "timestamp": "2026-06-20T12:00:00.000Z" },
  "msg": "OK"
}
```

---

## 公开 API

无需认证，受限于限流。

### GET /api/public/domains

获取所有被监控的域名列表及状态。

**响应**:

```json
{
  "code": 200,
  "data": {
    "domains": [
      {
        "domain": "cloudflare.com",
        "firstSeen": "2026-06-01T00:00:00.000Z",
        "lastChecked": "2026-06-20T12:00:00.000Z",
        "status": "online"
      }
    ],
    "count": 1
  },
  "msg": "success"
}
```

### GET /api/public/stats/:domain

获取指定域名的详细统计信息。

**路径参数**:
- `domain`: 域名，如 `cloudflare.com`

**响应**:

```json
{
  "code": 200,
  "data": {
    "domain": "cloudflare.com",
    "status": "online",
    "firstSeen": "2026-06-01T00:00:00.000Z",
    "lastChecked": "2026-06-20T12:00:00.000Z",
    "totalChecks": 40,
    "successCount": 38,
    "failureCount": 2,
    "successRate": "95.00%",
    "latestResults": [
      {
        "timestamp": "2026-06-20T12:00:00.000Z",
        "https_rr": { "status": "ok", "count": 2 },
        "ech": { "status": "ok", "value": true },
        "ipv6": { "status": "ok", "count": 3 }
      }
    ]
  },
  "msg": "success"
}
```

**错误码**:
- 404: 域名不存在

---

## 通用 API

无需认证，受限于限流。

### GET /api/domains

获取域名列表（纯数组）。

**响应**: `{ "code": 200, "data": ["cloudflare.com", "example.com"], "msg": "success" }`

### POST /api/domains

全量替换域名列表。

**请求体**: `{ "domains": ["cloudflare.com", "example.com"] }`

**响应**: `{ "code": 200, "data": { "count": 2 }, "msg": "success" }`

### POST /api/domains/add

添加域名。

**请求体**: `{ "domain": "example.com" }`

**响应**: `{ "domain": "example.com" }`

### POST /api/domains/delete

删除域名。

**请求体**: `{ "domain": "example.com" }`

**响应**: `{ "domain": "example.com" }`

---

## 检测 API

无需认证，受限于限流。返回域名网络特性检测结果。

### GET /api/detect/all | POST /api/detect/all

检测所有域名的 HTTPS RR / ECH / IPv6 特性。

**响应**: DomainResult 数组

```json
[
  {
    "domain": "cloudflare.com",
    "timestamp": 1700000000000,
    "https_rr": { "status": "ok", "details": ["...", "..."], "count": 2 },
    "ech": { "status": "ok", "value": true },
    "ipv6": { "status": "ok", "count": 3, "details": ["..."] }
  }
]
```

其中 `status` 取值: `ok` (完整支持) / `partial` (部分支持) / `no` (不支持) / `error` (检测失败)。

### POST /api/detect/single

检测单个域名。

**请求体**: `{ "domain": "example.com" }`

**响应**: 单个 DomainResult 对象。

---

## 结果查询 API

无需认证，查询已有缓存结果。

### GET /api/result/all

获取所有域名的最新缓存检测结果。

**响应**: DomainResult 数组。

### POST /api/result/single

获取单个域名的缓存结果。

**请求体**: `{ "domain": "example.com" }`

**响应**: DomainResult 对象，无缓存时 404。

---

## 管理员 API

需要认证 (`X-API-Token` 头)。有效 Token 豁免限流。

### 认证

#### POST /api/admin/auth/verify

验证当前 Token 有效性。

**响应**:

```json
{
  "code": 200,
  "data": { "valid": true, "message": "Token is valid" },
  "msg": "success"
}
```

**错误码**: 401 — Token 无效或缺失

#### POST /api/admin/auth/logout

无状态登出（提示前端清除认证凭据）。

**响应**: `{ "code": 200, "data": { "message": "Logout successful." } }`

---

### 配置管理

#### GET /api/admin/config

获取完整系统配置。

**响应**:

```json
{
  "code": 200,
  "data": {
    "defaultRefreshInterval": 43200,
    "historyRetention": 7,
    "rateLimit": { "windowMs": 60000, "maxRequests": 10 },
    "doh": {
      "primary": "https://cloudflare-dns.com/dns-query",
      "backup": "https://dns.google/resolve"
    },
    "defaultDomains": ["cloudflare.com"]
  }
}
```

#### PUT /api/admin/config

更新系统配置（与现有配置 merge）。

**请求体** (部分字段即可):

```json
{
  "defaultRefreshInterval": 86400,
  "historyRetention": 14,
  "rateLimit": { "maxRequests": 20 },
  "doh": { "primary": "https://dns.google/resolve" }
}
```

**验证规则**:
- `defaultRefreshInterval`: 正数 (秒)
- `rateLimit.windowMs`: 正数
- `rateLimit.maxRequests`: 正整数
- `historyRetention`: 正数 (天)
- `defaultDomains`: 字符串数组
- `doh.primary` / `doh.backup`: 有效 HTTPS URL

**响应**:
```json
{
  "code": 200,
  "data": { "success": true, "message": "Config updated", "config": { ... } },
  "msg": "Config updated"
}
```

**错误码**: 400 — 参数格式错误

#### GET /api/admin/config/security

获取安全相关配置。

**响应**:

```json
{
  "code": 200,
  "data": {
    "corsMode": "restricted",
    "allowedOrigins": ["*"],
    "rateLimit": { "windowMs": 60000, "maxRequests": 10 },
    "tokenConfigured": true
  }
}
```

---

### 域名管理

#### GET /api/admin/domains

获取所有被监控的域名。

**响应**:

```json
{
  "code": 200,
  "data": { "domains": ["cloudflare.com", "example.com"], "count": 2 }
}
```

#### POST /api/admin/domains

添加域名至监控列表。

**请求体**: `{ "domain": "example.com" }`

**响应**: `{ "success": true, "message": "Domain added", "domain": "example.com" }`

**错误码**: 400 — 域名格式错误; 409 — 域名已存在

#### DELETE /api/admin/domains/:domain

从监控列表中删除域名。

**响应**: `{ "success": true, "message": "Domain deleted", "domain": "example.com" }`

**错误码**: 404 — 域名不存在

#### POST /api/admin/domains/:domain/default

将域名添加到默认展示列表。

**响应**: `{ "success": true, "message": "Domain added to defaults", "domain": "example.com" }`

#### DELETE /api/admin/domains/:domain/default

从默认展示列表中移除域名。

**响应**: `{ "success": true, "domain": "example.com" }`

---

### DoH 配置

#### GET /api/admin/doh

获取当前 DoH 端点。

**响应**:

```json
{ "code": 200, "data": { "primary": "https://...", "backup": "https://..." } }
```

#### PUT /api/admin/doh

更新 DoH 配置。

**请求体**:

```json
{ "primary": "https://dns.google/resolve", "backup": "https://doh.opendns.com/dns-query" }
```

**验证**: URL 须为 HTTPS 且 hostname 包含点号。

**响应**: `{ "primary": "...", "backup": "..." }`

**错误码**: 400 — URL 格式错误

#### POST /api/admin/doh/test

测试 DoH 端点连通性。

**请求体**:

```json
{ "url": "https://cloudflare-dns.com/dns-query", "timeout": 5000 }
```

**响应**:

```json
{
  "code": 200,
  "data": {
    "url": "https://cloudflare-dns.com/dns-query",
    "success": true,
    "latency": 45,
    "message": "DoH endpoint confirmed"
  }
}
```

**错误码**: 400 — URL 格式错误; 503 — 端点不可用

---

### 管理员检测

#### POST /api/admin/detect/single

对单个域名执行检测并持久化结果。

**请求体**: `{ "domain": "example.com" }`

**响应**: 单个 DomainResult 对象。

#### POST /api/admin/detect/all

并行检测全部域名 (并发 5)。

**响应**:

```json
{
  "code": 200,
  "data": {
    "total": 10,
    "success": 9,
    "failed": 1,
    "results": [ ... ]
  }
}
```

#### POST /api/admin/detect/default

仅检测默认展示列表域名。

**响应**: 格式同 `/all`。

---

### 历史记录

#### GET /api/admin/history

查询历史检测记录。

**查询参数**:
- `domain` (可选): 过滤特定域名
- `days` (可选, 默认 7): 查询天数范围
- `limit` (可选, 默认 50): 每域名最多返回条数

**响应** (不带 domain):

```json
{
  "code": 200,
  "data": {
    "days": 7,
    "limit": 50,
    "totalDomains": 3,
    "totalCount": 120,
    "history": {
      "cloudflare.com": [
        {
          "timestamp": "2026-06-20T12:00:00.000Z",
          "https_rr": { "status": "ok" },
          "ech": { "status": "ok" },
          "ipv6": { "status": "ok" }
        }
      ]
    }
  }
}
```

#### DELETE /api/admin/history/:domain

删除指定域名的全部历史记录。

**响应**: 删除结果对象。

#### DELETE /api/admin/history

清理过期历史记录。

**查询参数**:
- `retentionDays` (可选, 默认 30): 保留天数

**响应**: 清理结果对象。

---

### 统计

#### GET /api/admin/stats

获取综合统计概览。

**响应**:

```json
{
  "code": 200,
  "data": {
    "overview": {
      "totalDomains": 10,
      "defaultDomains": 3,
      "historyDomains": 8,
      "cachedResults": 5
    },
    "today": {
      "requests": 500,
      "rateLimitHits": 12,
      "rateLimitRate": "2.40%"
    },
    "config": {
      "refreshInterval": 43200,
      "refreshIntervalHuman": "12.0 hours",
      "historyRetention": 7,
      "rateLimitWindow": 60,
      "rateLimitMax": 10
    },
    "lastReset": "2026-06-20T00:00:00.000Z"
  }
}
```

---

## 错误码汇总

| 错误码 | 说明 |
|-------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或 Token 无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 (如域名已存在) |
| 429 | 请求过于频繁 (限流) |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

## 检测结果状态说明

域名特性检测 (`DomainResult`) 中 `status` 字段:

| 值 | 含义 |
|----|------|
| `ok` | 完整支持该特性 |
| `partial` | 部分支持 |
| `no` | 不支持 |
| `error` | 检测过程出错 |

## 相关文档

- [开发文档](development.md)
- [运维文档](operations.md)
- [用户手册](user-guide.md)
