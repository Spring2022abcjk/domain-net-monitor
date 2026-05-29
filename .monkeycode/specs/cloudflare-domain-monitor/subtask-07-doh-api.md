# 子任务 7：DoH 配置 API

## 任务目标

实现管理员对 DoH（DNS over HTTPS）端点的配置和测试功能。

---

## API 端点

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/admin/doh` | 获取 DoH 端点配置 | ✅ |
| PUT | `/api/admin/doh` | 更新 DoH 端点 | ✅ |
| POST | `/api/admin/doh/test` | 测试 DoH 端点可用性 | ✅ |

---

## 子任务步骤

### 7.1 更新配置存储（添加 DoH 字段）

```javascript
// src/storage/config.js

const DEFAULT_CONFIG = {
  defaultRefreshInterval: 43200,
  rateLimit: {
    windowMs: 60000,
    maxRequests: 10
  },
  historyRetention: 7,
  defaultDomains: [],
  doh: {
    primary: 'https://cloudflare-dns.com/dns-query',
    backup: 'https://dns.google/resolve'
  }
};

// getConfig 和 updateConfig 会自动处理 doh 字段
```

**文件**: `/workspace/src/config.js`

### 7.2 DoH 配置路由

```javascript
// src/routes/admin/doh.js

import { jsonResponse } from '../../utils/helper.js';
import { getConfig, updateConfig } from '../../storage/config.js';
import { fetchWithTimeout } from '../../utils/helper.js';

/**
 * 获取 DoH 端点
 * GET /api/admin/doh
 */
async function getDohConfig(request, env) {
  const config = await getConfig(env);
  
  return jsonResponse({
    primary: config.doh.primary,
    backup: config.doh.backup
  });
}

/**
 * 更新 DoH 端点
 * PUT /api/admin/doh
 */
async function updateDohConfig(request, env) {
  try {
    const body = await request.json();
    const updates = {};
    
    // 验证主 DoH 端点
    if (body.primary && isValidDohUrl(body.primary)) {
      updates.primary = body.primary;
    } else if (body.primary) {
      return new Response(JSON.stringify({
        code: 400,
        data: null,
        msg: 'Invalid primary DoH URL format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 验证备用 DoH 端点
    if (body.backup && isValidDohUrl(body.backup)) {
      updates.backup = body.backup;
    } else if (body.backup) {
      return new Response(JSON.stringify({
        code: 400,
        data: null,
        msg: 'Invalid backup DoH URL format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({
        code: 400,
        data: null,
        msg: 'No valid fields to update'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const config = await getConfig(env);
    config.doh = { ...config.doh, ...updates };
    
    await updateConfig(env, config);
    
    return jsonResponse({
      primary: config.doh.primary,
      backup: config.doh.backup
    }, 200, 'DoH configuration updated successfully');
  } catch (error) {
    return new Response(JSON.stringify({
      code: 400,
      data: null,
      msg: 'Invalid request body'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 测试 DoH 端点
 * POST /api/admin/doh/test
 */
async function testDohEndpoint(request, env) {
  try {
    const body = await request.json();
    const { url, timeout = 5000 } = body;
    
    if (!url || !isValidDohUrl(url)) {
      return new Response(JSON.stringify({
        code: 400,
        data: null,
        msg: 'Invalid or missing URL parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const startTime = Date.now();
    
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/dns-json'
        }
      }, timeout);
      
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        return jsonResponse({
          url,
          success: true,
          latency,
          status: response.status,
          message: 'DoH endpoint is reachable'
        });
      } else {
        return jsonResponse({
          url,
          success: false,
          latency,
          status: response.status,
          message: `HTTP ${response.status}`
        }, 200);
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      
      return jsonResponse({
        url,
        success: false,
        latency,
        status: null,
        message: error.message || 'Connection failed'
      }, 200);
    }
  } catch (error) {
    return new Response(JSON.stringify({
      code: 400,
      data: null,
      msg: 'Invalid request body'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 验证 DoH URL 格式
 */
function isValidDohUrl(url) {
  if (typeof url !== 'string') {
    return false;
  }
  
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

export const router = {
  getDohConfig,
  updateDohConfig,
  testDohEndpoint
};
```

**文件**: `/workspace/src/routes/admin/doh.js`

### 7.3 更新管理路由分发

```javascript
// src/routes/admin/index.js

import { router as dohRouter } from './doh.js';

const adminRoutes = {
  // ... 其他路由
  '/api/admin/doh': {
    GET: dohRouter.getDohConfig,
    PUT: dohRouter.updateDohConfig
  },
  '/api/admin/doh/test': {
    POST: dohRouter.testDohEndpoint
  }
};

// ... 导出 handleAdminRoute
```

**文件**: `/workspace/src/routes/admin/index.js`

---

## 常见 DoH 端点

| 服务商 | URL | 说明 |
|--------|-----|------|
| Cloudflare | `https://cloudflare-dns.com/dns-query` | 推荐，速度快 |
| Google | `https://dns.google/resolve` | 备用选择 |
| AdGuard | `https://dns.adguard.com/dns-query` | 带广告拦截 |
| Quad9 | `https://dns.quad9.net/dns-query` | 安全 DNS |

---

## 验收标准

1. ✅ GET `/api/admin/doh` 返回当前 DoH 配置
2. ✅ PUT `/api/admin/doh` 验证 URL 格式并更新
3. ✅ POST `/api/admin/doh/test` 测试端点连通性
4. ✅ 测试返回延迟（latency）
5. ✅ 超时处理正确（默认 5 秒）
6. ✅ 错误响应清晰（网络错误 vs HTTP 错误）

---

## 测试用例

```bash
export TOKEN="ff10a24df88c7be158ff06f34e36707044b681f02ef090b569806d779e721703"

# 获取 DoH 配置
curl -X GET http://localhost:8787/api/admin/doh \
  -H "X-API-Token: $TOKEN" | jq

# 更新 DoH 配置
curl -X PUT http://localhost:8787/api/admin/doh \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{
    "primary": "https://cloudflare-dns.com/dns-query",
    "backup": "https://dns.google/resolve"
  }' | jq

# 测试 DoH 端点（Cloudflare）
curl -X POST http://localhost:8787/api/admin/doh/test \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{
    "url": "https://cloudflare-dns.com/dns-query"
  }' | jq

# 测试 DoH 端点（Google）
curl -X POST http://localhost:8787/api/admin/doh/test \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{
    "url": "https://dns.google/resolve"
  }' | jq

# 测试自定义超时
curl -X POST http://localhost:8787/api/admin/doh/test \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{
    "url": "https://cloudflare-dns.com/dns-query",
    "timeout": 3000
  }' | jq

# 测试无效 URL（应返回 400）
curl -X POST http://localhost:8787/api/admin/doh/test \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{
    "url": "invalid-url"
  }' | jq
```

---

## 响应示例

### GET /api/admin/doh

```json
{
  "code": 200,
  "data": {
    "primary": "https://cloudflare-dns.com/dns-query",
    "backup": "https://dns.google/resolve"
  },
  "msg": "success"
}
```

### POST /api/admin/doh/test（成功）

```json
{
  "code": 200,
  "data": {
    "url": "https://cloudflare-dns.com/dns-query",
    "success": true,
    "latency": 45,
    "status": 200,
    "message": "DoH endpoint is reachable"
  },
  "msg": "success"
}
```

### POST /api/admin/doh/test（失败）

```json
{
  "code": 200,
  "data": {
    "url": "https://invalid.example.com",
    "success": false,
    "latency": 5002,
    "status": null,
    "message": "Request timeout after 5000ms"
  },
  "msg": "success"
}
```

---

## 相关文件

- `src/storage/config.js` - 配置存储（包含 DoH）
- `src/routes/admin/doh.js` - DoH 配置路由
- `src/routes/admin/index.js` - 管理路由分发

---

## 后续依赖

- 现有检测逻辑使用 `config.doh.primary` 和 `config.doh.backup`
