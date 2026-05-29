# Cloudflare Worker 域名监控平台 - 需求文档

## 项目概述

在现有 Worker API 基础上，开发一套现代化的前端 Dashboard，提供公开查询和管理后台两套界面。

**访问地址**: https://your-single.your-domain.pages.dev/

---

## 用户角色

### 1. 公开用户（无需登录）
- 查看默认域名列表的最新检测结果
- 查询单个域名的检测结果（受速率限制）
- 无法访问管理功能

### 2. 管理员（API Token 鉴权）
- 所有公开用户功能（无速率限制）
- 域名列表管理（CRUD）
- 配置检测频率和速率限制
- 查看和管理历史检测结果
- 配置 CORS 白名单（允许的前端域名）

### 3. 认证方式
- **Token 存储**：Worker 环境变量 `CLOUDFLARE_API_TOKEN`
- **CORS 白名单**：Worker 环境变量 `ALLOWED_ORIGINS`
- **前端登录**：管理员输入 API 端点 + Token，验证后保存到 localStorage

---

## 功能需求

### 一、公开页面（前端 Dashboard）

#### 1.1 默认域名检测结果展示
- **展示内容**：管理员配置的默认域名列表的最新检测结果
- **刷新频率**：管理员配置（默认 12 小时自动刷新）
- **展示字段**：
  - 域名
  - HTTPS RR 状态（✅/❌/⚠️）
  - ECH 状态（✅/❌/⚠️）
  - IPv6 状态（✅/❌/⚠️）
  - 最后检测时间
- **操作**：
  - 点击域名可查看详细结果
  - 手动刷新单个域名（计入限流）

#### 1.2 单域名查询
- **入口**：页面顶部搜索框
- **功能**：输入域名，即时检测并返回结果
- **限流**：10 次/分钟/IP（管理员可配置）
- **展示**：
  - 详细检测结果（HTTPS RR、ECH、IPv6）
  - 检测时间
  - 原始数据（可选展开）

#### 1.3 设计元素
- **风格**：现代 Dashboard
- **布局**：
  - Header：网站标题 + 搜索框 + 管理员登录入口
  - Main:
    - 默认域名卡片列表（网格布局）
    - 每个卡片显示域名 + 三个指标状态
  - Footer：简单版权信息
- **状态可视化**：
  - ok → ✅ 绿色
  - no → ❌ 红色
  - error → ⚠️ 黄色

---

### 二、管理后台（API Token 鉴权）

#### 2.1 登录方式
- **认证方式**：API Token（Worker 环境变量注入）
- **CORS 白名单**：Worker 环境变量 `ALLOWED_ORIGINS` 控制允许的前端域名
- **鉴权头**：`X-API-Token: <token>`
- **管理端点**：`/api/admin/*`
- **登录流程**：
  1. 管理员打开前端页面
  2. 点击"管理后台"进入登录页
  3. 输入：
     - API 端点地址（如 `https://domain-monitor.varhub.workers.dev`）
     - API Token
  4. 前端调用 `/api/admin/auth/verify` 验证
  5. 验证通过后保存到 `localStorage`
  6. 后续请求自动携带 token
- **登录入口**：公开页面右下角或 Header 的小图标

#### 2.2 域名管理
**路径**: `POST /api/admin/domains/*`

| 功能 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取所有域名 | GET | `/api/admin/domains` | 返回完整列表 |
| 添加域名 | POST | `/api/admin/domains` | `{"domain": "xxx"}` |
| 删除域名 | DELETE | `/api/admin/domains/:domain` | |
| 设为默认展示 | POST | `/api/admin/domains/:domain/default` | 加入默认展示列表 |
| 取消默认展示 | DELETE | `/api/admin/domains/:domain/default` | 从默认列表移除 |

#### 2.3 检测配置
**路径**: `GET/PUT /api/admin/config`

```json
{
  "defaultRefreshInterval": 43200,  // 默认域名刷新间隔（秒），默认 12 小时
  "rateLimit": {
    "windowMs": 60000,              // 限流窗口（毫秒），默认 60 秒
    "maxRequests": 10               // 每窗口最大请求数，默认 10 次
  },
  "historyRetention": 7,            // 历史记录保留天数，默认 7 天
  "defaultDomains": [               // 默认展示的域名列表
    "cloudflare.com",
    "google.com"
  ],
  "doh": {
    "primary": "https://cloudflare-dns.com/dns-query",    // 主 DoH 端点
    "backup": "https://dns.google/resolve"                // 备用 DoH 端点
  }
}
```

#### 2.3.1 DoH 端点测试
**路径**: `POST /api/admin/doh/test`

**请求**:
```json
{
  "url": "https://cloudflare-dns.com/dns-query",  // 要测试的 DoH 端点
  "type": "primary"  // 可选：primary | backup，仅用于标识
}
```

**返回**:
```json
{
  "success": true,
  "latency": 45,           // 响应时间（毫秒）
  "testDomain": "cloudflare.com",  // 测试用域名
  "result": {
    "https_rr": true,      // 是否能正常返回 HTTPS RR
    "ipv6": true           // 是否能正常返回 AAAA
  },
  "error": null
}
```

**功能说明**:
- 使用测试域名（如 `cloudflare.com`）执行一次完整的 DoH 查询
- 验证返回的 DNS 响应是否合法
- 记录响应时间
- 超时时间：5 秒

#### 2.4 检测操作
**路径**: `POST /api/admin/detect/*`

| 功能 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 检测单个域名 | POST | `/api/admin/detect/single` | `{"domain": "xxx"}` |
| 批量检测所有 | POST | `/api/admin/detect/all` | 检测域名列表全部 |
| 检测默认域名 | POST | `/api/admin/detect/default` | 仅检测默认展示列表 |

#### 2.5 历史记录
**路径**: `GET /api/admin/history`

| 参数 | 说明 |
|------|------|
| `domain` | 域名（可选，筛选特定域名） |
| `days` | 天数（可选，默认 7 天） |
| `limit` | 每域名返回记录数（可选，默认 10 条） |

**返回**:
```json
{
  "cloudflare.com": [
    {"timestamp": 1234567890, "https_rr": {...}, "ech": {...}, "ipv6": {...}},
    ...
  ],
  "google.com": [...]
}
```

#### 2.6 统计概览
**路径**: `GET /api/admin/stats`

```json
{
  "totalDomains": 10,          // 总域名数
  "defaultDomains": 5,         // 默认展示域名数
  "lastRefresh": 1234567890,   // 默认域名最后刷新时间
  "rateLimitHits": 42,         // 当日限流触发次数
  "todayRequests": 1234        // 今日总请求数
}
```

---

## API 端点汇总

### 公开端点（无需鉴权）

| 方法 | 路径 | 说明 | 限流 |
|------|------|------|------|
| GET | `/api/domains` | 获取默认域名列表 | ❌ |
| POST | `/api/result/single` | 查询单域名结果 | ✅ |
| POST | `/api/detect/single` | 单域名即时检测 | ✅ |

### 管理员端点（需 X-API-Token）

| 类别 | 端点 | 说明 |
|------|------|------|
| 认证 | `POST /api/admin/auth/verify` | 验证 Token 是否有效 |
| 认证 | `POST /api/admin/auth/logout` | 注销登录（可选） |
| 安全配置 | `GET /api/admin/config/security` | 查看当前安全配置（CORS 白名单等） |
| 域名管理 | `/api/admin/domains/*` | CRUD + 默认列表设置 |
| 检测配置 | `/api/admin/config` | GET/PUT 检测配置 |
| DoH 配置 | `/api/admin/doh` | GET/PUT DoH 端点 |
| DoH 测试 | `POST /api/admin/doh/test` | 测试 DoH 端点可用性 |
| 检测操作 | `/api/admin/detect/*` | 单域名/批量检测 |
| 历史记录 | `/api/admin/history` | 查询/清理历史记录 |
| 统计概览 | `/api/admin/stats` | 统计数据 |

---

## 技术需求

### 前端技术栈

**原则**：易于维护、利于 AI 生成代码

**推荐方案**：
- 纯 HTML + 原生 JS + Tailwind CSS（通过 CDN 引入）
- 或使用轻量框架：Preact / Alpine.js
- 不推荐使用：React/Vue（需要构建流程）

### 存储方案

#### 现有 KV 结构
```
domain_list → ["a.com", "b.com"]
default_domains → ["cloudflare.com", "google.com"]  // 新增
result:{domain} → {检测结果}  // 当前结果
history:{domain} → [{检测结果数组}]  // 新增：历史记录
config → {配置对象}  // 新增：配置存储
stats → {统计数据}  // 新增：统计数据
```

#### 变更记录
- 保留现有 `domain_list` 和 `result:` 前缀结构
- 新增 `default_domains` 存储默认展示列表
- 新增 `history:` 前缀存储历史记录
- 新增 `config` 存储配置
- 新增 `stats` 存储统计
- 更新 `config.doh` 存储 DoH 端点配置

### 部署方案

**推荐方案**：Pages（前端） + Worker（API）分离部署

**架构**：
- **前端**：Cloudflare Pages 托管静态 HTML/CSS/JS
- **后端**：Cloudflare Worker 纯 API 服务
- **域名**：前后端可分开域名（如 `your-single.your-domain.pages.dev` + `domain-monitor.varhub.workers.dev`）
- **鉴权**：前端登录时输入 API 端点 + Token，验证后保存到 localStorage

**优势**：
- 前后端完全解耦，独立开发部署
- 前端 Pages 自带 CDN 全球加速
- 前端可 instant deploy（无需 wrangler）
- Token 通过环境变量注入 Worker，不硬编码
- CORS 白名单通过环境变量控制，安全性高
- 一个前端可以连接多个后端实例

**环境变量（Worker 端）**：
```bash
# 通过 wrangler secret 注入
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put ALLOWED_ORIGINS
```

---

## 限流与配额

### 公开用户
- 单域名查询：10 次/分钟/IP（可配置）
- 默认域名列表：不限（管理员 12 小时刷新一次）

### 管理员
- 不限（通过 API Token 鉴权后解除限流）

### Cloudflare Worker 配额考虑
- 免费计划：每天 10 万次请求
- 假设公开查询 100 次/天，自动检测 50 次/天 → 充足

---

## 开发优先级

1. **Phase 1**：管理后台 API 端点
2. **Phase 2**：公开页面 Dashboard
3. **Phase 3**：管理员登录与鉴权
4. **Phase 4**：历史记录功能
5. **Phase 5**：统计与优化

---

## 验收标准

1. 公开页面：
   - ✅ 默认域名展示正常
   - ✅ 单域名查询功能可用
   - ✅ 限流生效
   - ✅ Dashboard 界面现代美观

2. 管理后台：
   - ✅ API Token 鉴权正常
   - ✅ 域名管理功能完整
   - ✅ 配置可修改生效
   - ✅ 历史记录可查询

---

## 附录：默认内置域名

代码内置的默认域名（管理员可覆盖）：

```javascript
const DEFAULT_BUILTIN_DOMAINS = [
  "cloudflare.com",
  "google.com",
  "facebook.com",
  "apple.com",
  "github.com"
];
```
