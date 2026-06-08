# 任务 5：域名管理 API - 子任务分解

**创建时间**: 2026-05-29  
**任务状态**: ⏳ 待开始  
**预计工期**: 1 天

---

## 任务目标

实现域名管理相关的 API 端点，支持域名的增删查、默认展示设置等功能。

---

## 子任务列表

### 5.1 实现获取所有域名 API

**文件**: `src/routes/admin/domains.js`

**API**: `GET /api/admin/domains`

**请求**:
```http
GET /api/admin/domains
X-API-Token: <admin-token>
```

**响应（成功）**:
```json
{
  "domains": ["cloudflare.com", "google.com"],
  "count": 2
}
```

**实现要点**:
```javascript
import { getDomainList } from '../../storage/kv.js';
import { withAdminAuth } from '../../middleware/auth.js';

async function handleGetDomains(request, env) {
  const kv = env.DOMAIN_MONITOR_KV;
  const domains = await getDomainList(kv);
  
  return new Response(JSON.stringify({
    domains,
    count: domains.length
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**验收标准**:
- ✅ 需要有效 Token 才能访问
- ✅ 返回域名数组和数量
- ✅ 空列表返回空数组
- ✅ 响应包含 CORS 头

---

### 5.2 实现添加域名 API

**文件**: `src/routes/admin/domains.js`

**API**: `POST /api/admin/domains`

**请求**:
```http
POST /api/admin/domains
X-API-Token: <admin-token>
Content-Type: application/json

{
  "domain": "example.com"
}
```

**响应（成功）**:
```json
{
  "success": true,
  "message": "Domain added successfully",
  "domain": "example.com"
}
```

**响应（域名已存在）**:
```json
{
  "success": false,
  "message": "Domain already exists"
}
```

**响应（域名格式错误）**:
```json
{
  "success": false,
  "message": "Invalid domain format"
}
```

**实现要点**:
```javascript
import { addDomain } from '../../storage/kv.js';
import { cleanDomain } from '../../utils/helper.js';

async function handleAddDomain(request, env) {
  const body = await request.json();
  const domain = cleanDomain(body.domain);
  
  if (!domain) {
    return jsonResponse({
      success: false,
      message: 'Invalid domain format'
    }, 400);
  }
  
  const added = await addDomain(env.DOMAIN_MONITOR_KV, domain);
  
  if (!added) {
    return jsonResponse({
      success: false,
      message: 'Domain already exists'
    }, 409);
  }
  
  return jsonResponse({
    success: true,
    message: 'Domain added successfully',
    domain
  }, 200);
}
```

**验收标准**:
- ✅ 需要有效 Token 才能访问
- ✅ 域名自动清洗（移除协议、端口、路径）
- ✅ 重复域名返回 409
- ✅ 无效域名返回 400
- ✅ 成功添加返回 200

---

### 5.3 实现删除域名 API

**文件**: `src/routes/admin/domains.js`

**API**: `DELETE /api/admin/domains/:domain`

**请求**:
```http
DELETE /api/admin/domains/example.com
X-API-Token: <admin-token>
```

**响应（成功）**:
```json
{
  "success": true,
  "message": "Domain deleted successfully",
  "domain": "example.com"
}
```

**响应（域名不存在）**:
```json
{
  "success": false,
  "message": "Domain not found"
}
```

**实现要点**:
```javascript
import { deleteDomain } from '../../storage/kv.js';

async function handleDeleteDomain(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const domain = path.split('/').pop();  // 获取 :domain 参数
  
  const deleted = await deleteDomain(env.DOMAIN_MONITOR_KV, domain);
  
  if (!deleted) {
    return jsonResponse({
      success: false,
      message: 'Domain not found'
    }, 404);
  }
  
  return jsonResponse({
    success: true,
    message: 'Domain deleted successfully',
    domain
  }, 200);
}
```

**验收标准**:
- ✅ 需要有效 Token 才能访问
- ✅ 删除成功返回 200
- ✅ 域名不存在返回 404
- ✅ 同时清理相关历史记录（可选）

---

### 5.4 实现设为默认展示 API

**文件**: `src/routes/admin/domains.js`

**API**: `POST /api/admin/domains/:domain/default`

**请求**:
```http
POST /api/admin/domains/cloudflare.com/default
X-API-Token: <admin-token>
```

**响应（成功）**:
```json
{
  "success": true,
  "message": "Domain set as default",
  "domain": "cloudflare.com"
}
```

**响应（域名不存在）**:
```json
{
  "success": false,
  "message": "Domain not in list"
}
```

**实现要点**:
```javascript
import { setDefaultDomains, getDefaultDomains } from '../../storage/default-domains.js';

async function handleSetDefaultDomain(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const domain = path.split('/').pop();
  
  // 检查域名是否在列表中
  const allDomains = await getDomainList(env.DOMAIN_MONITOR_KV);
  if (!allDomains.includes(domain)) {
    return jsonResponse({
      success: false,
      message: 'Domain not in list'
    }, 404);
  }
  
  // 获取现有默认列表
  const defaults = await getDefaultDomains(env);
  
  // 如果已在列表中，不重复添加
  if (!defaults.includes(domain)) {
    defaults.push(domain);
    await setDefaultDomains(env, defaults);
  }
  
  return jsonResponse({
    success: true,
    message: 'Domain set as default',
    domain
  }, 200);
}
```

**验收标准**:
- ✅ 需要有效 Token 才能访问
- ✅ 域名必须在监控列表中
- ✅ 重复设置不报错（幂等性）
- ✅ 成功返回 200

---

### 5.5 实现取消默认展示 API

**文件**: `src/routes/admin/domains.js`

**API**: `DELETE /api/admin/domains/:domain/default`

**请求**:
```http
DELETE /api/admin/domains/cloudflare.com/default
X-API-Token: <admin-token>
```

**响应（成功）**:
```json
{
  "success": true,
  "message": "Domain removed from defaults",
  "domain": "cloudflare.com"
}
```

**响应（域名不在默认列表）**:
```json
{
  "success": false,
  "message": "Domain not in default list"
}
```

**实现要点**:
```javascript
async function handleRemoveDefaultDomain(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const domain = path.split('/').pop();
  
  const defaults = await getDefaultDomains(env);
  const index = defaults.indexOf(domain);
  
  if (index === -1) {
    return jsonResponse({
      success: false,
      message: 'Domain not in default list'
    }, 404);
  }
  
  defaults.splice(index, 1);
  await setDefaultDomains(env, defaults);
  
  return jsonResponse({
    success: true,
    message: 'Domain removed from defaults',
    domain
  }, 200);
}
```

**验收标准**:
- ✅ 需要有效 Token 才能访问
- ✅ 域名不在默认列表返回 404
- ✅ 成功移除返回 200
- ✅ 操作幂等

---

### 5.6 更新路由分发器

**文件**: `src/routes/index.js`

**改动**:
```javascript
import { handleDomains } from './admin/domains.js';

// 在管理员路由部分添加
if (path.startsWith('/api/admin/domains/')) {
  return withAdminAuth(handleDomains)(request, env);
}
```

**验收标准**:
- ✅ 所有域名管理路由都需要 Token
- ✅ 路由匹配规则正确
- ✅ 404 路由正常工作

---

## API 路由表

| 路径 | 方法 | 鉴权 | 限流 | 说明 |
|------|------|------|------|------|
| `/api/admin/domains` | GET | ✅ | ❌（豁免） | 获取所有域名 |
| `/api/admin/domains` | POST | ✅ | ❌（豁免） | 添加域名 |
| `/api/admin/domains/:domain` | DELETE | ✅ | ❌（豁免） | 删除域名 |
| `/api/admin/domains/:domain/default` | POST | ✅ | ❌（豁免） | 设为默认展示 |
| `/api/admin/domains/:domain/default` | DELETE | ✅ | ❌（豁免） | 取消默认展示 |

---

## 相关文件

### 新增文件
- `src/routes/admin/domains.js` - 域名管理路由（5 个 API）

### 更新文件
- `src/routes/index.js` - 添加域名管理路由

### 依赖模块
- `src/middleware/auth.js` - 鉴权中间件
- `src/storage/kv.js` - KV 存储操作
- `src/storage/default-domains.js` - 默认域名管理
- `src/utils/helper.js` - 域名清洗

---

## 实现步骤

### 步骤 1: 创建路由文件
```bash
touch src/routes/admin/domains.js
```

### 步骤 2: 实现 handleDomains 路由分发函数
```javascript
export async function handleDomains(request, env) {
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (path === '/api/admin/domains') {
    if (method === 'GET') return handleGetDomains(request, env);
    if (method === 'POST') return handleAddDomain(request, env);
  }
  
  if (path.endsWith('/default')) {
    if (method === 'POST') return handleSetDefaultDomain(request, env);
    if (method === 'DELETE') return handleRemoveDefaultDomain(request, env);
  }
  
  if (method === 'DELETE') {
    return handleDeleteDomain(request, env);
  }
  
  return jsonResponse({ code: 405, msg: 'Method not allowed' }, 405);
}
```

### 步骤 3: 实现各个处理函数
- `handleGetDomains` - 获取域名列表
- `handleAddDomain` - 添加域名
- `handleDeleteDomain` - 删除域名
- `handleSetDefaultDomain` - 设为默认
- `handleRemoveDefaultDomain` - 取消默认

### 步骤 4: 更新路由分发器
在 `src/routes/index.js` 中添加域名管理路由

### 步骤 5: 编写集成测试
创建 `tests/integration/domains.test.js`，包含 20+ 个测试

### 步骤 6: 运行测试验证
```bash
npm test
```

---

## 测试计划

### 集成测试（20+ 个测试）

**文件**: `tests/integration/domains.test.js`

**测试场景**:

1. **GET /api/admin/domains** (3 个测试)
   - ✅ 空列表返回
   - ✅ 有数据返回
   - ✅ 无 Token 返回 401

2. **POST /api/admin/domains** (6 个测试)
   - ✅ 添加新域名成功
   - ✅ 添加重复域名返回 409
   - ✅ 添加无效域名返回 400
   - ✅ 域名自动清洗（带协议）
   - ✅ 域名自动清洗（带端口）
   - ✅ 无 Token 返回 401

3. **DELETE /api/admin/domains/:domain** (4 个测试)
   - ✅ 删除存在的域名
   - ✅ 删除不存在的域名返回 404
   - ✅ 无 Token 返回 401
   - ✅ 删除后列表更新

4. **POST /api/admin/domains/:domain/default** (4 个测试)
   - ✅ 设为默认成功
   - ✅ 域名不在列表返回 404
   - ✅ 重复设置幂等
   - ✅ 无 Token 返回 401

5. **DELETE /api/admin/domains/:domain/default** (4 个测试)
   - ✅ 取消默认成功
   - ✅ 不在默认列表返回 404
   - ✅ 操作幂等
   - ✅ 无 Token 返回 401

6. **边界场景** (2 个测试)
   - ✅ 特殊字域名处理
   - ✅ 大小写敏感测试

---

## 验收标准

### 功能验收
- ✅ 所有 `/api/admin/domains/*` API 需要有效 Token
- ✅ GET 返回域名列表和数量
- ✅ POST 添加域名（支持自动清洗）
- ✅ DELETE 删除域名
- ✅ POST /:domain/default 设为默认展示
- ✅ DELETE /:domain/default 取消默认展示

### 代码质量
- ✅ 中间件正确使用（`withAdminAuth`）
- ✅ 完整的 JSDoc 类型注释
- ✅ 遵循现有代码风格
- ✅ 错误处理完善
- ✅ 响应格式一致

### 测试覆盖
- ✅ 至少 20 个测试用例
- ✅ 包含边界场景测试
- ✅ 所有测试通过
- ✅ 测试代码有 JSDoc 注释

---

## 下一步

- **任务 6**: 检测配置 API（获取/更新配置）
- **任务 7**: DoH 配置 API
- **任务 8**: 检测操作 API

---

## 相关文件

- `/workspace/src/routes/admin/domains.js` - 域名管理路由
- `/workspace/src/middleware/auth.js` - 鉴权中间件
- `/workspace/src/storage/kv.js` - KV 存储
- `/workspace/src/storage/default-domains.js` - 默认域名管理
- `/workspace/tests/integration/domains.test.js` - 集成测试（待创建）
