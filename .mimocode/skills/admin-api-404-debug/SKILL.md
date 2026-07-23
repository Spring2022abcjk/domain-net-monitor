---
name: admin-api-404-debug
description: "调试和修复 Admin API 路径返回 404 的问题。触发于：公开 API 正常但部分 Admin API 返回 404，后端日志显示路由未匹配。"
---

# Admin API 404 Debug Skill

调试和修复 Admin API 路径返回 404 的问题。

## 适用场景

当出现以下症状时触发本 Skill：

- ✅ 公开 API 正常（`/api/public/*` 返回 200）
- ✅ 部分 Admin API 返回 404
- ✅ 其他 Admin API 正常（如 `/api/admin/verify` 正常，但 `/api/admin/domains` 404）
- ✅ 后端日志显示路由未匹配

## 问题根因

路由分发器的 `if/else if` 链断裂或条件错误：

```javascript
// ❌ 错误模式：else if 断裂
if (path === '/api/admin/auth/verify' && method === 'POST') {
  response = await handleAuth(request, env);
}
if (path === '/api/admin/domains' && method === 'GET') {  // ← 应该是 else if
  response = await handleDomains(request, env);
}
```

导致第一个 if 执行后，第二个 if 也被执行（即使 path 不同）。

## 调试步骤

### 步骤 1：收集路由日志

在路由分发器入口添加日志：

```javascript
// src/routes/index.js
export async function handleRequest(request, env) {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method
  
  console.log('[Router] Incoming request:', { method, path })
  
  // ... 路由逻辑
}
```

**查看日志**：
```bash
# Cloudflare Dashboard 查看 Worker 日志
# 或本地开发：wrangler dev 输出
```

### 步骤 2：检查路由链完整性

```bash
# 检查 all else if 是否连贯
grep -n "if.*path ===\|else if.*path ===" src/routes/index.js
```

**正确模式**：
```javascript
if (path === '/api/health' && method === 'GET') {
  response = await handleHealth(request, env);
}
else if (path === '/api/admin/auth/verify' && method === 'POST') {
  response = await handleAuth(request, env);
}
else if (path === '/api/admin/domains' && method === 'GET') {
  response = await handleDomains(request, env);
}
```

**错误模式**：
```javascript
if (path === '/api/health' && method === 'GET') {
  response = await handleHealth(request, env);
}
if (path === '/api/admin/auth/verify' && method === 'POST') {  // ← 缺少 else
  response = await handleAuth(request, env);
}
if (path === '/api/admin/domains' && method === 'GET') {  // ← 缺少 else
  response = await handleDomains(request, env);
}
```

### 步骤 3：检查条件逻辑

确保每个条件都有**路径 + 方法**：

```javascript
// ❌ 错误：只检查路径
if (path === '/api/admin/domains') {
  response = await handleDomains(request, env);
}

// ✅ 正确：路径 + 方法
if (path === '/api/admin/domains' && method === 'GET') {
  response = await handleDomains(request, env);
}
```

### 步骤 4：验证修复

```bash
# 测试所有 Admin API 端点
curl -H "X-API-Token: $TOKEN" https://your-worker.your-domain.workers.dev/api/admin/auth/verify | jq
curl -H "X-API-Token: $TOKEN" https://your-worker.your-domain.workers.dev/api/admin/domains | jq
curl -H "X-API-Token: $TOKEN" https://your-worker.your-domain.workers.dev/api/admin/config | jq
```

**预期**：
- ✅ 所有端点返回 200 或 401（不是 404）
- ✅ 日志显示路由正确匹配

## 常见问题排查

### Q1: 修改后仍然 404

**检查点**：
1. 是否重新部署 (`wrangler deploy`)
2. 环境变量是否生效
3. 路由条件是否正确（路径拼写、方法）

### Q2: 随机性 404

**检查点**：
1. 多个 if 条件可能同时满足
2. 没有使用 else if 导致多个处理器执行
3. 路由顺序错误（通配符在前）

### Q3: 日志显示路由匹配但仍然 404

**检查点**：
1. 处理器函数是否正确返回响应
2. 是否缺少 `return response`
3. 是否有 unhandled exception

## 验证清单

修复完成后验证：

- [ ] 所有 Admin API 返回 200/401（不是 404）
- [ ] 日志显示路由正确匹配
- [ ] if/else if 链连贯
- [ ] 每个条件都有路径 + 方法
- [ ] 无 console.error

## 预防措施

1. **代码模板** - 使用 else if 链模板
2. **自动测试** - 每个路由端点都有测试
3. **提交前检查** - grep 检查 if 链完整性

## 参考示例

**错误示例** (routes/index.js 修复前):
```javascript
if (path === '/api/admin/auth/verify' && method === 'POST') {
  response = await handleAuth(request, env);
}
if (path === '/api/admin/domains' && method === 'GET') {
  response = await handleDomains(request, env);
}
```

**正确示例** (routes/index.js 修复后):
```javascript
if (path === '/api/admin/auth/verify' && method === 'POST') {
  response = await handleAuth(request, env);
}
else if (path === '/api/admin/domains' && method === 'GET') {
  response = await handleDomains(request, env);
}
```

## 相关 Skills

- [`api-route.md`](./api-route.md) - API 路由实现
- [`api-response.md`](./api-response.md) - API 响应格式

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-06-08 | 1.0 | 基于 Admin API 404 调试经验创建 |
