# 子任务 4:管理员认证 API

## 任务目标

实现管理员认证相关 API 端点，包括 Token 验证、注销登录、查看安全配置。

---

## API 端点

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/admin/auth/verify` | 验证 Token 是否有效 | ❌ |
| POST | `/api/admin/auth/logout` | 注销登录（可选） | ❌ |
| GET | `/api/admin/config/security` | 查看安全配置 | ✅ |

---

## 子任务步骤

### 4.1 实现鉴权中间件

```javascript
// src/middleware/auth.js

/**
 * 检查 API Token 是否有效
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量对象
 * @returns {boolean} Token 是否有效
 */
export function isValidAdminToken(request, env) {
  const token = request.headers.get('X-API-Token');
  
  if (!token) {
    return false;
  }
  
  if (!env.CLOUDFLARE_API_TOKEN) {
    console.warn('CLOUDFLARE_API_TOKEN not configured');
    return false;
  }
  
  return token === env.CLOUDFLARE_API_TOKEN;
}

/**
 * 鉴权中间件包装器
 * @param {Function} handler - 处理函数
 * @returns {Function} 包装后的处理函数
 */
export function withAdminAuth(handler) {
  return async (request, env) => {
    if (!isValidAdminToken(request, env)) {
      return new Response(JSON.stringify({
        code: 401,
        data: null,
        msg: 'Invalid or missing API Token'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return handler(request, env);
  };
}
```

**文件**: `/workspace/src/middleware/auth.js`

### 4.2 实现认证路由

```javascript
// src/routes/admin/auth.js

import { isValidAdminToken } from '../../middleware/auth.js';
import { jsonResponse } from '../../utils/helper.js';

/**
 * 验证 Token
 * POST /api/admin/auth/verify
 */
async function verifyToken(request, env) {
  const token = request.headers.get('X-API-Token');
  
  if (!token) {
    return new Response(JSON.stringify({
      code: 400,
      data: { valid: false },
      msg: 'Missing X-API-Token header'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const isValid = isValidAdminToken(request, env);
  
  return jsonResponse({
    valid: isValid,
    expiresIn: 86400 * 7  // 7 天（前端自行控制）
  }, 200, isValid ? 'Token is valid' : 'Invalid token');
}

/**
 * 注销登录（可选）
 * POST /api/admin/auth/logout
 * 注：Token 认证是无状态的，此端点主要用于前端清理 localStorage
 */
async function logout(request, env) {
  return jsonResponse(null, 200, 'Logged out successfully');
}

/**
 * 查看安全配置
 * GET /api/admin/config/security
 */
async function getSecurityConfig(request, env) {
  const allowedOrigins = env.ALLOWED_ORIGINS || '*';
  const tokenConfigured = !!env.CLOUDFLARE_API_TOKEN;
  
  return jsonResponse({
    cors: {
      allowedOrigins,
      isWildcard: allowedOrigins === '*'
    },
    auth: {
      tokenConfigured,
      tokenLength: tokenConfigured ? env.CLOUDFLARE_API_TOKEN.length : 0
    }
  });
}

export const router = {
  verifyToken,
  logout,
  getSecurityConfig
};
```

**文件**: `/workspace/src/routes/admin/auth.js`

### 4.3 注册管理路由

```javascript
// src/routes/admin/index.js (新建)

import { isValidAdminToken } from '../../middleware/auth.js';
import { router as authRouter } from './auth.js';

// 管理员路由表
const adminRoutes = {
  '/api/admin/auth/verify': {
    POST: authRouter.verifyToken
  },
  '/api/admin/auth/logout': {
    POST: authRouter.logout
  },
  '/api/admin/config/security': {
    GET: authRouter.getSecurityConfig
  }
};

/**
 * 管理路由处理器
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量对象
 * @returns {Response|null} 如果是管理路由则返回响应，否则返回 null
 */
export async function handleAdminRoute(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  const route = adminRoutes[path];
  if (!route) {
    return null;  // 不是管理路由
  }
  
  const handler = route[method];
  if (!handler) {
    return new Response(JSON.stringify({
      code: 405,
      data: null,
      msg: `Method ${method} not allowed`
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 部分端点需要鉴权（verify 和 logout 不需要）
  const requiresAuth = path !== '/api/admin/auth/verify' && path !== '/api/admin/auth/logout';
  
  if (requiresAuth && !isValidAdminToken(request, env)) {
    return new Response(JSON.stringify({
      code: 401,
      data: null,
      msg: 'Invalid or missing API Token'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return handler(request, env);
}
```

**文件**: `/workspace/src/routes/admin/index.js`

### 4.4 集成到主路由

```javascript
// src/routes/index.js

import { handleAdminRoute } from './admin/index.js';
// ...其他导入

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 1. 先检查是否是管理路由
  const adminResponse = await handleAdminRoute(request, env);
  if (adminResponse !== null) {
    return adminResponse;
  }
  
  // 2. 现有公开路由处理...
  // ...
}
```

**文件**: `/workspace/src/routes/index.js`

---

## 验收标准

1. ✅ `src/middleware/auth.js` 鉴权中间件实现
2. ✅ `src/routes/admin/auth.js` 认证路由实现
3. ✅ `src/routes/admin/index.js` 管理路由分发
4. ✅ 主路由集成管理路由
5. ✅ `/api/admin/auth/verify` 可验证 Token
6. ✅ `/api/admin/config/security` 需 Token 才能访问
7. ✅ 返回格式符合 API 规范

---

## 测试用例

### 测试 1: 验证有效 Token

```bash
curl -X POST http://localhost:8787/api/admin/auth/verify \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ff10a24df88c7be158ff06f34e36707044b681f02ef090b569806d779e721703"
```

期望响应：
```json
{
  "code": 200,
  "data": { "valid": true, "expiresIn": 604800 },
  "msg": "Token is valid"
}
```

### 测试 2: 验证无效 Token

```bash
curl -X POST http://localhost:8787/api/admin/auth/verify \
  -H "Content-Type: application/json" \
  -H "X-API-Token: wrong_token"
```

期望响应：
```json
{
  "code": 200,
  "data": { "valid": false },
  "msg": "Invalid token"
}
```

### 测试 3: 未授权访问安全配置

```bash
curl -X GET http://localhost:8787/api/admin/config/security
```

期望响应：
```json
{
  "code": 401,
  "data": null,
  "msg": "Invalid or missing API Token"
}
```

### 测试 4: 授权访问安全配置

```bash
curl -X GET http://localhost:8787/api/admin/config/security \
  -H "X-API-Token: ff10a24df88c7be158ff06f34e36707044b681f02ef090b569806d779e721703"
```

期望响应：
```json
{
  "code": 200,
  "data": {
    "cors": { "allowedOrigins": "*", "isWildcard": true },
    "auth": { "tokenConfigured": true, "tokenLength": 64 }
  },
  "msg": "success"
}
```

---

## 相关文件

- `src/middleware/auth.js` - 鉴权中间件
- `src/routes/admin/auth.js` - 认证路由
- `src/routes/admin/index.js` - 管理路由分发
- `src/routes/index.js` - 主路由（集成管理路由）

---

## 后续依赖

- 任务 5-11：所有管理 API 都需要使用 `withAdminAuth` 或 `isValidAdminToken`
