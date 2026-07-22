# Skills 文档索引

Skills 是可复用的工作流和操作手册 (playbook)，用于标准化常见任务。

---

## 📚 Skills 分类

| 分类 | 目录 | 文档数 | 说明 |
|------|------|--------|------|
| 🖥️ 前端 | [`01-frontend/`](./01-frontend/) | 2 | 前端组件、构建、部署 |
| 🔧 后端 | [`02-backend/`](./02-backend/) | 4 | API 实现、调试、响应格式 |
| 🔄 工作流 | [`03-workflow/`](./03-workflow/) | 3 | 文档生成、测试、审计 |

---

## 🖥️ 前端 Skills (01-frontend)

| Skill | 说明 | 触发场景 |
|-------|------|---------|
| [01-render-fix.md](./01-frontend/01-render-fix.md) | render undefined 修复 | 页面显示"undefined" |
| [02-env-injection.md](./01-frontend/02-env-injection.md) | 环境变量注入修复 | import.meta.env 为 undefined |

---

## 🔧 后端 Skills (02-backend)

| Skill | 说明 | 触发场景 |
|-------|------|---------|
| [01-api-404-debug.md](./02-backend/01-api-404-debug.md) | API 404 调试 | Admin API 返回 404 |
| [02-api-response.md](./02-backend/02-api-response.md) | API 响应格式规范 | 统一 API 响应格式 |
| [03-api-route.md](./02-backend/03-api-route.md) | API 路由实现模板 | 新增 API 端点 |
| [04-html-injection.md](./02-backend/04-html-injection.md) | HTML 注入方案 | 动态生成 HTML |

---

## 🔄 工作流 Skills (03-workflow)

| Skill | 说明 | 触发场景 |
|-------|------|---------|
| [01-subtask-doc.md](./03-workflow/01-subtask-doc.md) | 子任务文档生成 | 创建新子任务文档 |
| [02-test-template.md](./03-workflow/02-test-template.md) | 测试模板 | 编写测试用例 |
| [03-workflow-audit.md](./03-workflow/03-workflow-audit.md) | 工作流审计 | 定期复盘优化 |

---

## 🚀 使用方式

### 调用 Skill

在对话中直接使用 Skill 名称：

```
/frontend-render-fix
/admin-api-404-debug
/vite-env-injection-fix
/subtask-doc
```

### 创建新 Skill

1. 确认重复性工作流（至少出现 2 次）
2. 使用 `workflow-audit` Skill 分析
3. 使用 `subtask-doc` Skill 生成文档
4. 添加到对应分类目录
5. 更新本索引

---

## 📊 统计

- **总计**: 9 个 Skills
- **前端**: 2 个 (22%)
- **后端**: 4 个 (44%)
- **工作流**: 3 个 (33%)

---

## 📅 更新记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-06-08 | 创建索引 | 整理 9 个 Skills 到统一位置 |
| 2026-06-08 | 新增 3 个 | frontend-render-fix, admin-api-404-debug, vite-env-injection |

---

## 💡 文件存储说明

**源文件位置**: `.opencode/skills/`  
**文档位置**: `.docs/04-skills/` (通过软链接指向源文件)

**优势**:
- ✅ 单一数据源 (源文件)
- ✅ 配置使用源文件 (opencode.json)
- ✅ 文档索引用软链接 (方便查阅)
- ✅ 无需维护两份副本

