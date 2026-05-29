# 子任务 9：历史记录 API

## 任务目标

实现管理员对历史检测记录的查询、筛选和清理功能。

---

## API 端点

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/admin/history` | 查询历史记录 | ✅ |
| DELETE | `/api/admin/history/:domain` | 删除单域名历史 | ✅ |
| DELETE | `/api/admin/history` | 清理过期记录 | ✅ |

---

## 子任务步骤

### 9.1 历史记录存储模块（如果任务 2 未完成）

```javascript
// src/storage/history.js

import { KV_KEY_HISTORY_PREFIX } from '../config.js';
import { getKV } from './kv.js';

/**
 * 获取单域名历史记录
 * @param {Object} env - 环境变量
 * @param {string} domain - 域名
 * @param {number} days - 天数
 * @param {number} limit - 每域名返回条数
 */
export async function getHistory(env, domain, days = 7, limit = 100) {
  const kv = getKV(env);
  const key = `${KV_KEY_HISTORY_PREFIX}${domain}`;
  
  const data = await kv.get(key);
  if (!data) {
    return [];
  }
  
  const history = JSON.parse(data);
  
  // 过滤天数
  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  const filtered = history.filter(item => item.timestamp >= cutoffTime);
  
  // 限制数量
  return filtered.slice(0, limit);
}

/**
 * 获取多个域名的历史记录
 * @param {Object} env - 环境变量
 * @param {Array} domains - 域名列表
 * @param {number} days - 天数
 * @param {number} limit - 每域名返回条数
 */
export async function getMultipleHistory(env, domains, days = 7, limit = 50) {
  const results = {};
  
  for (const domain of domains) {
    results[domain] = await getHistory(env, domain, days, limit);
  }
  
  return results;
}

/**
 * 获取所有域名的历史记录（用于统计）
 * @param {Object} env - 环境变量
 * @param {number} days - 天数
 */
export async function getAllHistory(env, days = 7) {
  const kv = getKV(env);
  const allKeys = await kv.list({ prefix: KV_KEY_HISTORY_PREFIX });
  
  const results = {};
  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  for (const key of allKeys.keys) {
    const data = await kv.get(key.name);
    if (data) {
      const history = JSON.parse(data);
      const domain = key.name.replace(KV_KEY_HISTORY_PREFIX, '');
      results[domain] = history.filter(item => item.timestamp >= cutoffTime);
    }
  }
  
  return results;
}

/**
 * 删除单域名历史记录
 * @param {Object} env - 环境变量
 * @param {string} domain - 域名
 */
export async function deleteHistory(env, domain) {
  const kv = getKV(env);
  const key = `${KV_KEY_HISTORY_PREFIX}${domain}`;
  await kv.delete(key);
  return { domain, deleted: true };
}

/**
 * 清理过期历史记录
 * @param {Object} env - 环境变量
 * @param {number} retentionDays - 保留天数
 * @returns {Object} 清理统计
 */
export async function cleanupHistory(env, retentionDays = 30) {
  const kv = getKV(env);
  const allKeys = await kv.list({ prefix: KV_KEY_HISTORY_PREFIX });
  
  const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  let totalDomains = 0;
  let totalRecordsRemoved = 0;
  
  for (const key of allKeys.keys) {
    const data = await kv.get(key.name);
    if (!data) continue;
    
    const history = JSON.parse(data);
    const originalLength = history.length;
    const filtered = history.filter(item => item.timestamp >= cutoffTime);
    
    if (filtered.length !== originalLength) {
      await kv.put(key.name, JSON.stringify(filtered));
      totalRecordsRemoved += (originalLength - filtered.length);
    }
    
    totalDomains++;
  }
  
  return {
    totalDomains,
    recordsRemoved: totalRecordsRemoved,
    retentionDays
  };
}
```

**文件**: `/workspace/src/storage/history.js`

### 9.2 历史记录路由

```javascript
// src/routes/admin/history.js

import { jsonResponse } from '../../utils/helper.js';
import { cleanDomain } from '../../utils/helper.js';
import {
  getHistory,
  getMultipleHistory,
  getAllHistory,
  deleteHistory,
  cleanupHistory
} from '../../storage/history.js';
import { getAllDomains } from '../../storage/domains.js';

/**
 * 查询历史记录
 * GET /api/admin/history
 * 查询参数：
 *   - domain: 域名（可选，不提供则返回所有域名汇总）
 *   - days: 天数（可选，默认 7）
 *   - limit: 每域名条数（可选，默认 50）
 */
async function getHistoryRoute(request, env) {
  const url = new URL(request.url);
  const domain = url.searchParams.get('domain');
  const days = parseInt(url.searchParams.get('days')) || 7;
  const limit = parseInt(url.searchParams.get('limit')) || 50;
  
  if (domain) {
    // 查询单域名历史
    const clean = cleanDomain(domain);
    if (!clean) {
      return new Response(JSON.stringify({
        code: 400,
        data: null,
        msg: 'Invalid domain format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const history = await getHistory(env, clean, days, limit);
    
    return jsonResponse({
      domain: clean,
      days,
      limit,
      count: history.length,
      history
    });
  } else {
    // 查询所有域名汇总
    const domains = await getAllDomains(env);
    const history = await getMultipleHistory(env, domains, days, limit);
    
    // 汇总统计
    let totalCount = 0;
    for (const h of Object.values(history)) {
      totalCount += h.length;
    }
    
    return jsonResponse({
      days,
      limit,
      totalDomains: domains.length,
      totalCount,
      history
    });
  }
}

/**
 * 删除单域名历史
 * DELETE /api/admin/history/:domain
 */
async function deleteHistoryRoute(request, env, domain) {
  const clean = cleanDomain(domain);
  
  if (!clean) {
    return new Response(JSON.stringify({
      code: 400,
      data: null,
      msg: 'Invalid domain format'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const result = await deleteHistory(env, clean);
  
  return jsonResponse(result, 200, 'History deleted successfully');
}

/**
 * 清理过期记录
 * DELETE /api/admin/history
 * 查询参数：
 *   - retentionDays: 保留天数（可选，默认 30）
 */
async function cleanupHistoryRoute(request, env) {
  const url = new URL(request.url);
  const retentionDays = parseInt(url.searchParams.get('retentionDays')) || 30;
  
  const result = await cleanupHistory(env, retentionDays);
  
  return jsonResponse(result, 200, 'Cleanup completed successfully');
}

export const router = {
  getHistoryRoute,
  deleteHistoryRoute,
  cleanupHistoryRoute
};
```

**文件**: `/workspace/src/routes/admin/history.js`

### 9.3 更新管理路由分发

```javascript
// src/routes/admin/index.js

import { router as historyRouter } from './history.js';

const adminRoutes = {
  // ... 其他路由
  '/api/admin/history': {
    GET: historyRouter.getHistoryRoute,
    DELETE: historyRouter.cleanupHistoryRoute
  },
  '/api/admin/history/:domain': {
    DELETE: historyRouter.deleteHistoryRoute
  }
};

// ... 导出 handleAdminRoute
```

**文件**: `/workspace/src/routes/admin/index.js`

---

## 验收标准

1. ✅ `src/storage/history.js` 历史存储实现
2. ✅ GET `/api/admin/history` 支持单域名和多域名查询
3. ✅ 查询参数正确解析（domain、days、limit）
4. ✅ DELETE `/api/admin/history/:domain` 删除指定域名历史
5. ✅ DELETE `/api/admin/history` 清理过期记录
6. ✅ 清理返回统计信息（清理了多少条）

---

## 测试用例

```bash
export TOKEN="ff10a24df88c7be158ff06f34e36707044b681f02ef090b569806d779e721703"

# 查询单域名历史（最近 7 天，50 条）
curl -X GET "http://localhost:8787/api/admin/history?domain=cloudflare.com" \
  -H "X-API-Token: $TOKEN" | jq

# 查询单域名历史（最近 14 天，20 条）
curl -X GET "http://localhost:8787/api/admin/history?domain=cloudflare.com&days=14&limit=20" \
  -H "X-API-Token: $TOKEN" | jq

# 查询所有域名历史汇总
curl -X GET "http://localhost:8787/api/admin/history" \
  -H "X-API-Token: $TOKEN" | jq

# 删除单域名历史
curl -X DELETE "http://localhost:8787/api/admin/history/cloudflare.com" \
  -H "X-API-Token: $TOKEN" | jq

# 清理过期记录（保留 30 天）
curl -X DELETE "http://localhost:8787/api/admin/history?retentionDays=30" \
  -H "X-API-Token: $TOKEN" | jq
```

---

## 响应示例

### GET /api/admin/history?domain=cloudflare.com

```json
{
  "code": 200,
  "data": {
    "domain": "cloudflare.com",
    "days": 7,
    "limit": 50,
    "count": 14,
    "history": [
      {
        "domain": "cloudflare.com",
        "timestamp": 1717020000000,
        "https_rr": {...},
        "ech": {...},
        "ipv6": {...},
        "overall": "ok"
      },
      ...
    ]
  },
  "msg": "success"
}
```

### DELETE /api/admin/history?retentionDays=30

```json
{
  "code": 200,
  "data": {
    "totalDomains": 10,
    "recordsRemoved": 156,
    "retentionDays": 30
  },
  "msg": "Cleanup completed successfully"
}
```

---

## 相关文件

- `src/storage/history.js` - 历史记录存储
- `src/routes/admin/history.js` - 历史记录路由
- `src/routes/admin/index.js` - 管理路由分发

---

## 后续依赖

- 任务 24：测试优化可能需要历史数据压缩
