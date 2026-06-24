# 环境变量配置指南

本文档说明项目的环境变量配置方式。

---

## 后端环境变量 (Worker)

### 通过 Wrangler Secret 注入（生产环境）

**必须通过命令行注入，不要写入配置文件**：

```bash
# 管理员登录 Token — 用户登录后台时填写的密码
wrangler secret put ADMIN_API_TOKEN --env production

# 允许的 CORS 来源（可选，默认 *）
wrangler secret put ALLOWED_ORIGINS --env production
```

### 通过 wrangler.toml 配置（KV 绑定）

```toml
[[kv_namespaces]]
binding = "DOMAIN_MONITOR_KV"
id = "YOUR_KV_ID_HERE"
```

### 开发环境配置

开发时使用 `.dev.vars` 文件（已加入 `.gitignore`）：

```bash
# .dev.vars
# CLOUDFLARE_API_TOKEN: wrangler CLI 部署凭证
CLOUDFLARE_API_TOKEN=cfat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# ADMIN_API_TOKEN: 管理员登录 Token
ADMIN_API_TOKEN=your_admin_token_here
ALLOWED_ORIGINS=*
```

---

## 前端环境变量 (Pages)

### 生产环境

创建 `frontend/.env.production` 文件：

```bash
# API 端点地址（自定义域名）
VITE_API_BASE_URL=https://your-worker.your-domain.workers.dev
```

**构建方式**：

```bash
cd frontend
npm run build
```

Vite 会自动读取 `.env.production` 并注入到打包后的代码中。

### 开发环境

创建 `frontend/.env` 或 `frontend/.env.local` 文件：

```bash
# 本地开发时使用 localhost
VITE_API_BASE_URL=http://localhost:8787
```

**启动开发服务器**：

```bash
cd frontend
npm run dev
```

---

## 环境变量说明

| 变量名 | 位置 | 说明 | 是否必须 |
|--------|------|------|----------|
| `CLOUDFLARE_API_TOKEN` | 本机环境变量 | wrangler CLI 部署凭证（cfat_xxx 格式） | ✅ 部署时需要 |
| `ADMIN_API_TOKEN` | Worker Secret | 管理员登录 Token，用户登录后台时填写 | ✅ 必须 |
| `ALLOWED_ORIGINS` | Worker Secret | CORS 允许的来源，默认 `*` | ❌ 可选 |
| `DOMAIN_MONITOR_KV` | Worker 绑定 | KV 命名空间 ID | ✅ 必须 |
| `VITE_API_BASE_URL` | 前端环境变量 | API 端点地址 | ✅ 必须 |

---

## 安全注意事项

1. **不要提交敏感信息到 Git**
   - `ADMIN_API_TOKEN` 必须通过 `wrangler secret put` 注入
   - `CLOUDFLARE_API_TOKEN` 仅用于本机 `wrangler` CLI，不要写入配置文件
   - `.dev.vars` 已加入 `.gitignore`
   - 个人配置文件 `wrangler.local.toml` 已加入 `.gitignore`

2. **生产环境配置**
   - 使用 `--env production` 指定生产环境
   - 配置具体的 `ALLOWED_ORIGINS` 而非 `*`

3. **前端 Token 管理**
   - 管理员 Token 通过 `localStorage` 存储
   - API 请求通过 `X-API-Token` 头传递
   - Token 不会提交到 Git 或构建产物

---

## 验证配置

### 后端验证

```bash
# 部署后测试健康检查
curl https://your-worker.your-domain.workers.dev/health

# 测试 API（需要 Token）
curl -H "X-API-Token: your_token" \
  https://your-worker.your-domain.workers.dev/api/admin/config
```

### 前端验证

```bash
# 构建后检查环境变量是否注入
npm run build
grep -r "your-worker.your-domain.workers.dev" dist/assets/
```

---

## 故障排查

### 后端 401 错误

检查 Secret 是否正确注入：

```bash
wrangler secret list -c wrangler.local.toml
```

### 前端 API 连接失败

检查环境变量是否正确：

```bash
# 开发环境
cat frontend/.env

# 生产环境构建
cat frontend/.env.production
```

---

## 相关文档

- [部署配置](./subtask-22-deployment-config.md)
- [运维手册](./运维手册.md)
