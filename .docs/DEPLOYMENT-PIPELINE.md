# 项目部署流程规划

**创建日期**: 2026-06-12  
**项目架构**: Cloudflare Worker (后端) + Cloudflare Pages (前端)  
**目标**: 建立清晰、自动化、可维护的部署流水线

---

## 📐 项目架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare 平台                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │   Cloudflare Pages   │    │   Cloudflare Worker      │  │
│  │   (前端静态托管)      │    │   (后端 API)              │  │
│  │                      │    │                          │  │
│  │  your-pages.your-domain.pages.dev  │───▶│  your-worker.your-domain.workers.dev  │  │
│  │                      │    │                                      │  │
│  │                      │    │                          │  │
│  │  dist/               │    │  src/index.js            │  │
│  │  - index.html        │    │  - Routes                │  │
│  │  - assets/*.js       │    │  - KV Storage            │  │
│  │  - assets/*.css      │    │  - Cron Triggers         │  │
│  └──────────────────────┘    └──────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

数据流：
用户 → Pages (前端) → API 请求 → Worker (后端) → KV/外部 API
```

---

## 🗂️ 配置文件结构

### 当前问题

```
❌ 配置分散
❌ 职责不清
❌ Token 缺失
❌ 流程混乱
```

### 优化后结构

```
workspace/
├── wrangler.toml              # Worker 配置（生产环境）
├── .dev.vars                  # Worker 本地开发（不提交）
├── .env.example               # 环境变量模板（提交）
│
├── frontend/
│   ├── wrangler.toml          # Pages 配置（新增）
│   ├── .env                   # Vite 开发/构建（不提交）
│   ├── .env.production        # Vite 生产构建（可选）
│   ├── .env.example           # Vite 环境变量模板（提交）
│   └── dist/                  # 构建输出（不提交）
│
├── .gitignore                 # Git 排除规则
└── DEPLOYMENT.md              # 部署指南（新增）
```

---

## 🔑 环境变量管理

### 分类管理

| 类型 | 变量 | 位置 | 提交 | 用途 |
|------|------|------|------|------|
| **前端公开** | `VITE_API_BASE_URL` | `.env` / `.env.example` | ✅ 模板 | 构建时注入 |
| **Worker 本地** | `ALLOWED_ORIGINS` | `.dev.vars` | ❌ | 本地开发 |
| **Worker 生产** | `ALLOWED_ORIGINS` | Wrangler Secrets | ❌ | 生产环境 |
| **API Token** | `CLOUDFLARE_API_TOKEN` | 环境变量 | ❌ | 部署凭证 |
| **Account ID** | `CLOUDFLARE_ACCOUNT_ID` | 环境变量 | ❌ | 账户标识 |
| **KV ID** | `DOMAIN_MONITOR_KV` | `wrangler.toml` | ✅ | KV 绑定 |

### 文件职责

```
┌─────────────────────────────────────────────────────────┐
│ 文件                  │ 提交 │ 用途        │ 敏感信息 │
├─────────────────────────────────────────────────────────┤
│ .env.example          │ ✅   │ 模板        │ ❌       │
│ .env                  │ ❌   │ 实际值      │ ⚠️       │
│ .dev.vars             │ ❌   │ 本地开发    │ ✅       │
│ wrangler.toml         │ ✅   │ Worker 配置（公开模板）│ ❌       │
│ frontend/wrangler.toml│ ✅   │ Pages 配置   | ❌       │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 部署流水线

### 三种部署方式对比

| 方式 | 自动化 | Token | 推荐场景 |
|------|--------|-------|----------|
| **方式 1: GitHub Actions** | ⭐⭐⭐ | 需要 | 团队开发 |
| **方式 2: wrangler CLI** | ⭐⭐ | 需要 | 本地部署 |
| **方式 3: Dashboard** | ⭐ | 无需 | 临时/快速 |

---

### 方式 1: GitHub Actions（推荐）

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy-worker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}

  deploy-pages:
    runs-on: ubuntu-latest
    needs: deploy-worker
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd frontend && npm ci && npm run build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          projectName: domain-monitor
          directory: frontend/dist
```

**优点**:
- ✅ 全自动部署
- ✅ 可追溯
- ✅ 团队协作友好

**缺点**:
- ❌ 需要配置 Secrets
- ❌ 需要 GitHub 仓库

---

### 方式 2: wrangler CLI

```bash
# 1. 设置环境变量（一次性）
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

# 2. 部署 Worker
wrangler deploy

# 3. 部署 Pages
cd frontend && npm run build
wrangler pages deploy dist/ --project-name=domain-monitor
```

**优点**:
- ✅ 快速
- ✅ 本地可控

**缺点**:
- ❌ 需要 Token
- ❌ 手动执行

---

### 方式 3: Cloudflare Dashboard

```
1. Worker 部署
   wrangler deploy --dry-run --outdir=worker-dist
   Dashboard → Workers → Upload

2. Pages 部署
   cd frontend && npm run build
   Dashboard → Pages → domain-monitor → Manual Deploy → Upload dist/
```

**优点**:
- ✅ 无需 Token
- ✅ 可视化

**缺点**:
- ❌ 手动操作
- ❌ 不可追溯

---

## 📋 部署检查清单

### 首次部署

- [ ] 创建 Cloudflare API Token
- [ ] 配置环境变量
- [ ] 创建 Pages 项目
- [ ] 配置自定义域名
- [ ] 设置 Wrangler Secrets

### 日常部署

- [ ] 代码测试通过
- [ ] 构建无错误
- [ ] 执行部署命令
- [ ] 验证功能正常

---

## 🔧 实施步骤

### 阶段 1: 配置文件整理（已完成）

- [x] 删除 `frontend/.env.production`（冗余）
- [x] 创建 `.env.example`（模板）→ `.dev.vars.example`
- [x] 创建 `frontend/.env.example`（模板）→ 使用 `frontend/.env`
- [x] 创建 `frontend/wrangler.toml`（Pages 配置）
- [x] 清理 `wrangler.toml` 冗余配置 → 公开模板 + `.local.toml` 方案
- [x] `wrangler.toml` 添加 `[env.production.vars]`（2026-06-18）

### 阶段 2: Token 配置（需要用户提供）

- [ ] 创建 Cloudflare API Token
- [ ] 更新 `.dev.vars`
- [ ] 配置 GitHub Secrets（如使用方式 1）

### 阶段 3: 自动化部署（可选）

- [ ] 创建 `.github/workflows/deploy.yml`
- [ ] 配置 GitHub Secrets
- [ ] 测试自动部署

### 阶段 4: 文档完善

- [ ] 更新 README.md
- [ ] 创建 DEPLOYMENT.md
- [ ] 记录故障排查

---

## 📊 部署流程图

```
┌─────────────────────────────────────────────────────────────┐
│                      开发流程                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  本地开发                                                   │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐            │
│  │ npm run │─────▶│ wrangler│─────▶│  本地   │            │
│  │   dev   │      │   dev   │      │  测试   │            │
│  └─────────┘      └─────────┘      └─────────┘            │
│       │                                    │               │
│       │                                    │               │
│       ▼                                    ▼               │
│  ┌─────────────────────────────────────────────────┐      │
│  │              Git Commit & Push                  │      │
│  └─────────────────────────────────────────────────┘      │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────┐      │
│  │            GitHub Actions (CI/CD)               │      │
│  │  ┌──────────────┐       ┌──────────────┐       │      │
│  │  │ Worker Deploy│       │ Pages Deploy │       │      │
│  │  └──────────────┘       └──────────────┘       │      │
│  └─────────────────────────────────────────────────┘      │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────┐      │
│  │              Cloudflare 生产环境                 │      │
│  │  your-worker.your-domain.workers.dev    your-pages.your-domain.pages.dev │      │
│  └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚠️ 故障排查

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| Token 无效 | Token 过期/权限不足 | 重新创建 Token |
| Pages 404 | 部署路径错误 | 检查 `pages_build_output_dir` |
| CORS 错误 | ALLOWED_ORIGINS 配置 | 更新 Wrangler Secrets |
| KV 未找到 | KV ID 错误 | 检查 wrangler.toml |

---

## 📝 维护笔记

- Token 每 90 天轮换一次
- 定期清理旧部署
- 监控错误日志
- 备份重要配置

---

**最后更新**: 2026-06-12  
**维护**: 项目管理员
