# Cloudflare 域名监控平台

基于 Cloudflare Workers 的域名网络特性监控平台。

---

## 🚀 快速链接

| 类型 | 链接 |
|------|------|
| 📚 **文档索引** | [`.docs/README.md`](./.docs/README.md) |
| 📋 项目概述 | [`.docs/01-project/01-overview.md`](./.docs/01-project/01-overview.md) |
| 📝 任务清单 | [`.docs/01-project/05-tasklist.md`](./.docs/01-project/05-tasklist.md) |
| 📊 当前状态 | [`.docs/01-project/03-status.md`](./.docs/01-project/03-status.md) |
| 🛠️ Skills | [`.docs/04-skills/README.md`](./.docs/04-skills/README.md) |

---

## 📖 文档导航

完整的文档索引请查看：[📚 .docs/README.md](./.docs/README.md)

### 文档分类

- **项目文档** (`.docs/01-project/`) - 项目概述、需求、状态
- **任务总结** (`.docs/02-tasks/`) - 各任务完成总结
- **子任务文档** (`.docs/03-subtasks/`) - 详细实现文档
- **Skills** (`.docs/04-skills/`) - 可复用工作流
- **归档** (`.docs/99-archive/`) - 历史调试报告

---

## 🏗️ 项目结构

```
/workspace/
├── README.md           # 本文件
├── .docs/              # 项目文档 (新)
│   ├── 01-project/     # 项目文档
│   ├── 02-tasks/       # 任务总结
│   ├── 03-subtasks/    # 子任务文档
│   ├── 04-skills/      # Skills
│   └── 99-archive/     # 归档
├── src/                # Worker 源代码
├── frontend/           # 前端代码
├── tests/              # 测试
└── .opencode/          # opencode 配置和 Skills
```

---

## 🛠️ Skills

本项目包含 9 个可复用的 Skills：

### 前端 Skills
- `frontend-render-fix` - render undefined 修复
- `vite-env-injection` - 环境变量注入

### 后端 Skills
- `admin-api-404-debug` - API 404 调试
- `api-response` - API 响应格式
- `api-route` - API 路由实现
- `html-injection` - HTML 注入

### 工作流 Skills
- `subtask-doc` - 子任务文档生成
- `test-template` - 测试模板
- `workflow-audit` - 工作流审计

详细文档：[Skills 索引](./.docs/04-skills/README.md)

---

## 📊 项目状态

| 模块 | 进度 | 状态 |
|------|------|------|
| 后端 API | 100% | ✅ 完成 |
| 前端页面 | 100% | ✅ 完成 |
| 前后端联调 | 100% | ✅ 完成 |
| 单元测试 | 100% | ✅ 完成 (57 套件) |
| 部署配置 | 90% | 🟡 进行中 |
| 文档完善 | 80% | 🟡 进行中 |

详细状态：[`.docs/01-project/03-status.md`](./.docs/01-project/03-status.md)

---

## 📦 技术栈

### 后端
- **运行时**: Cloudflare Workers
- **语言**: JavaScript (JSDoc 类型注释)
- **存储**: Cloudflare KV
- **定时**: Cloudflare Cron Triggers

### 前端
- **框架**: Vite 5
- **样式**: Tailwind CSS 3
- **路由**: Hash 路由 (自定义)
- **组件**: 自定义组件库 (dm- 前缀)

### 工具
- **包管理**: npm
- **部署**: wrangler
- **测试**: 自定义测试运行器

---

## 📅 文档更新记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-06-08 | 文档整理 | 创建统一文档索引，整理 63 个文档 |
| 2026-06-08 | 新增 3 个 Skills | frontend-render-fix, admin-api-404-debug, vite-env-injection |

---

## 🔗 相关链接

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Vite 文档](https://vitejs.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)

---

**最后更新**: 2026-06-08
