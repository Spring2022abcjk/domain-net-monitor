# 错误处理规范

**版本**: 1.0.0  
**生效日期**: 2026-05-29  
**适用范围**: 所有 Cloudflare Worker 代码

---

## 📋 核心原则

1. **区分错误类型** - 不同错误返回不同状态码
2. **详细日志记录** - 便于排查问题
3. **用户友好信息** - 不泄露敏感信息
4. **统一响应格式** - 使用 `jsonResponse()`

---

## 🎯 错误分类

### 客户端错误 (4xx)

由客户端请求引起，客户端需要修改请求才能成功。

| 状态码 | 场景 | 错误信息示例 |
|--------|------|------------|
| 400 | 请求格式错误 | `Invalid JSON format` |
| 400 | 参数验证失败 | `Invalid domain format` |
| 401 | Token 缺失 | `API Token required` |
| 401 | Token 无效 | `Invalid or missing API Token` |
| 404 | 资源不存在 | `Domain not found` |
| 405 | 方法不允许 | `Method not allowed` |
| 409 | 资源冲突 | `Domain already exists` |
| 429 | 限流超限 | `Too many requests` |

### 服务端错误 (5xx)

由服务器内部问题引起，客户端无需修改请求。

| 状态码 | 场景 | 错误信息示例 |
|--------|------|------------|
| 500 | 未知错误 | `Internal server error` |
| 500 | 依赖服务失败 | `KV operation failed` |
| 500 | 未处理异常 | `Unexpected error occurred` |

---

## 📝 错误处理模式

### 模式 1: JSON 解析错误

```javascript
let body;
try {
  body = await request.json();
} catch (error) {
  console.error('Failed to parse request body:', error.message);
  return jsonResponse(null, 400, 'Invalid JSON format');
}
```

**说明**:
- 捕获 `SyntaxError` (JSON 解析失败)
- 返回 400 Bad Request
- 记录详细日志便于调试

### 模式 2: 输入验证错误

```javascript
const domain = cleanDomain(body.domain);
if (!domain) {
  return jsonResponse(null, 400, 'Invalid domain format');
}
```

**说明**:
- 在业务逻辑开始前验证输入
- 返回 400 Bad Request
- 错误信息描述具体问题

### 模式 3: 资源不存在

```javascript
const deleted = await removeDomain(env, domain);
if (!deleted) {
  return jsonResponse(null, 404, 'Domain not found');
}
```

**说明**:
- 检查操作结果
- 返回 404 Not Found
- 不泄露是否存在其他域名

### 模式 4: 资源冲突

```javascript
const added = await addDomain(env, domain);
if (!added) {
  return jsonResponse(null, 409, 'Domain already exists');
}
```

**说明**:
- 检查是否已存在
- 返回 409 Conflict
- 明确说明冲突原因

### 模式 5: 认证失败

```javascript
if (!isValidAdminToken(request, env)) {
  return createUnauthorizedResponse();
}
```

**说明**:
- Token 缺失或无效
- 返回 401 Unauthorized
- 不泄露期望的 Token 值

### 模式 6: 未处理异常

```javascript
try {
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

**说明**:
- 捕获所有未处理异常
- 返回 500 Internal Server Error
- 记录详细日志供调试
- 不泄露内部实现细节

---

## 🔧 错误日志记录

### 日志级别

```javascript
// 错误日志 - 必须记录
console.error('Failed to parse request body:', error.message);

// 信息日志 - 可选记录
console.log('Added domain:', domain);
```

### 日志内容

**必须包含**:
- 错误发生位置（函数名或操作）
- 错误消息
- 相关上下文（如域名、配置项）

**示例**:
```javascript
console.error('Failed to add domain:', {
  domain: body.domain,
  error: error.message
});

console.error('Config validation failed:', {
  field: 'defaultRefreshInterval',
  value: body.defaultRefreshInterval,
  error: error.message
});
```

### 禁止记录

**绝对不要记录**:
- API Token 的值
- 用户密码
- 敏感配置信息

```javascript
// ❌ 错误 - 记录敏感信息
console.error('Token validation failed:', {
  expected: env.CLOUDFLARE_API_TOKEN,  // 禁止！
  received: token
});

// ✅ 正确 - 只记录错误
console.error('Token validation failed:', error.message);
```

---

## 📊 错误响应示例

### 400 Bad Request

```json
{
  "code": 400,
  "data": null,
  "msg": "Invalid domain format"
}
```

### 401 Unauthorized

```json
{
  "code": 401,
  "data": null,
  "msg": "Invalid or missing API Token"
}
```

### 404 Not Found

```json
{
  "code": 404,
  "data": null,
  "msg": "Domain not found"
}
```

### 409 Conflict

```json
{
  "code": 409,
  "data": null,
  "msg": "Domain already exists"
}
```

### 500 Internal Server Error

```json
{
  "code": 500,
  "data": null,
  "msg": "Internal server error"
}
```

---

## ✅ 检查清单

提交前检查：

```bash
# 1. 检查是否有未处理的 Promise
grep -rn "\.catch(" src/routes/admin/*.js
# 应该都有适当的错误处理

# 2. 检查错误日志
grep -rn "console.error" src/routes/admin/*.js
# 应该有详细的错误日志

# 3. 检查错误响应格式
grep -rn "jsonResponse(null, [45]" src/routes/admin/*.js
# 应该都使用 jsonResponse 函数
```

---

## 🚫 常见错误

### 错误 1: 捕获所有异常返回相同信息

```javascript
// ❌ 错误
try {
  // 业务逻辑
} catch (error) {
  return jsonResponse(null, 400, 'Invalid request body');  // 太笼统
}

// ✅ 正确
try {
  body = await request.json();
} catch (error) {
  console.error('JSON parse failed:', error.message);
  return jsonResponse(null, 400, 'Invalid JSON format');
}

// 业务逻辑中的其他错误
if (!domain) {
  return jsonResponse(null, 400, 'Invalid domain format');
}
```

### 错误 2: 不记录错误日志

```javascript
// ❌ 错误
catch (error) {
  return jsonResponse(null, 500, 'Internal server error');
}

// ✅ 正确
catch (error) {
  console.error('Unexpected error:', error.message);
  return jsonResponse(null, 500, 'Internal server error');
}
```

### 错误 3: 泄露敏感信息

```javascript
// ❌ 错误 - 泄露 Token
console.error('Token validation failed:', {
  expected: 'secret_token_123',
  received: token
});

// ✅ 正确
console.error('Token validation failed:', error.message);
```

### 错误 4: 使用 200 状态码返回错误

```javascript
// ❌ 错误
return jsonResponse({
  success: false,
  message: 'Domain not found'
}, 200);  // 状态码 200，但实际是错误

// ✅ 正确
return jsonResponse(null, 404, 'Domain not found');
```

---

## 📚 相关文件

- [API 响应规范](./api-response-standards.md) - 响应格式标准
- [test-coding-standards.md](./test-coding-standards.md) - 测试错误处理
- [helper.js](../src/utils/helper.js) - jsonResponse 函数实现

---

## 📝 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-05-29 | 1.0.0 | 初始版本 | AI Assistant |
