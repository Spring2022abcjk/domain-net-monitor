# 子任务 22：部署配置

**状态**: 🔴 未启动  
**优先级**: P0 (高)  
**预计工时**: 2-3 小时  
**创建日期**: 2026-06-06  
**更新日期**: 2026-06-06  
**前置依赖**: 任务 21（前后端联调）✅  

---

## 任务目标

完成生产环境部署配置，实现前后端分离部署到 Cloudflare Pages + Worker，确保生产环境安全稳定运行。

### 核心需求

1. **Wrangler 生产环境配置**: 配置 production 环境的 KV、Secrets、Cron Triggers
2. **Secret 注入**: 使用 `wrangler secret put` 注入敏感环境变量
3. **Pages 部署**: 配置前端构建和部署流程
4. **环境隔离**: 分离开发环境和生产环境配置
5. **部署验证**: 验证生产环境所有功能正常

---

## 子步骤

### 22.1 Wrangler 生产环境配置

**目标**: 配置 production 环境的 wrangler.toml

**步骤**:

1. **编辑 `wrangler.toml`**

```toml
# 现有配置保持不变
name = "domain-monitor"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
ALLOWED_ORIGINS = "*"

[dev]
port = 8787

[[kv_namespaces]]
binding = "DOMAIN_MONITOR_KV"
id = "YOUR_KV_ID_HERE"
preview_id = "YOUR_KV_ID_HERE"

[triggers]
crons = ["0 */12 * * *", "0 3 * * *"]

# 新增：生产环境配置
[env.production]
# 生产环境变量必须通过 Secret 注入
# wrangler secret put CLOUDFLARE_API_TOKEN --env production
# wrangler secret put ALLOWED_ORIGINS --env production

[[env.production.kv_namespaces]]
binding = "DOMAIN_MONITOR_KV"
id = "YOUR_KV_ID_HERE"

# 生产环境 Cron Triggers
[env.production.triggers]
crons = ["0 */12 * * *", "0 3 * * *"]
```

2. **验证配置**

```bash
# 验证 wrangler.toml 语法
npx wrangler deploy --dry-run
```

**验收标准**:
- [ ] wrangler.toml 包含 production 环境配置
- [ ] KV namespace 配置正确
- [ ] Cron triggers 配置正确
- [ ] dry-run 部署成功

---

### 22.2 Secret 注入

**目标**: 使用 `wrangler secret put` 注入生产环境变量

**步骤**:

1. **注入 API Token**

```bash
# 生产环境 API Token
wrangler secret put CLOUDFLARE_API_TOKEN --env production

# 输入：YOUR_CLOUDFLARE_API_TOKEN
```

2. **注入允许来源**

```bash
# 生产环境 CORS 白名单
wrangler secret put ALLOWED_ORIGINS --env production

# 输入：https://your-single.your-domain.pages.dev,https://domain-monitor.varhub.workers.dev
```

3. **验证 Secret**

```bash
# 列出所有 Secret
wrangler secret list --env production

# 预期输出:
# ┌──────────────────────┐
# │ CLOUDFLARE_API_TOKEN │
# │ ALLOWED_ORIGINS      │
# └──────────────────────┘
```

**验收标准**:
- [ ] CLOUDFLARE_API_TOKEN 已注入
- [ ] ALLOWED_ORIGINS 已注入
- [ ] Secret 列表显示两个变量
- [ ] Secret 不在代码中明文存储

---

### 22.3 Cloudflare Pages 部署

**目标**: 配置前端构建和部署流程

**步骤**:

1. **构建前端**

```bash
cd frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 验证输出
ls -la dist/
```

2. **创建 Pages 项目**

方式 A: 通过 Wrangler CLI

```bash
# 使用 wrangler 部署 Pages
npx wrangler pages deploy frontend/dist --project-name=domain-monitor-frontend
```

方式 B: 通过 Cloudflare Dashboard

- 访问 https://dash.cloudflare.com/?to=/:account/workers-and-pages/new
- 选择 "Pages" → "Manual Deploy"
- 上传 `frontend/dist` 目录
- 项目名称：`domain-monitor-frontend`

3. **配置环境变量**

在 Cloudflare Dashboard 中配置：

- Settings → Environment Variables → Production
- 添加变量：
  - `VITE_API_BASE_URL`: `https://domain-monitor.varhub.workers.dev`

4. **配置自定义域名（可选）**

- Settings → Custom Domains
- 添加：`your-single.your-domain.pages.dev`

**验收标准**:
- [ ] 前端成功构建
- [ ] Pages 项目创建成功
- [ ] 环境变量配置正确
- [ ] 自定义域名配置（如使用）
- [ ] 可访问前端页面

---

### 22.4 Worker 部署

**目标**: 部署 Worker 到 production 环境

**步骤**:

1. **部署 Worker**

```bash
cd /workspace

# 部署到 production 环境
npx wrangler deploy --env production

# 预期输出:
# Deploying Worker to production environment...
# Deployment complete!
# Worker URL: https://domain-monitor.varhub.workers.dev
```

2. **验证部署**

```bash
# 测试 Public API
curl https://domain-monitor.varhub.workers.dev/api/public/domains

# 测试 Admin API
curl -X POST https://domain-monitor.varhub.workers.dev/api/admin/auth/verify \
  -H "X-API-Token: YOUR_CLOUDFLARE_API_TOKEN"
```

3. **检查 Cron Triggers**

```bash
# 查看 Cron 配置
npx wrangler cron list --env production
```

**验收标准**:
- [ ] Worker 部署成功
- [ ] Public API 返回 200
- [ ] Admin API 返回 200（带 Token）
- [ ] Cron Triggers 配置正确

---

### 22.5 部署验证

**目标**: 全面验证生产环境功能

**步骤**:

1. **API 连通性测试**

```bash
BASE_URL="https://domain-monitor.varhub.workers.dev"
TOKEN="YOUR_CLOUDFLARE_API_TOKEN"

# Public API
echo "=== Public API ==="
curl -s "$BASE_URL/api/public/domains" | jq .

# Admin API
echo "=== Admin API ==="
curl -s -X POST "$BASE_URL/api/admin/auth/verify" \
  -H "X-API-Token: $TOKEN" | jq .

curl -s "$BASE_URL/api/admin/config" \
  -H "X-API-Token: $TOKEN" | jq .

curl -s "$BASE_URL/api/admin/domains" \
  -H "X-API-Token: $TOKEN" | jq .

curl -s "$BASE_URL/api/admin/stats" \
  -H "X-API-Token: $TOKEN" | jq .

curl -s "$BASE_URL/api/admin/history" \
  -H "X-API-Token: $TOKEN" | jq .
```

2. **前端页面测试**

```bash
# 访问前端页面
FRONTEND_URL="https://your-single.your-domain.pages.dev"

# 检查首页
curl -s -I "$FRONTEND_URL" | head -5

# 检查管理后台
curl -s -I "$FRONTEND_URL/#/login" | head -5
```

3. **CORS 验证**

```bash
# 测试 CORS 头
curl -s -I "$BASE_URL/api/public/domains" \
  -H "Origin: https://your-single.your-domain.pages.dev" | grep -i "access-control"
```

4. **手动触发定时任务**

```bash
# 手动触发检测任务
curl -X POST "$BASE_URL/cdn-cgi/handler/scheduled"

# 预期输出：Scheduled task started
```

**验收标准**:
- [ ] 所有 Public API 正常
- [ ] 所有 Admin API 正常
- [ ] 前端页面可访问
- [ ] CORS 配置正确
- [ ] 定时任务可手动触发
- [ ] 前后端联调正常

---

## 验收标准

### 必须项

- [ ] Worker 部署到 production 环境
- [ ] Pages 部署并可访问
- [ ] CLOUDFLARE_API_TOKEN 通过 Secret 注入
- [ ] ALLOWED_ORIGINS 通过 Secret 注入
- [ ] KV namespace 配置正确
- [ ] Cron triggers 配置正确
- [ ] 所有 API 端点正常工作
- [ ] 前端页面正常加载
- [ ] 认证流程正常
- [ ] CORS 配置正确

### 可选项

- [ ] 自定义域名配置
- [ ] HTTPS 自动证书
- [ ] 监控告警配置

---

## 交付物

### 配置文件

| 文件 | 说明 |
|------|------|
| `wrangler.toml` | 生产环境配置 |
| `frontend/dist/` | 前端构建输出 |
| `.env.production` | 前端环境变量（模板） |

### 文档

| 文档 | 说明 |
|------|------|
| `docs/deployment-guide.md` | 部署指南 |
| `docs/environment-setup.md` | 环境配置说明 |
| `docs/secrets-management.md` | Secret 管理指南 |

### 脚本

| 脚本 | 说明 |
|------|------|
| `scripts/deploy-production.sh` | 生产环境部署脚本 |
| `scripts/verify-deployment.sh` | 部署验证脚本 |

---

## 故障排查

### 问题 1: Secret 注入失败

**现象**: `wrangler secret put` 报错

**解决**:
```bash
# 确保已登录
npx wrangler login

# 重试
wrangler secret put CLOUDFLARE_API_TOKEN --env production
```

### 问题 2: Cron Triggers 未生效

**现象**: 定时任务未执行

**解决**:
```bash
# 检查 Cron 配置
npx wrangler cron list --env production

# 重新配置
npx wrangler deploy --env production
```

### 问题 3: CORS 错误

**现象**: 前端请求被浏览器拦截

**解决**:
```bash
# 检查 ALLOWED_ORIGINS 配置
wrangler secret list --env production

# 更新 CORS 白名单
wrangler secret put ALLOWED_ORIGINS --env production
```

---

## 安全注意事项

1. **Never commit secrets**: KV ID、API Token 等敏感信息不得提交到 git
2. **Use wrangler secret put**: 所有敏感变量必须通过 Secret 注入
3. **Enable .gitignore**: 确保 `.dev.vars`、`wrangler.toml` 已加入忽略
4. **Rotate secrets regularly**: 定期更换 API Token
5. **Monitor access logs**: 定期检查访问日志

---

## 相关文档

- [Wrangler 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Pages 部署指南](https://developers.cloudflare.com/pages/how-to/)
- [Secrets 管理](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

---

## 下一步

完成本任务后，执行：
1. **任务 24**: 定时检测验证
2. **任务 23**: 测试与优化
3. **任务 25**: 文档完善

---

**创建时间**: 2026-06-06  
**预计完成**: 2026-06-06  
**状态**: 🔴 待开始
