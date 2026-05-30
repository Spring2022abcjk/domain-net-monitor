# API 响应格式规范

**版本**: 1.0.0  
**生效日期**: 2026-05-29  
**适用范围**: 所有 Cloudflare Worker API 端点

---

## 📋 核心原则

1. **统一格式** - 所有 API 端点必须使用相同的响应格式
2. **强制使用 helper** - 必须使用 `jsonResponse()` 函数
3. **禁止直接使用 Response** - 不允许直接使用 `new Response(JSON.stringify(...))`

---

## 🎯 响应格式标准

### 标准结构

```json
{
  "code": 200,
  "data": {
    "field1": "value1",
    "field2": "value2"
  },
  "msg": "success"
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | Number | ✅ | HTTP 状态码或业务状态码 |
| `data` | Object/Null | ✅ | 响应数据，无数据时为 `null` |
| `msg` | String | ✅ | 描述信息 |

---

## 📝 使用指南

### 成功响应

#### 返回对象数据
```javascript
import { jsonResponse } from '../../utils/helper.js';

// ✅ 正确
return jsonResponse({
  domains: list,
  count: list.length
}, 200);

// ❌ 错误
return new Response(JSON.stringify({
  domains: list,
  count: list.length
}), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
});
```

#### 返回数组数据
```javascript
// ✅ 正确
return jsonResponse({
  domains: ['cloudflare.com', 'google.com'],
  count: 2
}, 200);
```

#### 返回成功消息
```javascript
// ✅ 正确
return jsonResponse({
  success: true,
  message: 'Domain added successfully',
  domain: 'example.com'
}, 200);
```

### 错误响应

#### 客户端错误 (4xx)

```javascript
// 400 Bad Request - 请求格式错误
return jsonResponse(null, 400, 'Invalid domain format');

// 401 Unauthorized - 认证失败
return jsonResponse(null, 401, 'Invalid or missing API Token');

// 404 Not Found - 资源不存在
return jsonResponse(null, 404, 'Domain not found');

// 409 Conflict - 资源冲突
return jsonResponse(null, 409, 'Domain already exists');

// 405 Method Not Allowed
return jsonResponse(null, 405, 'Method not allowed');
```

#### 服务端错误 (5xx)

```javascript
// 500 Internal Server Error
return jsonResponse(null, 500, 'Internal server error');
```

### 带额外响应头

```javascript
import { jsonResponse } from '../../utils/helper.js';

return jsonResponse({
  domains: list,
  count: list.length
}, 200, 'success', {
  'X-Custom-Header': 'custom-value'
});
```

---

## 🔧 错误处理模式

### JSON 解析错误

```javascript
let body;
try {
  body = await request.json();
} catch (error) {
  console.error('Failed to parse request body:', error.message);
  return jsonResponse(null, 400, 'Invalid JSON format');
}
```

### 业务逻辑错误

```javascript
// 验证输入
const domain = cleanDomain(body.domain);
if (!domain) {
  return jsonResponse(null, 400, 'Invalid domain format');
}

// 检查冲突
const added = await addDomain(env, domain);
if (!added) {
  return jsonResponse(null, 409, 'Domain already exists');
}

// 检查不存在
const deleted = await removeDomain(env, domain);
if (!deleted) {
  return jsonResponse(null, 404, 'Domain not found');
}
```

### 未知错误捕获

```javascript
try {
  // 业务逻辑
  const config = await getConfig(env);
  await setConfig(env, newConfig);
  
  return jsonResponse({
    success: true,
    config: newConfig
  }, 200);
} catch (error) {
  console.error('Unexpected error in updateConfig:', error.message);
  return jsonResponse(null, 500, 'Internal server error');
}
```

---

## 📊 响应码对照表

| HTTP 状态码 | 业务场景 | 说明 |
|------------|---------|------|
| 200 | 成功 | 请求成功，data 包含响应数据 |
| 400 | 错误请求 | 请求参数错误、JSON 格式错误 |
| 401 | 未授权 | Token 缺失或无效 |
| 404 | 未找到 | 资源不存在 |
| 405 | 方法不允许 | HTTP 方法不支持 |
| 409 | 冲突 | 资源已存在 |
| 429 | 限流 | 请求过于频繁 |
| 500 | 服务器错误 | 未知内部错误 |

---

## 🚫 禁止行为

### 禁止直接使用 Response

```javascript
// ❌ 禁止
return new Response(JSON.stringify({ code: 200, data: config }), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
});

// ✅ 正确
return jsonResponse(config, 200);
```

### 禁止返回不一致格式

```javascript
// ❌ 禁止 - 缺少 code 字段
return jsonResponse({
  domains: list,
  count: list.length
}, 200);  // 这个是对的

// ❌ 禁止 - 直接在根级返回数据
return new Response(JSON.stringify(config), {
  status: 200
});
```

### 禁止混用格式

```javascript
// ❌ 禁止 - 同一文件中两种格式混用
function handleGet() {
  return jsonResponse(config, 200);  // 格式 1
}

function handlePost() {
  return new Response(JSON.stringify({ success: true }), {  // 格式 2
    status: 200
  });
}
```

---

## ✅ 检查清单

提交前运行：

```bash
# 检查是否有直接使用 new Response(JSON.stringify
grep -rn "new Response(JSON.stringify" src/routes/admin/*.js | grep -v "handleOptionsRequest"
# 应该返回 0 个结果

# 检查 jsonResponse 使用是否规范
grep -rn "jsonResponse(" src/routes/admin/*.js
# 应该看到所有 API 端点都使用 jsonResponse
```

---

## 📚 相关文件

- [helper.js](../src/utils/helper.js) - `jsonResponse()` 函数实现
- [错误处理规范](./error-handling-standards.md) - 错误处理详细规范
- [测试代码规范](./test-coding-standards.md) - 测试中如何访问响应数据

---

## 📝 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-05-29 | 1.0.0 | 初始版本 | AI Assistant |
