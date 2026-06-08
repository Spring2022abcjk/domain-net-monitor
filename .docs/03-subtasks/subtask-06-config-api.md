# 任务 6：检测配置 API - 子任务分解

**创建时间**: 2026-05-29  
**任务状态**: ⏳ 待开始  
**预计工期**: 0.5 天

---

## 任务目标

实现检测配置管理 API，支持获取和更新检测相关的配置（刷新频率、限流、历史保留天数等）。

---

## 子任务列表

### 6.1 实现获取配置 API

**文件**: `src/routes/admin/config.js`

**API**: `GET /api/admin/config`

**请求**:
```http
GET /api/admin/config
X-API-Token: <admin-token>
```

**响应（成功）**:
```json
{
  "defaultRefreshInterval": 43200,
  "rateLimit": {
    "windowMs": 60000,
    "maxRequests": 10
  },
  "historyRetention": 7,
  "defaultDomains": ["cloudflare.com", "google.com"],
  "doh": {
    "primary": "https://cloudflare-dns.com/dns-query",
    "backup": "https://dns.google/resolve"
  }
}
```

**实现要点**:
```javascript
import { getConfig } from '../../storage/config.js';
import { withAdminAuth } from '../../middleware/auth.js';

async function handleGetConfig(request, env) {
  const config = await getConfig(env);
  
  return new Response(JSON.stringify(config), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**验收标准**:
- ✅ 需要有效 Token 才能访问
- ✅ 返回完整配置对象
- ✅ 嵌套结构正确（rateLimit, doh）
- ✅ 响应包含 CORS 头

---

### 6.2 实现更新配置 API

**文件**: `src/routes/admin/config.js`

**API**: `PUT /api/admin/config`

**请求**:
```http
PUT /api/admin/config
X-API-Token: <admin-token>
Content-Type: application/json

{
  "defaultRefreshInterval": 86400,
  "rateLimit": {
    "windowMs": 120000,
    "maxRequests": 20
  },
  "historyRetention": 14,
  "defaultDomains": ["cloudflare.com", "google.com"],
  "doh": {
    "primary": "https://new-doh.com",
    "backup": "https://backup-doh.com"
  }
}
```

**响应（成功）**:
```json
{
  "success": true,
  "message": "Config updated successfully",
  "config": {
    "defaultRefreshInterval": 86400,
    "rateLimit": {
      "windowMs": 120000,
      "maxRequests": 20
    }
  }
}
```

**响应（部分更新）**:
```http
PUT /api/admin/config
{
  "defaultRefreshInterval": 7200
}
```

**响应（成功）**:
```json
{
  "success": true,
  "message": "Config updated successfully (partial update)",
  "config": {
    "defaultRefreshInterval": 7200,
    "rateLimit": {
      "windowMs": 60000,
      "maxRequests": 10
    }
  }
}
```

**响应（验证失败）**:
```json
{
  "success": false,
  "message": "Validation error: defaultRefreshInterval must be positive number"
}
```

**实现要点**:
```javascript
import { setConfig, getConfig } from '../../storage/config.js';

async function handleUpdateConfig(request, env) {
  const body = await request.json();
  
  // 验证配置
  if (body.defaultRefreshInterval) {
    if (typeof body.defaultRefreshInterval !== 'number' || body.defaultRefreshInterval <= 0) {
      return jsonResponse({
        success: false,
        message: 'Validation error: defaultRefreshInterval must be positive number'
      }, 400);
    }
  }
  
  if (body.rateLimit) {
    if (body.rateLimit.windowMs && body.rateLimit.windowMs <= 0) {
      return jsonResponse({
        success: false,
        message: 'Validation error: rateLimit.windowMs must be positive number'
      }, 400);
    }
  }
  
  // 部分更新：先获取现有配置，再合并
  const currentConfig = await getConfig(env);
  const newConfig = {
    ...currentConfig,
    ...body,
    rateLimit: {
      ...currentConfig.rateLimit,
      ...(body.rateLimit || {})
    },
    doh: {
      ...currentConfig.doh,
      ...(body.doh || {})
    }
  };
  
  await setConfig(env, newConfig);
  
  return jsonResponse({
    success: true,
    message: 'Config updated successfully',
    config: newConfig
  }, 200);
}
```

**验收标准**:
- ✅ 需要有效 Token 才能访问
- ✅ 支持部分更新
- ✅ 嵌套对象正确合并（rateLimit, doh）
- ✅ 配置验证失败返回 400
- ✅ 成功返回 200 及完整配置

---

### 6.3 配置验证逻辑

**文件**: `src/routes/admin/config.js`

**验证规则**:
```javascript
function validateConfig(config) {
  const errors = [];
  
  // defaultRefreshInterval: 正整数（秒）
  if (config.defaultRefreshInterval !== undefined) {
    if (typeof config.defaultRefreshInterval !== 'number' || config.defaultRefreshInterval <= 0) {
      errors.push('defaultRefreshInterval must be a positive number');
    }
  }
  
  // rateLimit.windowMs: 正整数（毫秒）
  if (config.rateLimit?.windowMs !== undefined) {
    if (typeof config.rateLimit.windowMs !== 'number' || config.rateLimit.windowMs <= 0) {
      errors.push('rateLimit.windowMs must be a positive number');
    }
  }
  
  // rateLimit.maxRequests: 正整数
  if (config.rateLimit?.maxRequests !== undefined) {
    if (typeof config.rateLimit.maxRequests !== 'number' || config.rateLimit.maxRequests <= 0 || !Number.isInteger(config.rateLimit.maxRequests)) {
      errors.push('rateLimit.maxRequests must be a positive integer');
    }
  }
  
  // historyRetention: 正整数（天）
  if (config.historyRetention !== undefined) {
    if (typeof config.historyRetention !== 'number' || config.historyRetention <= 0) {
      errors.push('historyRetention must be a positive number');
    }
  }
  
  // defaultDomains: 数组
  if (config.defaultDomains !== undefined) {
    if (!Array.isArray(config.defaultDomains)) {
      errors.push('defaultDomains must be an array');
    }
  }
  
  // doh.primary: URL 字符串
  if (config.doh?.primary !== undefined) {
    if (typeof config.doh.primary !== 'string' || !config.doh.primary.startsWith('http')) {
      errors.push('doh.primary must be a valid URL');
    }
  }
  
  // doh.backup: URL 字符串
  if (config.doh?.backup !== undefined) {
    if (typeof config.doh.backup !== 'string' || !config.doh.backup.startsWith('http')) {
      errors.push('doh.backup must be a valid URL');
    }
  }
  
  return errors;
}
```

**验收标准**:
- ✅ 验证所有配置字段
- ✅ 返回详细的错误信息
- ✅ 支持部分验证（只验证提供的字段）

---

### 6.4 更新路由分发器

**文件**: `src/routes/index.js`

**改动**:
```javascript
import { handleConfig } from './admin/config.js';

// 更新配置路由
if (path === '/api/admin/config/security' && method === 'GET') {
  return withAdminAuth(handleConfig)(request, env);
}

// 添加通用配置路由
if (path === '/api/admin/config' && method === 'GET') {
  return withAdminAuth(handleConfig)(request, env);
}

if (path === '/api/admin/config' && method === 'PUT') {
  return withAdminAuth(handleConfig)(request, env);
}
```

**验收标准**:
- ✅ GET /api/admin/config 路由正确
- ✅ PUT /api/admin/config 路由正确
- ✅ 所有配置路由需要 Token
- ✅ 404 路由正常工作

---

### 6.5 配置持久化测试

**场景**: 验证配置更新后能正确持久化到 KV 存储

**测试步骤**:
1. 调用 GET /api/admin/config 获取初始配置
2. 调用 PUT /api/admin/config 更新部分配置
3. 再次调用 GET /api/admin/config 验证更新生效
4. 验证未修改的配置保持不变

---

## API 路由表

| 路径 | 方法 | 鉴权 | 限流 | 说明 |
|------|------|------|------|------|
| `/api/admin/config` | GET | ✅ | ❌（豁免） | 获取检测配置 |
| `/api/admin/config` | PUT | ✅ | ❌（豁免） | 更新检测配置 |
| `/api/admin/config/security` | GET | ✅ | ❌（豁免） | 安全配置查询（已在任务 4 实现） |

---

## 相关文件

### 新增/更新文件
- `src/routes/admin/config.js` - 配置路由（新增通用配置 API）

### 更新文件
- `src/routes/index.js` - 添加配置路由
- `tests/integration/config.test.js` - 集成测试

### 依赖模块
- `src/middleware/auth.js` - 鉴权中间件
- `src/storage/config.js` - 配置管理（已在任务 2 实现）
- `src/storage/default-domains.js` - 默认域名管理

---

## 实现步骤

### 步骤 1: 更新配置路由文件
在 `src/routes/admin/config.js` 中添加通用配置 API

### 步骤 2: 实现 handleGetConfig 函数
```javascript
async function handleGetConfig(request, env) {
  const config = await getConfig(env);
  return new Response(JSON.stringify(config), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 步骤 3: 实现 handleUpdateConfig 函数
```javascript
async function handleUpdateConfig(request, env) {
  // 1. 解析请求体
  // 2. 验证配置
  // 3. 部分更新合并
  // 4. 保存到 KV
  // 5. 返回成功响应
}
```

### 步骤 4: 实现配置验证函数
```javascript
function validateConfig(config) {
  // 验证所有配置字段
  // 返回错误列表
}
```

### 步骤 5: 更新路由分发器
在 `src/routes/index.js` 中添加配置路由规则

### 步骤 6: 编写集成测试
创建 `tests/integration/config.test.js`，包含 15+ 个测试

---

## 测试计划

### 集成测试（15+ 个测试）

**文件**: `tests/integration/config.test.js`

**测试场景**:

1. **GET /api/admin/config** (3 个测试)
   - ✅ 获取完整配置
   - ✅ 配置嵌套结构正确
   - ✅ 无 Token 返回 401

2. **PUT /api/admin/config - 完整更新** (4 个测试)
   - ✅ 更新所有配置项成功
   - ✅ 返回更新后的配置
   - ✅ KV 存储正确保存
   - ✅ 无 Token 返回 401

3. **PUT /api/admin/config - 部分更新** (3 个测试)
   - ✅ 只更新 refreshInterval
   - ✅ 只更新 rateLimit
   - ✅ 验证其他配置保持不变

4. **PUT /api/admin/config - 验证失败** (3 个测试)
   - ✅ 刷新频率为负数返回 400
   - ✅ rateLimit.windowMs 非正数返回 400
   - ✅ defaultDomains 不是数组返回 400

5. **边界场景** (2 个测试)
   - ✅ 最小 refreshInterval (1 秒)
   - ✅ 最大 historyRetention (365 天)

---

## 配置项详解

### defaultRefreshInterval
- **类型**: Number
- **单位**: 秒
- **默认值**: 43200 (12 小时)
- **描述**: 定时检测的刷新间隔
- **验证**: 正整数

### rateLimit
- **类型**: Object
- **字段**:
  - `windowMs`: Number (毫秒), 默认 60000 (1 分钟)
  - `maxRequests`: Number, 默认 10
- **描述**: 限流配置
- **验证**: windowMs > 0, maxRequests > 0

### historyRetention
- **类型**: Number
- **单位**: 天
- **默认值**: 7
- **描述**: 历史记录保留天数
- **验证**: 正整数

### defaultDomains
- **类型**: Array<String>
- **默认值**: []
- **描述**: 默认展示的域名列表
- **验证**: 字符串数组

### doh
- **类型**: Object
- **字段**:
  - `primary`: String (URL)
  - `backup`: String (URL)
- **默认值**: 
  - primary: `https://cloudflare-dns.com/dns-query`
  - backup: `https://dns.google/resolve`
- **描述**: DoH 端点配置
- **验证**: 有效的 HTTP(S) URL

---

## 验收标准

### 功能验收
- ✅ GET /api/admin/config 返回完整配置
- ✅ PUT /api/admin/config 支持完整更新
- ✅ PUT /api/admin/config 支持部分更新
- ✅ 配置验证失败返回 400
- ✅ 嵌套对象正确合并（rateLimit, doh）
- ✅ 配置持久化到 KV 存储

### 代码质量
- ✅ 中间件正确使用（`withAdminAuth`）
- ✅ 完整的 JSDoc 类型注释
- ✅ 遵循现有代码风格
- ✅ 错误处理完善
- ✅ 配置验证逻辑清晰

### 测试覆盖
- ✅ 至少 15 个测试用例
- ✅ 包含部分更新测试
- ✅ 包含边界场景测试
- ✅ 所有测试通过

---

## 下一步

- **任务 7**: DoH 配置 API（端点测试功能）
- **任务 8**: 检测操作 API（单域名/批量检测）
- **任务 9**: 历史记录 API

---

## 相关文件

- `/workspace/src/routes/admin/config.js` - 配置路由
- `/workspace/src/middleware/auth.js` - 鉴权中间件
- `/workspace/src/storage/config.js` - 配置管理
- `/workspace/tests/integration/config.test.js` - 集成测试（待创建）
