# 运维文档

**更新日期**: 2026-06-20

## 部署流程

### 前置准备

1. Cloudflare 账号
2. API Token (具备 Workers KV 和 Pages 权限)
3. 域名 (可选, 用于自定义域名)

### Worker 部署

```bash
# 1. 检查 wrangler.local.toml 存在
ls wrangler.local.toml

# 2. 部署 Worker (使用个人配置文件)
npx wrangler deploy --env production -c wrangler.local.toml

# 3. 验证部署
curl https://monitor-bk.inthub.top/health
```

### 生产部署命令模板

```bash
# CLOUDFLARE_API_TOKEN: 部署专用 (Wrangler CLI)
# ADMIN_API_TOKEN: 管理员登录专用

export CLOUDFLARE_API_TOKEN="cfat_xxx" && \
cp wrangler.toml wrangler.deploy.toml && \
sed -i "s/YOUR_PRODUCTION_KV_ID_HERE/<actual-kv-id>/g" wrangler.deploy.toml && \
npx wrangler deploy --env production -c wrangler.deploy.toml && \
rm -f wrangler.deploy.toml
```

### Pages 部署

```bash
# 1. 构建前端
cd frontend
npm install
npm run build

# 2. 部署 Pages
npx wrangler pages deploy dist/ --project-name=domain-monitor-frontend

# 3. 配置环境变量 (Dashboard → Pages → Settings)
# VITE_API_BASE_URL=https://monitor-bk.inthub.top
```

### Secret 管理

```bash
# 设置 Worker Secret
wrangler secret put CLOUDFLARE_API_TOKEN --env production
wrangler secret put ADMIN_API_TOKEN --env production
wrangler secret put ALLOWED_ORIGINS --env production

# 查看已设置的 Secret 列表
npx wrangler secret list --env production
```

---

## 监控告警

### Worker 指标

| 指标 | 来源 | 阈值 |
|------|------|------|
| 请求数/小时 | Cloudflare Dashboard → Workers → Analytics | > 10000 |
| 错误率 | Cloudflare Dashboard → Workers → Analytics | > 5% |
| CPU 时间/请求 | Workers Analytics | > 50ms |
| KV 存储使用率 | Dashboard → Workers → KV | > 80% |

### 日志监控

```bash
# 实时日志
npx wrangler tail --env production

# 过滤错误
npx wrangler tail --env production | grep -i error

# 过滤限流
npx wrangler tail --env production | grep "429"
```

### 健康检查

```bash
# 定期检查 Worker 健康状态
curl -s https://monitor-bk.inthub.top/health | jq .

# 期望响应: { "code": 200, "data": { "status": "ok" } }
```

---

## 备份恢复

### 数据备份

```bash
TOKEN="your-api-token"
BASE="https://monitor-bk.inthub.top"

# 备份域名列表
curl -s "$BASE/api/admin/domains" \
  -H "X-API-Token: $TOKEN" | jq .data > domains-backup-$(date +%Y%m%d).json

# 备份系统配置
curl -s "$BASE/api/admin/config" \
  -H "X-API-Token: $TOKEN" | jq .data > config-backup-$(date +%Y%m%d).json

# 备份历史记录 (近 30 天)
curl -s "$BASE/api/admin/history?days=30" \
  -H "X-API-Token: $TOKEN" | jq .data > history-backup-$(date +%Y%m%d).json
```

### 数据恢复

```bash
# 恢复域名列表 (逐条添加)
curl -X POST "$BASE/api/admin/domains" \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"domain\": \"example.com\"}"

# 恢复配置
curl -X PUT "$BASE/api/admin/config" \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "@config-backup-20260620.json"
```

---

## 故障排查

### Worker 返回 5xx / Health Check 失败

**排查步骤**:

1. 查看 Worker 实时日志定位错误
2. 检查 `wrangler.local.toml` 中的 KV ID 是否正确
3. 检查 Cloudflare API Token 权限

```bash
npx wrangler tail --env production | tail -20
```

### API 返回 401

**现象**: Admin API 返回 `{ code: 401, msg: "Invalid or missing API Token" }`

**排查**:
1. 确认请求头 `X-API-Token` 已携带
2. 确认 Token 与 Worker Secret `ADMIN_API_TOKEN` 一致
3. Secret 部署后需重新部署 Worker 才生效

```bash
# 验证 Token
curl -X POST https://monitor-bk.inthub.top/api/admin/auth/verify \
  -H "X-API-Token: $TOKEN"
```

### API 返回 429 (限流)

**现象**: `{ code: 429, msg: "Rate limit exceeded" }`

**排查**:
1. 确认请求频率是否超过 10 次/分钟
2. 管理员 API 携带有效 Token 可豁免限流
3. 限流计数按 IP + KV 持久化，窗口 60 秒

### 定时任务未执行

**现象**: 域名检测未按 12 小时间隔自动更新

**排查**:
1. 检查 `wrangler.toml` 或 `wrangler.local.toml` 中 `[triggers]` Cron 配置
2. 查看定时任务日志

```bash
npx wrangler tail --env production | grep -i "scheduled\|cron"
```

### 前端页面空白 / 路由不工作

**排查**:

1. 检查浏览器 Console 错误 (F12)
2. 确认 `VITE_API_BASE_URL` 指向正确的 Worker 地址
3. 检查 Network 面板 API 请求状态
4. 确认 localStorage 中 `api_token` 存在 (管理后台需要)

### KV 读写失败

**排查**:

1. 检查 Cloudflare Dashboard → Workers → KV → DOMAIN_MONITOR_KV 状态
2. 验证 binding 名称正确

```bash
# 本地测试
npx wrangler kv:key list --binding=DOMAIN_MONITOR_KV --local
```

---

## 性能优化

### 前端构建优化

Vite 已配置代码分割 (懒加载页面组件)，构建产物:
- 主入口: `index-*.js` (~9KB gzip)
- 管理后台: `AdminLayout-*.js` (~9KB)
- 各管理页面: 按需加载 (~2-10KB)

### 后端优化

- 域名并行检测 (并发度 5)
- KV 分布式限流 (避免重复计数)
- 缓存检测结果 (减少 DoH 请求)
- `fetchWithTimeout` 超时控制 (默认 15s)

### 限流配置调整

根据实际流量调整 (通过 API):

```bash
curl -X PUT https://monitor-bk.inthub.top/api/admin/config \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rateLimit": {"windowMs": 60000, "maxRequests": 20}}'
```

---

## 安全加固

### 定期更换 Token

**管理员登录 Token**:

```bash
# 1. 生成新的管理员密钥
# 2. 更新 Worker Secret
wrangler secret put ADMIN_API_TOKEN --env production
# 3. 重新部署
npx wrangler deploy --env production -c wrangler.local.toml
# 4. 通知管理员更新登录凭据
```

**部署 Token**:

```bash
# 1. Cloudflare Dashboard → 创建新 API Token
# 2. 更新 Worker Secret (仅 Wrangler CLI 使用)
wrangler secret put CLOUDFLARE_API_TOKEN --env production
# 3. 更新本地环境变量
```

### 安全审计检查

```bash
# 查看未授权访问尝试
npx wrangler tail --env production | grep -E "(401|403)"

# 查限流触犯
npx wrangler tail --env production | grep "429"
```

### 配置安全

- `wrangler.local.toml` 包含真实 KV ID 和 Account ID，已在 `.gitignore` 中排除
- `.dev.vars` 包含本地 Secret，已在 `.gitignore` 中排除
- 生产 Secret 通过 `wrangler secret put` 注入，不存储于文件中

---

## 当前部署信息

| 组件 | 地址 | 备注 |
|------|------|------|
| Worker API | `https://monitor-bk.inthub.top` | 生产环境 |
| 前端 Pages | `https://monitor-fn.inthub.top` | 生产环境 |
| Pages 别名 | `af9282d7.domain-monitor-frontend.pages.dev` | 测试分支用 |

## 相关文档

- [开发文档](development.md)
- [API 文档](api.md)
- [用户手册](user-guide.md)
- [部署流水线](../../.docs/DEPLOYMENT-PIPELINE.md)
- [配置文件说明](../../.docs/CONFIG-FILES-EXPLAINED.md)
