# 子任务 3：CORS 中间件实现

## 任务目标

实现动态 CORS 中间件，根据环境变量 `ALLOWED_ORIGINS` 控制允许的跨域来源。

---

## 子任务步骤

### 3.1 实现动态 CORS 头生成函数

```javascript
// src/utils/helper.js

/**
 * 动态生成 CORS 头
 * 从环境变量读取允许的来源
 * 
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量对象
 * @returns {Object} CORS 响应头对象
 */
export function getCorsHeaders(request, env) {
  const allowedOrigins = env.ALLOWED_ORIGINS || '*';
  const origin = request.headers.get('Origin') || '';
  
  // 如果是 *，直接返回（允许所有）
  if (allowedOrigins === '*') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Token',
      'Access-Control-Max-Age': '86400'  // CORS 预检结果缓存 24 小时
    };
  }
  
  // 解析多个允许的 origin（逗号分隔）
  const origins = allowedOrigins.split(',').map(o => o.trim());
  
  // 检查当前请求的 origin 是否在白名单中
  if (origins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Token',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'  // 告诉 CDN 根据 Origin 缓存不同版本
    };
  }
  
  // 不在白名单，返回空 CORS 头（浏览器会阻止跨域请求）
  return {};
}

/**
 * OPTIONS 预检请求处理
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量对象
 * @returns {Response} 204 No Content 响应
 */
export function handleOptionsRequest(request, env) {
  const corsHeaders = getCorsHeaders(request, env);
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}
```

**文件**: `/workspace/src/utils/helper.js`

### 3.2 更新 Worker 入口集成 CORS

```javascript
// src/index.js

import { getCorsHeaders, handleOptionsRequest } from './utils/helper.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    
    // 1. 处理 OPTIONS 预检请求
    if (method === 'OPTIONS') {
      return handleOptionsRequest(request, env);
    }
    
    // 2. 生成 CORS 头（用于后续响应）
    const corsHeaders = getCorsHeaders(request, env);
    
    // 3. 处理业务请求
    let response;
    
    try {
      response = await handleRequest(request, env);
    } catch (error) {
      console.error('Unhandled error:', error);
      response = new Response(JSON.stringify({
        code: 500,
        data: null,
        msg: `Internal Server Error: ${error.message}`
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // 4. 添加 CORS 头到响应
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    
    return response;
  }
};
```

**文件**: `/workspace/src/index.js`

### 3.3 更新鉴权中间件（任务 4 的部分）

```javascript
// src/middleware/auth.js (新建)

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

### 3.4 测试 CORS 配置

创建测试脚本：

```bash
#!/bin/bash

# 测试 CORS 配置

export API_ENDPOINT="http://localhost:8787"

echo "=== 测试 1: OPTIONS 预检请求 ==="
curl -v -X OPTIONS $API_ENDPOINT/api/admin/config \
  -H "Origin: https://your-single.your-domain.pages.dev" \
  2>&1 | grep -i "access-control"

echo ""
echo "=== 测试 2: 不在白名单的 Origin ==="
curl -v -X OPTIONS $API_ENDPOINT/api/admin/config \
  -H "Origin: https://evil.com" \
  2>&1 | grep -i "access-control"

echo ""
echo "=== 测试 3: 允许所有（开发环境） ==="
curl -v -X OPTIONS $API_ENDPOINT/api/admin/config \
  -H "Origin: https://any.com" \
  2>&1 | grep -i "access-control"
```

**文件**: `/workspace/tests/cors-test.sh`

---

## CORS 配置逻辑

```
ALLOWED_ORIGINS = "*"
  ↓
返回：Access-Control-Allow-Origin: *

ALLOWED_ORIGINS = "https://a.com,https://b.com"
  ↓
请求 Origin = "https://a.com"
  ↓
返回：Access-Control-Allow-Origin: https://a.com
     Vary: Origin

请求 Origin = "https://evil.com"
  ↓
返回：（空，无 CORS 头）
  ↓
浏览器阻止跨域请求
```

---

## 安全考虑

| 场景 | CORS 配置 | 安全等级 |
|------|---------|---------|
| 开发环境 | `ALLOWED_ORIGINS=*` | ⭐⭐ 低（允许所有） |
| 生产环境 - 单前端 | `ALLOWED_ORIGINS=https://your-single.your-domain.pages.dev` | ⭐⭐⭐⭐ 高 |
| 生产环境 - 多前端 | `ALLOWED_ORIGINS=https://a.com,https://b.com` | ⭐⭐⭐⭐ 高 |

**注意**：
- CORS 只是第一层防护，真正的安全靠 Token 认证
- `Vary: Origin` 告诉 CDN 根据不同 Origin 缓存不同版本
- `Access-Control-Max-Age` 减少预检请求次数

---

## 验收标准

1. ✅ `getCorsHeaders()` 函数正确处理 `*` 和指定域名列表
2. ✅ OPTIONS 预检请求返回正确的 CORS 头
3. ✅ 不在白名单的 Origin 无法访问管理 API
4. ✅ Worker 入口正确集成 CORS 中间件
5. ✅ `Vary: Origin` 头正确添加（用于 CDN 缓存）
6. ✅ 测试脚本验证 CORS 配置生效

---

## 相关文件

- `src/utils/helper.js` - CORS 头生成函数
- `src/index.js` - Worker 入口集成
- `src/middleware/auth.js` - Token 认证中间件
- `tests/cors-test.sh` - CORS 配置测试脚本

---

## 后续依赖

- 任务 4：管理员认证 API（需要同样的 CORS 处理）
- 任务 22：前后端联调（验证 CORS 配置正确）
