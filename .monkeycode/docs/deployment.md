# 部署指南

**更新日期**: 2026-06-23

本文档涵盖从零开始的完整部署流程，以及日常二次部署和维护操作。

---

## Token 体系（先理解，再动手）

项目涉及 **三个不同用途的 Token**：

| Token | 存储位置 | 用途 | 谁需要知道 |
|-------|---------|------|-----------|
| `CLOUDFLARE_API_TOKEN` | 本机环境变量 | wrangler CLI 部署凭证 | 开发者 |
| `ADMIN_API_TOKEN` | Worker Secret | 管理员登录后台 | 管理员 |
| `VITE_API_BASE_URL` | Pages 环境变量 | 前端知道去哪找后端 | 前端构建 |

**容易搞混的点**：旧版代码中 `CLOUDFLARE_API_TOKEN` 曾兼任管理员登录（`auth.js` 有 `env.CLOUDFLARE_API_TOKEN` fallback）。自 6 月 17 日起已分离为两个独立变量，管理员登录只认 `ADMIN_API_TOKEN`。

---

## 一、准备工作

### 1.1 创建 Cloudflare API Token

访问 https://dash.cloudflare.com/profile/api-tokens → 创建 Token → 自定义：

- **权限**：Account → Workers Scripts → Edit
- **权限**：Account → Workers KV Storage → Edit
- **权限**：Account → Cloudflare Pages → Edit
- **账户资源**：Include → 你的账户

生成的 Token 格式为 `cfat_xxx`，这就是 `CLOUDFLARE_API_TOKEN`。

### 1.2 创建 KV 命名空间

```bash
npx wrangler kv:namespace create DOMAIN_MONITOR_KV
```

记录输出的 `id`，后续填入配置文件。

### 1.3 准备配置文件

从模板创建个人配置（不提交到 git）：

```bash
# Worker 个人配置
cp wrangler.toml wrangler.local.toml
# 在 wrangler.local.toml 中填入真实的 KV ID（替换两处 YOUR_KV_ID_HERE）

# 本地开发变量
cp .dev.vars.example .dev.vars
# 在 .dev.vars 中填入 CLOUDFLARE_API_TOKEN 和 ADMIN_API_TOKEN
```

`.dev.vars` 内容参考：

```bash
# 部署凭证 — wrangler CLI 用
CLOUDFLARE_API_TOKEN=cfat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 管理员登录 — 用户登录后台时输入的密码
ADMIN_API_TOKEN=your_admin_token_here
```

---

## 二、首次部署

### 2.1 部署 Worker（后端）

`wrangler deploy` 不会自动读取 `wrangler.local.toml`，必须用 `-c` 显式指定：

```bash
# 设置部署凭证
export CLOUDFLARE_API_TOKEN=cfat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 注入管理员登录 Token
echo "your_admin_token" | npx wrangler secret put ADMIN_API_TOKEN -c wrangler.local.toml

# 部署（个人配置文件包含真实 KV ID）
npx wrangler deploy -c wrangler.local.toml
```

### 2.2 部署 Pages（前端）

```bash
# 构建（生产环境 API 地址）
cd frontend
VITE_API_BASE_URL=https://your-worker-domain.workers.dev npm run build

# 部署
npx wrangler pages deploy dist/ --project-name=domain-monitor-frontend
```

首次部署需要先在 Cloudflare Dashboard → Workers & Pages → Pages → 创建项目 → `domain-monitor-frontend`。

---

## 三、二次部署（日常更新）

### 3.1 更新 Worker

```bash
export CLOUDFLARE_API_TOKEN=cfat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
npx wrangler deploy -c wrangler.local.toml
```

Worker Secret（如 `ADMIN_API_TOKEN`）是一次性配置，不需要每次部署重复注入。

### 3.2 更新 Pages

```bash
cd frontend
VITE_API_BASE_URL=https://monitor-bk.inthub.top npm run build
npx wrangler pages deploy dist/ --project-name=domain-monitor-frontend
```

---

## 四、Cron 触发器

### 4.1 配置

`wrangler.toml` 中定义了两个定时任务（UTC 时间）：

```toml
[triggers]
crons = [
  "0 */12 * * *",  # 每 12 小时检测默认域名（UTC 0:00, 12:00 = 北京时间 8:00, 20:00）
  "0 3 * * *"      # 每天清理过期历史（UTC 3:00 = 北京时间 11:00）
]
```

### 4.2 限额

Cloudflare 免费计划限制：每个账号最多 **5 个 Cron 触发器**。本项目的 2 个触发器计入此限额。

如果 `wrangler deploy` 报错 `10072: exceeded the limit of 5 cron triggers`：
- 检查是否有其他 Worker 占用了 Cron 配额
- 删除不再需要的 Worker 或移除其 Cron 配置

### 4.3 查看当前 Cron 使用情况

```bash
# 列出所有 Worker
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts" \
  | python3 -c "import sys,json; [print(d['id']) for d in json.load(sys.stdin)['result'] if 'scheduled' in d.get('handlers',[])]"

# 查看某个 Worker 的 Cron
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME/schedules"
```

---

## 五、域名路由

### 5.1 当前配置

| 域名 | 路由到 |
|------|-------|
| `monitor-fn.inthub.top` | Cloudflare Pages (`domain-monitor-frontend`) |
| `monitor-bk.inthub.top` | Cloudflare Worker (`domain-monitor`) |

### 5.2 切换 Worker 域名路由

如果域名指向了错误的 Worker（例如旧的 `domain-monitor-production`），通过 API 切换到正确的 Worker：

```bash
curl -s -X PUT \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/domains/records" \
  -d '{
    "hostname": "monitor-bk.inthub.top",
    "service": "domain-monitor",
    "environment": "production",
    "zone_id": "YOUR_ZONE_ID",
    "override_existing_origin": true
  }'
```

多 Worker 实例的场景：
- 每次 `wrangler deploy --env production` 会创建一个名为 `<name>-production` 的独立 Worker
- 确保域名只路由到其中一个，避免 API 请求打到旧代码
- 确认稳定后删除不再使用的 Worker 实例

---

## 六、故障排查

### 6.1 前端 401 Unauthorized

**原因**：Worker 缺少 `ADMIN_API_TOKEN` Secret。

**验证**：

```bash
# 直接测试 API
curl https://monitor-bk.inthub.top/api/admin/config \
  -H "X-API-Token: your_admin_token"
```

如果返回 200，Token 正确。如果 401，注入 Secret：

```bash
echo "your_admin_token" | npx wrangler secret put ADMIN_API_TOKEN -c wrangler.local.toml
```

### 6.2 wrangler deploy 提示 "token not set"

Wrangler CLI 需要 `CLOUDFLARE_API_TOKEN` 环境变量：

```bash
export CLOUDFLARE_API_TOKEN=cfat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 6.3 前端页面空白 / API 请求失败

检查 `VITE_API_BASE_URL` 是否正确注入（前端构建时固化）。

### 6.4 Cron 未按时执行

- 确认 `wrangler deploy` 日志中有 `Deployed xxx triggers` 的输出
- 检查 Cloudflare Dashboard → Workers → domain-monitor → Triggers 标签页
- Cron 时间是 UTC，北京时间 = UTC + 8

---

## 七、配置文件速查

| 文件 | 是否提交 | 用途 |
|------|---------|------|
| `wrangler.toml` | 是 | Worker 公开模板（占位符） |
| `wrangler.local.toml` | 否 | Worker 个人配置（真实 KV ID） |
| `.dev.vars` | 否 | 本地开发环境变量 |
| `.dev.vars.example` | 是 | 本地开发模板 |
| `frontend/wrangler.toml` | 是 | Pages 公开模板 |
| `frontend/wrangler.local.toml` | 否 | Pages 个人配置 |
| `src/middleware/auth.js` | 是 | 认证逻辑（参考 ADMIN_API_TOKEN 检查方式） |
