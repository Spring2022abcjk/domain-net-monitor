# 路径映射说明

**更新日期**: 2026-06-08

---

## 📁 目录结构变更

### 旧路径 (已弃用)

```
/workspace/
└── .monkeycode/specs/cloudflare-domain-monitor/
    ├── PROJECT_OVERVIEW.md
    ├── STATUS_SUMMARY.md
    ├── remaining-tasks.md
    ├── subtask-*.md
    └── task-*.md
```

### 新路径 (当前使用)

```
/workspace/
└── .docs/
    ├── 01-project/          # 项目文档
    ├── 02-tasks/            # 任务总结
    ├── 03-subtasks/         # 子任务文档
    ├── 04-skills/           # Skills
    └── 99-archive/          # 归档
```

---

## 🗺️ 路径映射表

| 旧路径 | 新路径 | 状态 |
|--------|--------|------|
| `.monkeycode/specs/.../PROJECT_OVERVIEW.md` | `.docs/01-project/01-overview.md` | ✅ 已迁移 |
| `.monkeycode/specs/.../STATUS_SUMMARY.md` | `.docs/01-project/03-status.md` | ✅ 已迁移 |
| `.monkeycode/specs/.../remaining-tasks.md` | `.docs/01-project/04-remaining-tasks.md` | ✅ 已迁移 |
| `.monkeycode/specs/.../subtask-*.md` | `.docs/03-subtasks/subtask-*.md` | ✅ 已迁移 |
| `.monkeycode/specs/.../task-*.md` | `.docs/02-tasks/task-*.md` | ✅ 已迁移 |
| `.opencode/skills/*.md` | `.docs/04-skills/*/*.md` | ✅ 软链接 |

---

## 🔧 配置引用

### opencode.json

```json
{
  "skills": {
    "directories": [".opencode/skills"]
  }
}
```

**说明**: Skills 配置仍使用 `.opencode/skills/` 作为源文件目录，`.docs/04-skills/` 通过软链接指向源文件。

### 文档引用

**推荐使用**:
- ✅ 绝对路径：`.docs/01-project/01-overview.md`
- ✅ 相对路径（从根目录）：`./.docs/README.md`
- ✅ Markdown 链接：`[文档标题](.docs/README.md)`

**避免使用**:
- ❌ `.monkeycode/specs/` 路径（已弃用）
- ❌ 深层相对路径：`../../../` (难以维护)

---

## 📝 更新清单

### 已更新
- [x] `.docs/01-project/00-root-readme.md` - 更新目录结构说明
- [x] `.docs/01-project/01-overview.md` - 更新路径引用
- [x] `.docs/README.md` - 使用新路径
- [x] `.docs/04-skills/README.md` - 说明软链接

### 无需更新
- [x] 源文件内容（代码、config）- 无路径引用
- [x] Skills 源文件 - 无内部交叉引用

---

## 🔄 迁移验证

### 验证步骤

1. **检查旧路径引用**
   ```bash
   grep -r "\.monkeycode/specs" .docs/ --include="*.md"
   # 应无结果（除了注释）
   ```

2. **验证软链接**
   ```bash
   ls -la .docs/04-skills/*/*.md
   # 所有文件应为软链接
   ```

3. **测试文档访问**
   ```bash
   cat .docs/README.md
   # 应正常显示内容
   ```

### 验证结果 (2026-06-08)

- ✅ 无功能性旧路径引用
- ✅ 所有软链接有效
- ✅ 文档索引可正常访问

---

**维护说明**:
- 新增文档时使用新路径 (`.docs/`)
- 发现旧路径引用时及时更新
- 定期运行验证脚本

