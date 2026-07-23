---
name: vite-env-injection-fix
description: "修复 Vite 环境变量在 runtime 获取不到的问题。触发于：import.meta.env.VITE_XXX 为 undefined、前端配置丢失。"
---

# Vite Environment Variable Injection Fix Skill

修复 Vite 环境变量在 runtime 获取不到的问题。

## 适用场景

当出现以下症状时触发本 Skill：

- ✅ `import.meta.env.VITE_XXX` 返回 `undefined`
- ✅ 页面提示 "环境变量未配置"
- ✅ 本地开发正常，部署后失败
- ✅ 控制台输出环境变量为 undefined

## 问题根因

Vite 的环境变量**仅在构建时注入**，不是 runtime 读取：

```javascript
// ❌ 运行时读取（无效）
const apiUrl = process.env.VITE_API_BASE_URL  // undefined

// ✅ 构建时注入
const apiUrl = import.meta.env.VITE_API_BASE_URL  // 构建时替换
```

## 核心修复步骤

### 步骤 1：创建环境文件

**本地开发**：`.env.development`
```bash
VITE_API_BASE_URL=http://localhost:8787
```

**生产环境**：`.env.production`
```bash
VITE_API_BASE_URL=https://your-worker.your-domain.workers.dev
```

### 步骤 2：验证 Vite 配置

```javascript
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  // Vite 自动加载 .env 和 .env.production
  // 无需额外配置
})
```

### 步骤 3：使用环境变量

```javascript
// src/utils/api.js
const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 5000
}

// 构建后会被替换为：
// const API_CONFIG = {
//   baseUrl: 'https://your-worker.your-domain.workers.dev',
//   timeout: 5000
// }
```

### 步骤 4：验证构建产物

```bash
# 构建
npm run build

# 检查构建产物是否包含实际值
grep -o 'https://your-worker.your-domain.workers.dev' dist/assets/*.js
# ✅ 应该输出：https://your-worker.your-domain.workers.dev
```

### 步骤 5：部署验证

```bash
# 部署
npx wrangler pages deploy dist/

# 访问页面，检查控制台
console.log(import.meta.env.VITE_API_BASE_URL)
# ✅ 应该输出实际的 URL（不是 undefined）
```

## 常见问题排查

### Q1: 本地开发正常，部署后 undefined

**原因**：部署时没有创建 .env.production

**解决**：
```bash
# 构建前创建生产环境文件
cat > .env.production << EOF
VITE_API_BASE_URL=https://your-worker.your-domain.workers.dev
EOF

# 重新构建
npm run build
```

### Q2: 修改 .env 后不生效

**原因**：Vite dev server 缓存

**解决**：
```bash
# 重启 dev server
# 或强制刷新浏览器（Ctrl+Shift+R）
```

### Q3: 构建产物仍然包含 import.meta.env

**原因**：环境变量未正确加载

**解决**：
```bash
# 检查 .env 文件是否在正确位置
ls -la .env*

# 检查变量名是否以 VITE_ 开头
cat .env.production

# 重新构建
rm -rf dist/
npm run build
```

## 验证清单

修复完成后验证：

- [ ] .env.production 文件存在
- [ ] 变量名以 VITE_ 开头
- [ ] 构建产物包含实际值（不是 import.meta.env）
- [ ] 部署后页面正常工作
- [ ] 控制台输出实际值（不是 undefined）

## 预防措施

1. **CI/CD 集成** - 部署时自动创建 .env.production
2. **构建验证** - CI 检查构建产物是否包含环境变量
3. **文档说明** - README 明确环境变量配置步骤

## 参考示例

**错误示例** (未创建环境文件):
```bash
# 直接构建
npm run build
# ❌ 结果：import.meta.env.VITE_API_BASE_URL = undefined
```

**正确示例** (创建环境文件后):
```bash
# 创建生产环境文件
cat > .env.production << EOF
VITE_API_BASE_URL=https://your-worker.your-domain.workers.dev
EOF

# 重新构建
npm run build

# 验证构建产物
grep -o 'https://your-worker.your-domain.workers.dev' dist/assets/*.js
# ✅ 结果：https://your-worker.your-domain.workers.dev
```

## 环境变量命名规则

| 类型 | 前缀 | 示例 | 说明 |
|------|------|------|------|
| **Vite** | `VITE_` | `VITE_API_BASE_URL` | 可在前端使用 |
| **Node.js** | 无前缀 | `NODE_ENV` | 仅 Node.js 可用 |

**注意**：
- 只有 `VITE_` 开头的变量才会被注入到前端代码
- 其他变量仅在 Node.js 环境可用

## 相关 Skills

- [`frontend-render-fix.md`](./frontend-render-fix.md) - 前端渲染修复
- [`deploy-website`](../deploy-website/SKILL.md) - 网站部署

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-06-08 | 1.0 | 基于环境变量注入修复经验创建 |
