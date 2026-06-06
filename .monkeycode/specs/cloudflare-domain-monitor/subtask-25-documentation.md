# 子任务 25：文档完善

**状态**: 🔴 未启动  
**优先级**: P2 (低)  
**预计工时**: 1-2 小时  
**创建日期**: 2026-06-06  
**更新日期**: 2026-06-06  
**前置依赖**: 无  

---

## 任务目标

完善项目文档，便于后续维护、扩展和使用。

### 核心需求

1. **README**: 项目介绍和快速开始指南
2. **开发文档**: 开发环境搭建和代码规范
3. **API 文档**: 所有端点的详细说明
4. **运维文档**: 部署流程和故障排查

---

## 子步骤

### 25.1 README 更新

**目标**: 创建清晰完整的项目说明文档

**文件**: `README.md`

#### 内容大纲

```markdown
# 域名监控平台

基于 Cloudflare Workers 的域名网络特性自动化监控平台。

## 功能特性

- ✅ 域名状态监控（在线/离线/未知）
- ✅ 自动化定时检测（每 12 小时）
- ✅ DoH（DNS over HTTPS）查询
- ✅ 历史记录追踪
- ✅ 统计概览
- ✅ 管理后台
- ✅ 限流防护
- ✅ 响应时间统计

## 技术栈

- **后端**: Cloudflare Workers + KV
- **前端**: Vite + Vue 3 + Tailwind CSS
- **部署**: Cloudflare Pages + Worker
- **语言**: JavaScript (JSDoc 类型注释)

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install
cd frontend && npm install

# 配置环境变量
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，填入 API Token

# 启动后端
npx wrangler dev --port 8787

# 启动前端（新终端）
cd frontend && npm run dev

# 访问
# - 前端：http://localhost:5173
# - 后端 API: http://localhost:8787
```

### 生产环境

```bash
# 部署 Worker
npx wrangler deploy --env production

# 部署 Pages
cd frontend && npm run build
npx wrangler pages deploy dist/
```

## 项目结构

```
/workspace/
├── src/                     # 后端代码
│   ├── index.js            # Worker 入口
│   ├── routes/             # 路由处理
│   ├── scheduled/          # 定时任务
│   └── utils/              # 工具函数
├── frontend/                # 前端代码
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── components/     # UI 组件
│   │   └── router/         # 路由系统
│   └── tests/              # 前端测试
├── tests/                   # 后端测试
├── .monkeycode/            # 项目文档
└── wrangler.toml           # Wrangler 配置
```

## 主要 API

### Public API

- `GET /api/public/domains` - 获取域名列表
- `GET /api/public/stats/:domain` - 获取域名统计

### Admin API (需要认证)

- `POST /api/admin/auth/verify` - 验证 Token
- `GET /api/admin/domains` - 域名管理
- `PUT /api/admin/config` - 系统配置
- `GET /api/admin/stats` - 统计概览
- `GET /api/admin/history` - 历史记录

详见：`.monkeycode/docs/api.md`

## 测试

```bash
# 后端测试
npm test

# 前端测试
cd frontend && npm test
```

## 状态

![进度](https://img.shields.io/badge/进度 -89%25-blue)
![测试](https://img.shields.io/badge/测试 -1278%2B%20通过 -green)

## 许可证

MIT
```

**验收标准**:
- [ ] 项目介绍清晰
- [ ] 功能列表完整
- [ ] 技术栈说明
- [ ] 快速开始可用
- [ ] 项目结构清晰
- [ ] API 概览完整

---

### 25.2 开发文档

**目标**: 提供完整的开发环境搭建和编码规范

**文件**: `.monkeycode/docs/development.md`

#### 内容大纲

```markdown
# 开发文档

## 开发环境搭建

### 前置要求

- Node.js >= 18.x
- npm >= 9.x
- Wrangler CLI
- Cloudflare 账号

### 安装步骤

1. **安装 Node.js**

```bash
# 使用 nvm（推荐）
nvm install 18
nvm use 18

# 或直接安装
# macOS
brew install node@18

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **安装 Wrangler**

```bash
npm install -g wrangler

# 登录 Cloudflare
npx wrangler login
```

3. **克隆项目**

```bash
git clone <repo-url>
cd domain-monitor
npm install
cd frontend && npm install
```

4. **配置环境变量**

```bash
# 复制环境变量模板
cp .dev.vars.example .dev.vars

# 编辑 .dev.vars
nano .dev.vars

# 填入：
# CLOUDFLARE_API_TOKEN=<your-token>
# CLOUDFLARE_ACCOUNT_ID=<your-account-id>
```

## 开发流程

### 分支策略

```
main              - 主分支（生产环境）
feature/xxx       - 功能分支
fix/xxx           - 修复分支
release/v1.x.x    - 发布分支
```

### 提交流程

1. **创建分支**
```bash
git checkout -b <date>-feat-<description>
# 例：260606-feat-add-export
```

2. **提交代码**
```bash
git add .
git commit -m "feat: 添加历史记录导出功能"
```

3. **代码审查**
```bash
# 运行测试
npm test
cd frontend && npm test

# 预提交检查
./scripts/pre-commit-check.sh
```

4. **推送分支**
```bash
git push -u origin <branch-name>
```

## 代码规范

### JSDoc 类型注释

所有函数必须包含 JSDoc：

```javascript
/**
 * 处理域名检测
 * @param {string} domain - 域名
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<{status: string, responseTime: number}>}
 */
async function detectDomain(domain, env) {
  // ...
}
```

### API 响应格式

所有 API 必须返回统一格式：

```javascript
{
  "code": 200,
  "data": { ... },
  "msg": "success"
}
```

### 错误处理

```javascript
// 使用统一的错误处理
if (!domain) {
  return jsonResponse(null, 400, 'Invalid domain');
}
```

### 测试规范

```javascript
suite('detectDomain', () => {
  test('有效域名返回在线状态', async () => {
    const result = await detectDomain('cloudflare.com', env);
    expect(result.status).toBe('online');
  });
  
  test('无效域名返回离线状态', async () => {
    const result = await detectDomain('invalid.test', env);
    expect(result.status).toBe('offline');
  });
});
```

## 调试技巧

### Wrangler 日志

```bash
# 开发环境日志
npx wrangler dev > wrangler.log 2>&1

# 生产环境日志
npx wrangler tail --env production
```

### KV 数据检查

```bash
# 查看所有 Keys
npx wrangler kv:key list --binding=DOMAIN_MONITOR_KV

# 查看特定 Key
npx wrangler kv:key get --binding=DOMAIN_MONITOR_KV "domain_list"
```

### 前端调试

- Chrome DevTools → Network 查看 API 请求
- Console 查看错误日志
- Application → Local Storage 查看 Token

## 常见问题

### Q: Wrangler 启动失败

A: 检查 Node.js 版本和网络连接

### Q:  KV 读写失败

A: 检查 KV binding 配置和权限

### Q: 前端 API 请求失败

A: 检查 Vite proxy 配置和 CORS 设置

## 相关文档

- [API 文档](api.md)
- [运维文档](operations.md)
- [测试报告](../tests/e2e-report.md)
```

**验收标准**:
- [ ] 安装步骤完整
- [ ] 开发流程清晰
- [ ] 代码规范明确
- [ ] 调试技巧实用
- [ ] 常见问题覆盖

---

### 25.3 API 文档

**目标**: 提供所有 API 端点的详细说明

**文件**: `.monkeycode/docs/api.md`

#### 内容大纲

```markdown
# API 文档

**基础 URL**: 
- 开发环境：`http://localhost:8787`
- 生产环境：`https://domain-monitor.varhub.workers.dev`

## 认证

所有 Admin API 需要在请求头中携带 Token:

```
X-API-Token: <your-api-token>
```

### 认证流程

1. 登录页输入 Token
2. 调用 `POST /api/admin/auth/verify` 验证
3. 验证通过后保存 JWT 到 localStorage
4. 后续请求自动携带 Token

---

## Public API

无需认证即可访问。

### GET /api/public/domains

获取公开域名列表

**参数**: 无

**响应**:
```json
{
  "code": 200,
  "data": {
    "domains": [
      {
        "domain": "cloudflare.com",
        "firstSeen": "2026-06-01T00:00:00.000Z",
        "lastChecked": "2026-06-06T12:00:00.000Z",
        "status": "online",
        "responseTime": 45
      }
    ],
    "count": 1
  },
  "msg": "success"
}
```

**错误码**:
- 200: 成功

---

### GET /api/public/stats/:domain

获取指定域名统计

**参数**:
- `domain` (路径参数): 域名

**响应**:
```json
{
  "code": 200,
  "data": {
    "domain": "cloudflare.com",
    "totalChecks": 100,
    "successCount": 95,
    "failCount": 5,
    "successRate": "95.00%",
    "avgResponseTime": 42.5,
    "lastCheck": "2026-06-06T12:00:00.000Z"
  },
  "msg": "success"
}
```

**错误码**:
- 200: 成功
- 404: 域名不存在

---

## Admin API

需要认证。

### POST /api/admin/auth/verify

验证 Token

**参数**:
- `X-API-Token` (请求头): API Token
- `token` (请求体，可选): Token

**响应**:
```json
{
  "code": 200,
  "data": {
    "valid": true,
    "message": "Token is valid"
  },
  "msg": "success"
}
```

**错误码**:
- 200: Token 有效
- 401: Token 无效或缺失

---

### GET /api/admin/domains

获取所有域名

**参数**: 无

**响应**:
```json
{
  "code": 200,
  "data": {
    "domains": ["cloudflare.com", "example.com"],
    "count": 2
  },
  "msg": "success"
}
```

**错误码**:
- 200: 成功

---

### POST /api/admin/domains

添加域名

**参数**:
- `X-API-Token` (请求头): API Token
- `domain` (请求体): 域名
- `comment` (请求体，可选): 备注

**请求体**:
```json
{
  "domain": "example.com",
  "comment": "Example website"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "success": true,
    "message": "Domain added successfully"
  },
  "msg": "Domain added"
}
```

**错误码**:
- 200: 添加成功
- 400: 域名格式错误
- 409: 域名已存在
- 401: 未认证

---

### DELETE /api/admin/domains/:domain

删除域名

**参数**:
- `domain` (路径参数): 域名
- `X-API-Token` (请求头): API Token

**响应**:
```json
{
  "code": 200,
  "data": {
    "success": true,
    "message": "Domain deleted successfully"
  },
  "msg": "Domain deleted"
}
```

**错误码**:
- 200: 删除成功
- 404: 域名不存在
- 401: 未认证

---

### GET /api/admin/config

获取系统配置

**参数**:
- `X-API-Token` (请求头): API Token

**响应**:
```json
{
  "code": 200,
  "data": {
    "detectionInterval": 12,
    "historyRetention": 7,
    "historyMaxEntries": 100,
    "defaultDomains": ["cloudflare.com"],
    "rateLimit": {
      "windowMs": 60000,
      "maxRequests": 10
    },
    "doh": {
      "primary": "https://cloudflare-dns.com/dns-query",
      "backup": "https://dns.google/resolve"
    }
  },
  "msg": "success"
}
```

**错误码**:
- 200: 成功
- 401: 未认证

---

### PUT /api/admin/config

更新系统配置

**参数**:
- `X-API-Token` (请求头): API Token
- 配置项 (请求体)

**请求体**:
```json
{
  "detectionInterval": 24,
  "historyRetention": 14,
  "doh": {
    "primary": "https://dns.google/resolve"
  }
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "success": true,
    "message": "Config updated successfully"
  },
  "msg": "Config updated"
}
```

**错误码**:
- 200: 更新成功
- 400: 配置格式错误
- 401: 未认证

---

### GET /api/admin/stats

获取统计概览

**参数**:
- `X-API-Token` (请求头): API Token

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
      "requests": 1000,
      "rateLimitHits": 50,
      "rateLimitRate": "5.00%"
    },
    "config": {
      "refreshInterval": 43200,
      "refreshIntervalHuman": "12.0 hours",
      "historyRetention": 7
    },
    "lastReset": "2026-06-06T00:00:00.000Z"
  },
  "msg": "success"
}
```

**错误码**:
- 200: 成功
- 401: 未认证

---

### GET /api/admin/history

获取历史记录

**参数**:
- `X-API-Token` (请求头): API Token
- `domain` (查询参数，可选): 域名筛选
- `days` (查询参数，可选): 天数范围

**响应**:
```json
{
  "code": 200,
  "data": {
    "days": 7,
    "limit": 50,
    "totalDomains": 5,
    "totalCount": 100,
    "history": {
      "cloudflare.com": [
        {
          "timestamp": "2026-06-06T12:00:00.000Z",
          "status": "online",
          "responseTime": 45
        }
      ]
    }
  },
  "msg": "success"
}
```

**错误码**:
- 200: 成功
- 401: 未认证

---

### DELETE /api/admin/history

清理历史记录

**参数**:
- `X-API-Token` (请求头): API Token

**响应**:
```json
{
  "code": 200,
  "data": {
    "success": true,
    "message": "History cleaned successfully",
    "deletedCount": 50
  },
  "msg": "History cleaned"
}
```

**错误码**:
- 200: 清理成功
- 401: 未认证

---

### GET /api/admin/doh

获取 DoH 配置

**参数**:
- `X-API-Token` (请求头): API Token

**响应**:
```json
{
  "code": 200,
  "data": {
    "primary": "https://cloudflare-dns.com/dns-query",
    "backup": "https://dns.google/resolve"
  },
  "msg": "success"
}
```

**错误码**:
- 200: 成功
- 401: 未认证

---

### PUT /api/admin/doh

更新 DoH 配置

**参数**:
- `X-API-Token` (请求头): API Token
- `primary` (请求体): 主 DoH 端点
- `backup` (请求体): 备份 DoH 端点

**请求体**:
```json
{
  "primary": "https://dns.google/resolve",
  "backup": "https://doh.opendns.com/dns-query"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "success": true,
    "message": "DoH config updated successfully"
  },
  "msg": "DoH config updated"
}
```

**错误码**:
- 200: 更新成功
- 400: URL 格式错误
- 401: 未认证

---

### POST /api/admin/doh/test

测试 DoH 端点

**参数**:
- `X-API-Token` (请求头): API Token
- `url` (请求体): DoH 端点 URL

**请求体**:
```json
{
  "url": "https://cloudflare-dns.com/dns-query"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "success": true,
    "latency": 45,
    "message": "DoH endpoint is available"
  },
  "msg": "DoH test completed"
}
```

**错误码**:
- 200: 测试成功
- 400: URL 格式错误
- 503: 端点不可用
- 401: 未认证

---

## 错误码汇总

| 错误码 | 说明 |
|-------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或 Token 无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如域名已存在） |
| 429 | 请求过于频繁（限流） |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

## 限流说明

- Public API: 10 请求/分钟
- Admin API: 不限流（需认证）
- 限流响应码：429

## 相关文档

- [开发文档](development.md)
- [运维文档](operations.md)
- [用户手册](user-guide.md)
```

**验收标准**:
- [ ] 所有 API 端点文档完整
- [ ] 请求参数说明清晰
- [ ] 响应示例完整
- [ ] 错误码说明完整
- [ ] 示例可运行

---

### 25.4 运维文档

**目标**: 提供部署流程和运维指南

**文件**: `.monkeycode/docs/operations.md`

#### 内容大纲

```markdown
# 运维文档

## 部署流程

### 前置准备

1. Cloudflare 账号
2. API Token（访问 Cloudflare API）
3. 域名（可选，用于自定义域名）

### Worker 部署

```bash
# 1. 登录 Wrangler
npx wrangler login

# 2. 配置生产环境 Secret
wrangler secret put CLOUDFLARE_API_TOKEN --env production
wrangler secret put ALLOWED_ORIGINS --env production

# 3. 部署 Worker
npx wrangler deploy --env production

# 4. 验证部署
curl https://domain-monitor.varhub.workers.dev/api/public/domains
```

### Pages 部署

```bash
# 1. 构建前端
cd frontend
npm install
npm run build

# 2. 部署 Pages
npx wrangler pages deploy dist/ --project-name=domain-monitor-frontend

# 3. 配置环境变量
# Dashboard → Pages → domain-monitor-frontend → Settings → Environment Variables
# 添加：VITE_API_BASE_URL=https://domain-monitor.varhub.workers.dev
```

### 自定义域名（可选）

```bash
# Worker
wrangler domain attach domain-monitor.varhub.workers.dev your-single.your-domain.pages.dev

# Pages
# Dashboard → Pages → Custom Domains → Add domain
```

## 监控告警

### 指标监控

1. **Worker 请求数**
   - Cloudflare Dashboard → Workers → domain-monitor → Analytics
   - 告警阈值：> 10000/小时

2. **KV 使用量**
   - Dashboard → Workers → KV → 查看存储使用量
   - 告警阈值：> 80%

3. **错误率**
   - Dashboard → Workers → Analytics → 查看错误率
   - 告警阈值：> 5%

### 日志监控

```bash
# 实时日志
npx wrangler tail --env production

# 过滤错误日志
npx wrangler tail --env production | grep ERROR
```

## 备份恢复

### KV 备份

```bash
# 备份域名列表
curl -s https://domain-monitor.varhub.workers.dev/api/admin/domains \
  -H "X-API-Token: $TOKEN" | jq .data.domains > domains-backup.json

# 备份配置
curl -s https://domain-monitor.varhub.workers.dev/api/admin/config \
  -H "X-API-Token: $TOKEN" | jq .data > config-backup.json

# 备份历史记录
curl -s "https://domain-monitor.varhub.workers.dev/api/admin/history?days=30" \
  -H "X-API-Token: $TOKEN" | jq .data > history-backup.json
```

### KV 恢复

```bash
# 恢复域名列表（手动通过 API）
curl -X POST https://domain-monitor.varhub.workers.dev/api/admin/domains \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "@domains-backup.json"
```

## 故障排查

### API 返回 401

**现象**: Admin API 返回 401

**排查步骤**:
1. 检查 Token 是否正确
2. 检查 `X-API-Token` 请求头
3. 验证 Secret 注入

```bash
# 验证 Token
curl -X POST https://domain-monitor.varhub.workers.dev/api/admin/auth/verify \
  -H "X-API-Token: $TOKEN"
```

### 定时任务未执行

**现象**: 定时任务未按预期执行

**排查步骤**:
1. 检查 Cron 配置
2. 检查 Worker 日志
3. 手动触发验证

```bash
# 检查 Cron
npx wrangler cron list --env production

# 查看日志
npx wrangler tail --env production | grep Scheduled

# 手动触发
curl -X POST https://domain-monitor.varhub.workers.dev/cdn-cgi/handler/scheduled
```

### KV 读写失败

**现象**: KV 读写操作失败

**排查步骤**:
1. 检查 KV binding
2. 检查 KV 权限
3. 验证 KV ID

```bash
# 检查 binding
cat wrangler.toml | grep -A 3 "kv_namespaces"

# 测试 KV
npx wrangler kv:key get --binding=DOMAIN_MONITOR_KV "domain_list"
```

### 前端无法连接后端

**现象**: 前端请求被拦截或 404

**排查步骤**:
1. 检查 CORS 配置
2. 检查 API 端点配置
3. 验证浏览器 Console

```bash
# 测试 CORS
curl -I https://domain-monitor.varhub.workers.dev/api/public/domains \
  -H "Origin: https://your-single.your-domain.pages.dev" | grep -i "access-control"
```

## 性能优化

### KV 查询优化

- 减少 KV 读取频率
- 使用缓存
- 批量操作

### 限流配置调整

根据实际流量调整：

```bash
# 更新限流配置
curl -X PUT https://domain-monitor.varhub.workers.dev/api/admin/config \
  -H "X-API-Token: $TOKEN" \
  -d '{"rateLimit":{"windowMs":60000,"maxRequests":20}}'
```

## 安全加固

### 定期更换 Token

```bash
# 1. 在 Cloudflare Dashboard 创建新 Token
# 2. 更新 Secret
wrangler secret put CLOUDFLARE_API_TOKEN --env production

# 3. 通知管理员更新登录 Token
```

### 检查访问日志

```bash
# 查看访问日志
npx wrangler tail --env production | grep -E "(401|403|429)"
```

## 相关文档

- [开发文档](development.md)
- [API 文档](api.md)
- [用户手册](user-guide.md)
```

**验收标准**:
- [ ] 部署流程清晰
- [ ] 监控指标完整
- [ ] 备份恢复步骤可行
- [ ] 故障排查步骤实用
- [ ] 性能优化建议有效

---

## 验收标准

### README

- [ ] 项目介绍清晰
- [ ] 功能列表完整
- [ ] 快速开始可用
- [ ] 技术栈说明
- [ ] 项目结构清晰

### 开发文档

- [ ] 安装步骤完整
- [ ] 开发流程清晰
- [ ] 代码规范明确
- [ ] 调试技巧实用
- [ ] 常见问题覆盖

### API 文档

- [ ] 所有端点文档完整
- [ ] 请求参数说明
- [ ] 响应示例完整
- [ ] 错误码汇总
- [ ] 示例可运行

### 运维文档

- [ ] 部署流程完整
- [ ] 监控指标明确
- [ ] 备份恢复可行
- [ ] 故障排查实用
- [ ] 安全加固建议

---

## 交付物

| 文件 | 说明 |
|------|------|
| `README.md` | 项目主文档 |
| `.monkeycode/docs/development.md` | 开发文档 |
| `.monkeycode/docs/api.md` | API 文档 |
| `.monkeycode/docs/user-guide.md` | 用户手册 |
| `.monkeycode/docs/operations.md` | 运维文档 |

---

## 文档检查清单

创建完成后逐项检查：

- [ ] 所有链接有效
- [ ] 代码示例可运行
- [ ] 截图清晰（如有）
- [ ] 术语一致
- [ ] 格式统一
- [ ] 拼写检查通过
- [ ] 最后更新日期

---

**创建时间**: 2026-06-06  
**预计完成**: 2026-06-06  
**状态**: 🔴 待开始
