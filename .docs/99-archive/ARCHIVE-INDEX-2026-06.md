# 文档归档索引

**归档日期**: 2026-06-10  
**归档原因**: 整理项目文档，将过程性和临时性文档移至归档目录

---

## 归档目录结构

```
99-archive/
├── ARCHIVE-INDEX-2026-06.md      # 本索引文件
├── 2026-06-process/               # 过程报告文档
│   ├── CODE-REVIEW-2026-06-08.md  # 单次代码评审报告
│   ├── DOCUMENT-ORGANIZATION-REPORT.md  # 文档整理报告
│   └── PATH-MAPPING.md            # 路径映射调试文档
├── 2026-06-special-actions/       # 专项行动过程文档
│   ├── ROUTING-SPECIAL-ACTION.md  # 路由专项行动主文档
│   ├── ROUTING-SPECIAL-ACTION-INDEX.md  # 专项行动索引
│   ├── subtask-01-code-review.md  # 子任务 1：代码审查
│   ├── subtask-02-code-refactoring.md  # 子任务 2：代码重构
│   ├── subtask-03-testing.md      # 子任务 3：测试验证
│   └── subtask-04-documentation.md  # 子任务 4：文档编写
└── debug-reports/                 # 调试报告（原有）
```

---

## 前端临时文档归档

```
frontend/.docs-archive/
└── INTERNAL-FUNCTION-DOCS.md      # 前端内部函数参数文档（不提交到 git）
```

---

## 归档说明

### 2026-06-process/ - 过程报告文档

| 文件 | 说明 | 归档原因 |
|------|------|----------|
| CODE-REVIEW-2026-06-08.md | 单次代码评审报告 | 已整合到最终代码 |
| DOCUMENT-ORGANIZATION-REPORT.md | 文档整理报告 | 任务已完成，报告过时 |
| PATH-MAPPING.md | 路径映射调试文档 | 调试完成，不再需要 |

### 2026-06-special-actions/ - 专项行动文档

| 文件 | 说明 | 归档原因 |
|------|------|----------|
| ROUTING-SPECIAL-ACTION.md | 路由专项行动主文档 | 行动已结束 |
| ROUTING-SPECIAL-ACTION-INDEX.md | 专项行动索引 | 行动已结束 |
| subtask-01-code-review.md | 代码审查子任务 | 子任务完成 |
| subtask-02-code-refactoring.md | 代码重构子任务 | 子任务完成 |
| subtask-03-testing.md | 测试验证子任务 | 子任务完成 |
| subtask-04-documentation.md | 文档编写子任务 | 子任务完成 |

**专项行动成果**:
- 发现并修复路由匹配 BUG
- 完成 11 项路由单元测试
- 创建代码评审响应报告

### frontend/.docs-archive/ - 前端临时文档

| 文件 | 说明 | 不提交原因 |
|------|------|------------|
| INTERNAL-FUNCTION-DOCS.md | 前端内部函数参数 | 临时参考，不归档到项目 |

---

## 保留文档

以下文档保留在原位置，**不进行归档**：

### .docs/01-project/ - 项目核心文档
- 00-demand.md - 需求文档
- 00-root-readme.md - 根目录 README 说明
- 01-overview.md - 项目概述
- 02-requirements.md - 需求规格
- 03-status.md - 项目状态
- 04-remaining-tasks.md - 剩余任务
- 05-tasklist.md - 任务清单
- 06-jsdoc-complete.md - JSDoc 完成情况

### .docs/02-tasks/ - 任务记录
- task-00-quality-improvement.md - 质量改进任务
- task-01-complete.md - 任务 1 完成情况
- ... (其他任务文档)

### .docs/03-subtasks/ - 子任务文档
- README.md - 子任务文档索引
- subtask-01-env-config.md - 环境配置
- ... (API 实现文档)
- frontend-api-reference.md - 前端 API 参考
- env-variables-guide.md - 环境变量指南

### .docs/04-skills/ - Skills 文档
- README.md - Skills 索引
- 01-frontend/ - 前端 Skills (软链接)
- 02-backend/ - 后端 Skills (软链接)
- 03-workflow/ - 工作流 Skills (软链接)

### .docs/README.md - 文档总索引
- 项目文档导航
- 文档结构说明

---

## 归档历史

| 日期 | 操作 | 文档数量 | 执行人 |
|------|------|----------|--------|
| 2026-06-10 | 初始归档 | 10 个 | MonkeyCode-AI |

---

## 恢复归档文档

如需恢复归档文档，使用以下命令：

```bash
# 恢复过程报告
cp .docs/99-archive/2026-06-process/*.md .docs/

# 恢复专项行动文档
cp .docs/99-archive/2026-06-special-actions/*.md frontend/

# 恢复前端临时文档
cp frontend/.docs-archive/*.md frontend/
```

---

**最后更新**: 2026-06-10  
**维护**: 项目文档管理员
