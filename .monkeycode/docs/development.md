# 开发文档

**更新日期**: 2026-06-20

## 开发环境搭建

### 前置要求

- Node.js >= 18.x
- npm >= 9.x
- Wrangler CLI (`npx wrangler`)
- Cloudflare 账号 (用于部署和 KV 绑定)

### 安装步骤

1. **安装 Node.js**

```bash
# 使用 nvm（推荐）
nvm install 18
nvm use 18
```

2. **安装项目依赖**

```bash
# 后端依赖
npm install

# 前端依赖
cd frontend && npm install && cd ..
```

3. **配置环境变量**

```bash
# 复制模板
cp .dev.vars.example .dev.vars

# 编辑 .dev.vars，填入：
# CLOUDFLARE_API_TOKEN=cfat_xxxxxx
# CLOUDFLARE_ACCOUNT_ID=your-account-id
```

4. **初始化 Git Submodules**

```bash
git submodule update --init --recursive --depth 1
```

### 启动开发环境

```bash
# 启动后端 Worker (端口 8787)
npx wrangler dev --port 8787

# 新终端，启动前端 (端口 5173)
cd frontend && npm run dev
```

访问地址：
- 前端: `http://localhost:5173`
- 后端 API: `http://localhost:8787`

## 项目结构

```
/workspace/
  src/                          # 后端 Cloudflare Worker 代码
    index.js                    # Worker 入口 (handleRequest + fetch 导出)
    config.js                   # 全局常量 (RATE_LIMIT, REQUEST_TIMEOUT 等)
    routes/
      index.js                  # 路由分发 + 限流 + 健康检查
      domains.js                # 域名管理 API (GET/POST/ADD/DELETE)
      detect.js                 # 域名检测 API (all/single)
      result.js                 # 检测结果查询 (all/single)
      admin/
        auth.js                 # Token 认证 (verify/logout)
        config.js               # 系统配置 CRUD
        detect.js               # 管理员检测 (single/all/default)
        doh.js                  # DoH 端点管理
        domains.js              # 域名管理 + 默认列表
        history.js              # 历史记录查询 + 清理
        stats.js                # 综合统计
        middleware.js           # withAdminAuth 中间件
      public/
        domains.js              # 公开域名列表
        stats.js                # 公开域名统计
    services/
      detector.js               # 域名特性检测 (HTTPS RR/ECH/IPv6)
      dns.js                    # DNS 解析服务
    scheduled/
      scheduler.js              # Cron 定时任务 (每 12 小时)
    storage/
      config.js                 # KV 配置持久化
      domains.js                # KV 域名列表管理
      history.js                # KV 历史记录管理
      stats.js                  # KV 计数器统计
      cache.js                  # KV 缓存
    middleware/
      cors.js                   # CORS 响应头
      rate-limit.js             # KV 分布式限流
      auth.js                   # Token 认证
    utils/
      response.js               # 统一响应格式工具
      validation.js             # 参数校验
  frontend/                     # 前端 Vite 项目
    src/
      main.js                   # 入口
      App.js                    # 根组件
      pages/                    # 页面组件 (class-based)
        PublicDashboard.js
        LoginPage.js
        NotFound.js
        admin/
          AdminLayout.js        # 管理后台布局 (Sidebar + Topbar)
          AdminDashboard.js
          AdminDomains.js
          AdminConfig.js
          AdminHistory.js
          AdminStats.js
      components/
        Header.js
        Footer.js
        StarryBackground.js
      router/
        index.js                # Hash 路由核心
        routes.js               # 路由表定义
        utils.js                # matchRoute / navigate / getQueryParams
      utils/
        api.js                  # API 请求封装 (fetchWithTimeout)
        storage.js              # localStorage 凭据管理
        styles.js               # 共享 CSS 样式
    tests/                      # 前端测试
    vite.config.js              # Vite 配置 (含 API 代理)
  tests/                        # 后端测试 (Node 原生 test runner)
  .monkeycode/                  # 项目文档和规格
    docs/                       # 交付物文档
    specs/                      # 功能规格历史
    MEMORY.md                   # 项目记忆
  .docs/                        # 任务跟踪文档
  .ai-ready/                    # Agent 规则文件
  wrangler.toml                 # Wrangler 公开配置
  wrangler.local.toml           # Wrangler 个人配置 (gitignore)
  package.json
```

## 开发流程

### 分支策略

```
main                        - 主分支 (生产)
YYMMDD-feat-xxxx            - 功能分支
YYMMDD-fix-xxxx             - 修复分支
```

### 提交流程

```bash
# 1. 创建功能分支
git checkout -b 260620-feat-add-export

# 2. 开发并验证
npm test                              # 后端测试
cd frontend && npm run build          # 前端构建验证

# 3. 提交
git add -A
git commit -m "feat: 添加历史记录导出功能"

# 4. 推送
git push -u origin 260620-feat-add-export
```

## 代码规范

### JSDoc 类型注释

所有公开函数必须包含 JSDoc：

```javascript
/**
 * 处理域名检测
 * @param {string} domain - 域名
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<import('../types.js').DomainResult>}
 */
async function detectDomain(domain, env) {
  // ...
}
```

### API 响应格式

所有 API 返回统一结构：

```javascript
// 成功
{ "code": 200, "data": { ... }, "msg": "success" }

// 错误
{ "code": 400, "data": null, "msg": "Invalid parameter" }
```

### 错误处理

```javascript
if (!domain) {
  return jsonResponse(null, 400, 'Invalid domain');
}
```

### 前端页面组件规范

所有页面组件遵循 class-based 生命周期：

| 方法 | 必需 | 说明 |
|------|------|------|
| `constructor()` | 是 | 初始化实例字段 |
| `init({ params, query })` | 推荐 | 异步加载数据 |
| `render()` | 是 | 返回 HTML 字符串 |
| `bindEvents()` | 推荐 | 绑定 DOM 事件 |
| `destroy()` | 推荐 | 清理事件和引用 |

## 后端开发

### 路由注册

在 `src/routes/index.js` 中按路径前缀分发：

```javascript
if (url.pathname.startsWith('/api/admin/detect/')) {
  return handleAdminDetect(request, env, ctx);
}
```

### 中间件

- `withAdminAuth(handler)` — Token 认证包装器，验证失败返回 401
- `rateLimit(request, env)` — KV 分布式限流，携带有效 Token 豁免

### 定时任务

在 `wrangler.toml` 中配置 Cron 触发：

```toml
[triggers]
crons = ["0 */12 * * *"]
```

## 调试技巧

### Wrangler 日志

```bash
# 开发环境实时日志
npx wrangler dev > wrangler.log 2>&1

# 生产环境日志
npx wrangler tail --env production
```

### KV 数据检查

```bash
# 查看所有 Keys (本地)
npx wrangler kv:key list --binding=DOMAIN_MONITOR_KV --local

# 查看特定 Key
npx wrangler kv:key get --binding=DOMAIN_MONITOR_KV --local "domain_list"

# 生产环境
npx wrangler kv:key list --binding=DOMAIN_MONITOR_KV --env production
```

### 前端调试

- Chrome DevTools → Network 查看 API 请求
- Console 查看组件日志 (前缀 `[App]`, `[AdminLayout]` 等)
- Application → Local Storage 查看 `domain_monitor_config` / `api_token`

## 常见问题

### Wrangler 启动失败

检查 Node.js >= 18 和 `wrangler.toml` 配置完整性。

### KV 读写失败

检查 KV binding 名称是否为 `DOMAIN_MONITOR_KV`，`wrangler.toml` 中的 `kv_namespaces` 配置。

### 前端 API 请求 404

Vite proxy 配置在 `frontend/vite.config.js` 中，确保 `/api` 代理到 `http://localhost:8787`。

### 前端路由 new 失败 (TypeError: n is not a constructor)

页面组件懒加载后需先 `await import(...)` 解析模块，再 `new Module.default()`，禁止直接 `new (await import(...))`。

## 相关文档

- [API 文档](api.md)
- [运维文档](operations.md)
- [用户手册](user-guide.md)
- [前端路由架构](../.docs/03-subtasks/frontend-router-architecture.md)
