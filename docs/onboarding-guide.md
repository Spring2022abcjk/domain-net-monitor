# 新开发者指南

**版本**: 1.0.0  
**生效日期**: 2026-05-29  
**目标读者**: 新加入项目的开发者

---

## 👋 欢迎！

欢迎加入 Cloudflare Domain Monitor 项目！本指南将帮助你快速上手开发。

---

## 🚀 快速开始

### 1. 环境准备

**必需工具**:
- Node.js v20+
- npm
- Git

**推荐工具**:
- VSCode
- VSCode ESLint 插件
- VSCode Prettier 插件

### 2. 安装依赖

```bash
cd /workspace
npm install
```

### 3. 配置环境

```bash
# 复制配置模板
cp wrangler.toml.example wrangler.toml

# 编辑 wre.toml，填入你的配置
# 注意：不要提交真实的 Token 和 KV ID
```

### 4. 运行测试

```bash
npm test
```

预期输出：
```
Total: 378
Passed: 378
Failed: 0
✅ All tests passed!
```

### 5. 启动开发服务器

```bash
npm run dev
```

---

## 📚 代码质量工具链

### 预提交检查

**每次提交前必须运行**:

```bash
./scripts/pre-commit-check.sh
```

检查项目：
1. API 响应格式 - 确保使用 `jsonResponse()`
2. 测试代码命名 - 确保使用 `body` 和 `body.data`
3. 测试访问模式 - 确保正确的变量访问
4. 单元测试 - 确保 100% 通过

### 常见错误

#### 错误 1: 使用 `new Response(JSON.stringify(...))`

```javascript
// ❌ 错误
return new Response(JSON.stringify(config), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
});

// ✅ 正确
import { jsonResponse } from '../utils/helper.js';
return jsonResponse(config, 200);
```

#### 错误 2: 测试中使用 `config` 变量

```javascript
// ❌ 错误
const config = await response.json();
assertEqual(config.defaultRefreshInterval, 43200, ...);

// ✅ 正确
const body = await response.json();
assertEqual(body.data.defaultRefreshInterval, 43200, ...);
```

#### 错误 3: 忘记 `.data` 层

```javascript
// ❌ 错误
const body = await response.json();
assertEqual(body.domains.length, 2, ...);

// ✅ 正确
assertEqual(body.data.domains.length, 2, ...);
```

---

## 📖 开发流程

### 1. 接收任务

阅读任务文档（`.monkeycode/specs/` 目录下）

### 2. 编写代码

- 参考现有代码风格
- 遵循 API 响应规范
- 编写 JSDoc 注释

### 3. 编写测试

- 使用 helper 函数
- 覆盖正常和错误场景
- 遵循命名规范

### 4. 运行测试

```bash
npm test
```

### 5. 运行预提交检查

```bash
./scripts/pre-commit-check.sh
```

### 6. 提交代码

```bash
git add .
git commit -m "feat: 简短描述

详细说明（可选）"
```

### 7. 推送代码

```bash
git push origin main
```

---

## 📋 规范文档

### 核心规范

| 文档 | 说明 |
|------|------|
| [API 响应规范](./api-response-standards.md) | 所有 API 必须使用 `jsonResponse()` |
| [测试代码规范](./test-coding-standards.md) | 测试变量命名和批量修改流程 |
| [错误处理规范](./error-handling-standards.md) | 错误分类和日志记录规范 |
| [代码审查清单](./code-review-checklist.md) | 提交前自查清单 |

### 快速查阅

**API 响应示例**:
```javascript
// 成功
return jsonResponse({ domains: list, count: list.length }, 200);

// 错误
return jsonResponse(null, 400, 'Invalid domain format');
```

**测试示例**:
```javascript
const body = await response.json();
assertEqual(body.data.domains.length, 2, 'Two domains');
```

---

## 🆘 常见问题

### Q: 测试报错 "Cannot read properties of undefined"

**A**: 检查是否正确访问 `body.data.xxx`

```javascript
// ❌ 错误 - 忘记 .data
const body = await response.json();
assertEqual(body.domains.length, 2, ...);

// ✅ 正确
assertEqual(body.data.domains.length, 2, ...);
```

### Q: 批量修改后测试更混乱了

**A**: 
1. 先运行 `grep` 查看所有需要修改的地方
2. 使用编辑器一次性修改所有相关代码
3. 再运行测试

不要看到第一个错误就盲目修复！

### Q: 预提交检查失败怎么办

**A**: 
1. 阅读错误信息
2. 根据提示修复
3. 重新运行检查

```bash
./scripts/pre-commit-check.sh
```

### Q: 不知道如何访问响应数据

**A**: 统一使用 `const body = await response.json()`，然后访问 `body.data.xxx`

---

## 🎯 下一步

1. 阅读 [API 响应规范](./api-response-standards.md)
2. 阅读 [测试代码规范](./test-coding-standards.md)
3. 查看当前任务文档
4. 开始开发！

---

## 📞 获取帮助

- 查看 `docs/` 目录下的规范文档
- 查看 `.monkeycode/specs/` 目录下的任务文档
- 参考现有代码
- 运行预提交检查获取反馈

---

**祝你开发愉快！** 🎉
