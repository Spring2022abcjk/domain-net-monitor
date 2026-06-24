# 用户指令记忆

## 格式

### 用户指令条目
[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [运维部署|构建方法|测试方法|排错调试|工作流协作|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息

## 条目

### 部署命令
- Date: 2026-06-23
- Context: Agent 在修复部署流程并整理文档时发现
- Category: 运维部署
- Instructions:
  - Worker 部署：`export CLOUDFLARE_API_TOKEN=cfat_xxx && npx wrangler deploy -c wrangler.local.toml`
  - Worker Secret 注入：`echo "token" | npx wrangler secret put ADMIN_API_TOKEN -c wrangler.local.toml`
  - Pages 构建：`cd frontend && VITE_API_BASE_URL=https://monitor-bk.inthub.top npm run build`
  - Pages 部署：`npx wrangler pages deploy frontend/dist --project-name=domain-monitor-frontend`
  - wrangler 不会自动读取 wrangler.local.toml，必须用 `-c wrangler.local.toml` 显式指定

### Token 体系
- Date: 2026-06-23
- Context: Agent 在检查 401 错误和文档时发现
- Category: 运维部署
- Instructions:
  - CLOUDFLARE_API_TOKEN = wrangler CLI 部署凭证（cfat_xxx 格式），设为本机环境变量
  - ADMIN_API_TOKEN = 管理员登录 Token，通过 wrangler secret put 注入 Worker，用户登录后台时填写
  - 旧代码 auth.js 有 `env.ADMIN_API_TOKEN || env.CLOUDFLARE_API_TOKEN` fallback，现已以 ADMIN_API_TOKEN 为准
  - 前端 VITE_API_BASE_URL 在构建时固化到 JS 产物中，改了 API 地址必须重新构建和部署

### Cron 触发器
- Date: 2026-06-23
- Context: Agent 在解决 Cron 限额冲突时发现
- Category: 运维部署
- Instructions:
  - 免费计划限制 5 个 Cron 触发器（全账号共享）
  - wrangler deploy 时如果报 10072 错误，说明限额已满
  - 域名路由可通过 Cloudflare API 动态切换，格式：`PUT /accounts/:id/workers/domains/records`
  - 多 Worker 实例（如 domain-monitor 和 domain-monitor-production）共享同一 KV，但各自独立 Cron

### 测试命令
- Date: 2026-06-23
- Context: Agent 在执行全量代码审查和测试时发现
- Category: 测试方法
- Instructions:
  - 后端测试：`npm test`（/workspace 下，534 个测试用例）
  - 前端测试：`node tests/index.js`（/workspace/frontend 下，60 个测试套件）
  - 前端构建：`cd frontend && npm run build`
