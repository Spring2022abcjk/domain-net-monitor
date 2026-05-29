# 子任务 6：检测配置 API

## 任务目标

实现管理员对检测配置的管理，包括刷新频率、限流设置、历史保留天数等。

---

## API 端点

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/admin/config` | 获取配置 | ✅ |
| PUT | `/api/admin/config` | 更新配置 | ✅ |

---

## 子任务步骤

### 6.1 配置存储模块（如果任务 2 未完成）

```javascript
// src/storage/config.js

import { KV_KEY_CONFIG } from '../config.js';
import { getKV } from './kv.js';

const DEFAULT_CONFIG = {
  defaultRefreshInterval: 43200,  // 12 小时（秒）
  rateLimit: {
    windowMs: 60000,              // 60 秒
    maxRequests: 10               // 10 次/分钟
  },
  historyRetention: 7,            // 7 天
  defaultDomains: []              // 默认域名列表
};

/**
 * 获取配置（读默认值如果不存在）
 */
export async function getConfig(env) {
  const kv = getKV(env);
  const data = await kv.get(KV_KEY_CONFIG);
  
  if (!data) {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  
  const config = JSON.parse(data);
  
  // 深度合并默认值
  return {
    ...DEFAULT_CONFIG,
    ...config,
    rateLimit: { ...DEFAULT_CONFIG.rateLimit, ...config.rateLimit }
  };
}

/**
 * 保存配置
 */
export async function setConfig(env, config) {
  const kv = getKV(env);
  await kv.put(KV_KEY_CONFIG, JSON.stringify(config));
}

/**
 * 更新部分配置
 */
export async function updateConfig(env, updates) {
  const config = await getConfig(env);
  const updated = { ...config, ...updates };
  
  if (updates.rateLimit) {
    updated.rateLimit = { ...config.rateLimit, ...updates.rateLimit };
  }
  
  await setConfig(env, updated);
  return updated;
}
```

**文件**: `/workspace/src/storage/config.js`

### 6.2 配置管理路由

```javascript
// src/routes/admin/config.js

import { jsonResponse } from '../../utils/helper.js';
import { getConfig, updateConfig } from '../../storage/config.js';

/**
 * 获取配置
 * GET /api/admin/config
 */
async function getConfigRoute(request, env) {
  const config = await getConfig(env);
  
  return jsonResponse({
    ...config,
    rateLimit: {
      ...config.rateLimit,
      windowSec: config.rateLimit.windowMs / 1000
    }
  });
}

/**
 * 更新配置
 * PUT /api/admin/config
 */
async function updateConfigRoute(request, env) {
  try {
    const body = await request.json();
    const updates = {};
    
    // 验证并收集有效字段
    if (typeof body.defaultRefreshInterval === 'number' && body.defaultRefreshInterval >= 60) {
      updates.defaultRefreshInterval = body.defaultRefreshInterval;
    }
    
    if (typeof body.historyRetention === 'number' && body.historyRetention >= 1) {
      updates.historyRetention = body.historyRetention;
    }
    
    if (body.rateLimit) {
      const rateLimit = {};
      
      if (typeof body.rateLimit.windowMs === 'number' && body.rateLimit.windowMs >= 1000) {
        rateLimit.windowMs = body.rateLimit.windowMs;
      }
      
      if (typeof body.rateLimit.maxRequests === 'number' && body.rateLimit.maxRequests >= 1) {
        rateLimit.maxRequests = body.rateLimit.maxRequests;
      }
      
      if (Object.keys(rateLimit).length > 0) {
        updates.rateLimit = rateLimit;
      }
    }
    
    // 默认域名列表更新（单独处理）
    if (Array.isArray(body.defaultDomains)) {
      updates.defaultDomains = body.defaultDomains;
    }
    
    const updatedConfig = await updateConfig(env, updates);
    
    return jsonResponse({
      ...updatedConfig,
      rateLimit: {
        ...updatedConfig.rateLimit,
        windowSec: updatedConfig.rateLimit.windowMs / 1000
      }
    }, 200, 'Configuration updated successfully');
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

export const router = {
  getConfigRoute,
  updateConfigRoute
};
```

**文件**: `/workspace/src/routes/admin/config.js`

### 6.3 更新管理路由分发

```javascript
// src/routes/admin/index.js

import { router as configRouter } from './config.js';

const adminRoutes = {
  // ... 其他路由
  '/api/admin/config': {
    GET: configRouter.getConfigRoute,
    PUT: configRouter.updateConfigRoute
  }
};

// ... 导出 handleAdminRoute
```

**文件**: `/workspace/src/routes/admin/index.js`

---

## 配置项说明

| 字段 | 类型 | 默认值 | 说明 | 最小值 |
|------|------|--------|------|--------|
| `defaultRefreshInterval` | number | `43200` | 默认刷新频率（秒） | `60` (1 分钟) |
| `historyRetention` | number | `7` | 历史记录保留天数 | `1` |
| `rateLimit.windowMs` | number | `60000` | 限流窗口时间（毫秒） | `1000` (1 秒) |
| `rateLimit.maxRequests` | number | `10` | 窗口内最大请求数 | `1` |
| `defaultDomains` | array | `[]` | 默认展示域名列表 | - |

---

## 验收标准

1. ✅ `src/storage/config.js` 配置存储实现
2. ✅ `src/routes/admin/config.js` 配置管理路由
3. ✅ GET 端点返回完整配置
4. ✅ PUT 端点支持部分更新
5. ✅ 输入验证正确（最小值检查）
6. ✅ 配置变更后立即可用

---

## 测试用例

```bash
export TOKEN="ff10a24df88c7be158ff06f34e36707044b681f02ef090b569806d779e721703"

# 获取配置
curl -X GET http://localhost:8787/api/admin/config \
  -H "X-API-Token: $TOKEN" | jq

# 更新配置
curl -X PUT http://localhost:8787/api/admin/config \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{
    "defaultRefreshInterval": 21600,
    "historyRetention": 14,
    "rateLimit": {
      "windowMs": 120000,
      "maxRequests": 20
    }
  }' | jq

# 验证更新
curl -X GET http://localhost:8787/api/admin/config \
  -H "X-API-Token: $TOKEN" | jq

# 部分更新（只更新限流）
curl -X PUT http://localhost:8787/api/admin/config \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{
    "rateLimit": {
      "maxRequests": 5
    }
  }' | jq
```

---

## 响应示例

### GET /api/admin/config

```json
{
  "code": 200,
  "data": {
    "defaultRefreshInterval": 43200,
    "historyRetention": 7,
    "rateLimit": {
      "windowMs": 60000,
      "maxRequests": 10,
      "windowSec": 60
    },
    "defaultDomains": ["cloudflare.com", "google.com"]
  },
  "msg": "success"
}
```

### PUT /api/admin/config

```json
{
  "code": 200,
  "data": {
    "defaultRefreshInterval": 21600,
    "historyRetention": 14,
    "rateLimit": {
      "windowMs": 120000,
      "maxRequests": 20,
      "windowSec": 120
    },
    "defaultDomains": ["cloudflare.com", "google.com"]
  },
  "msg": "Configuration updated successfully"
}
```

---

## 相关文件

- `src/storage/config.js` - 配置存储
- `src/routes/admin/config.js` - 配置管理路由
- `src/routes/admin/index.js` - 管理路由分发

---

## 后续依赖

- 任务 11：定时检测使用 `defaultRefreshInterval`
- 任务 9：历史记录清理使用 `historyRetention`
