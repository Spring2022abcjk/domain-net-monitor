# 子任务 10：统计概览 API

## 任务目标

实现管理员查看平台统计数据和运营指标的功能。

---

## API 端点

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/admin/stats` | 获取统计数据概览 | ✅ |

---

## 子任务步骤

### 10.1 统计数据存储模块（如果任务 2 未完成）

```javascript
// src/storage/stats.js

import { KV_KEY_STATS } from '../config.js';
import { getKV } from './kv.js';

/**
 * 初始化或获取统计数据
 */
export async function getStats(env) {
  const kv = getKV(env);
  const data = await kv.get(KV_KEY_STATS);
  
  if (!data) {
    return {
      todayRequests: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    };
  }
  
  const stats = JSON.parse(data);
  
  // 检查是否需要重置（新的一天）
  const today = new Date().toDateString();
  const lastResetDate = new Date(stats.lastReset).toDateString();
  
  if (today !== lastResetDate) {
    return {
      todayRequests: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    };
  }
  
  return stats;
}

/**
 * 更新统计数据
 */
export async function updateStats(env, updates) {
  const kv = getKV(env);
  const stats = await getStats(env);
  
  const updated = {
    ...stats,
    ...updates
  };
  
  await kv.put(KV_KEY_STATS, JSON.stringify(updated));
  return updated;
}

/**
 * 增加请求计数
 */
export async function incrementRequests(env, amount = 1) {
  return updateStats(env, {
    todayRequests: (await getStats(env)).todayRequests + amount
  });
}

/**
 * 记录限流触发
 */
export async function recordRateLimitHit(env) {
  return updateStats(env, {
    rateLimitHits: (await getStats(env)).rateLimitHits + 1
  });
}

/**
 * 获取详细统计（包含域名统计）
 */
export async function getDetailedStats(env) {
  const kv = getKV(env);
  const baseStats = await getStats(env);
  
  // 获取域名数量
  const domainListData = await kv.get('domain_list');
  const domainList = domainListData ? JSON.parse(domainListData) : [];
  
  // 获取默认域名数量
  const defaultDomainsData = await kv.get('default_domains');
  const defaultDomains = defaultDomainsData ? JSON.parse(defaultDomainsData) : [];
  
  // 获取历史记录统计
  const allKeys = await kv.list({ prefix: 'history:' });
  let totalHistoryRecords = 0;
  
  for (const key of allKeys.keys) {
    const data = await kv.get(key.name);
    if (data) {
      const history = JSON.parse(data);
      totalHistoryRecords += history.length;
    }
  }
  
  // 获取结果缓存数量
  const resultKeys = await kv.list({ prefix: 'result:' });
  
  return {
    ...baseStats,
    domains: {
      total: domainList.length,
      defaultCount: defaultDomains.length
    },
    history: {
      totalRecords: totalHistoryRecords,
      domainCount: allKeys.keys.length
    },
    cache: {
      resultCount: resultKeys.keys.length
    }
  };
}
```

**文件**: `/workspace/src/storage/stats.js`

### 10.2 统计概览路由

```javascript
// src/routes/admin/stats.js

import { jsonResponse } from '../../utils/helper.js';
import { getDetailedStats } from '../../storage/stats.js';
import { getAllDomains } from '../../storage/domains.js';
import { getDefaultDomains } from '../../storage/default-domains.js';
import { getConfig } from '../../storage/config.js';

/**
 * 获取统计数据
 * GET /api/admin/stats
 */
async function getStatsRoute(request, env) {
  const detailedStats = await getDetailedStats(env);
  const config = await getConfig(env);
  
  // 构建响应
  const stats = {
    overview: {
      totalDomains: detailedStats.domains.total,
      defaultDomains: detailedStats.domains.defaultCount,
      historyRecords: detailedStats.history.totalRecords,
      cachedResults: detailedStats.cache.resultCount
    },
    today: {
      requests: detailedStats.todayRequests,
      rateLimitHits: detailedStats.rateLimitHits,
      rateLimitRate: detailedStats.todayRequests > 0
        ? ((detailedStats.rateLimitHits / detailedStats.todayRequests) * 100).toFixed(2) + '%'
        : '0%'
    },
    config: {
      refreshInterval: config.defaultRefreshInterval,
      refreshIntervalHuman: formatDuration(config.defaultRefreshInterval),
      historyRetention: config.historyRetention,
      rateLimit: {
        windowMs: config.rateLimit.windowMs,
        maxRequests: config.rateLimit.maxRequests
      }
    },
    lastReset: new Date(detailedStats.lastReset).toISOString()
  };
  
  return jsonResponse(stats);
}

/**
 * 格式化时长（秒转人类可读）
 */
function formatDuration(seconds) {
  if (seconds >= 86400) {
    return `${(seconds / 86400).toFixed(1)} days`;
  } else if (seconds >= 3600) {
    return `${(seconds / 3600).toFixed(1)} hours`;
  } else if (seconds >= 60) {
    return `${(seconds / 60).toFixed(1)} minutes`;
  } else {
    return `${seconds} seconds`;
  }
}

export const router = {
  getStatsRoute
};
```

**文件**: `/workspace/src/routes/admin/stats.js`

### 10.3 更新管理路由分发

```javascript
// src/routes/admin/index.js

import { router as statsRouter } from './stats.js';

const adminRoutes = {
  // ... 其他路由
  '/api/admin/stats': {
    GET: statsRouter.getStatsRoute
  }
};

// ... 导出 handleAdminRoute
```

**文件**: `/workspace/src/routes/admin/index.js`

### 10.4 集成统计记录到现有逻辑

```javascript
// src/routes/index.js（公开 API）

import { incrementRequests, recordRateLimitHit } from '../storage/stats.js';

// 在限流逻辑中记录
const rateLimitResult = rateLimiter(request);

if (!rateLimitResult.allowed) {
  await recordRateLimitHit(env);  // 记录限流命中
  return rateLimitExceededResponse();
}

await incrementRequests(env);  // 记录请求数
```

**文件**: `/workspace/src/routes/index.js`

---

## 统计字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `overview.totalDomains` | number | 总域名数 |
| `overview.defaultDomains` | number | 默认展示域名数 |
| `overview.historyRecords` | number | 历史总记录数 |
| `overview.cachedResults` | number | 结果缓存数 |
| `today.requests` | number | 今日请求数 |
| `today.rateLimitHits` | number | 今日限流命中数 |
| `today.rateLimitRate` | string | 限流命中率（百分比） |
| `config.refreshInterval` | number | 刷新频率（秒） |
| `config.historyRetention` | number | 历史保留天数 |
| `config.rateLimit` | object | 限流配置 |

---

## 验收标准

1. ✅ `src/storage/stats.js` 统计存储实现
2. ✅ GET `/api/admin/stats` 返回完整统计
3. ✅ 统计数据包含概览、今日、配置三部分
4. ✅ 请求数每日自动重置
5. ✅ 限流命中次数正确记录
6. ✅ 时长格式化正确（秒转人类可读）

---

## 测试用例

```bash
export TOKEN="ff10a24df88c7be158ff06f34e36707044b681f02ef090b569806d779e721703"

# 获取统计概览
curl -X GET http://localhost:8787/api/admin/stats \
  -H "X-API-Token: $TOKEN" | jq
```

---

## 响应示例

```json
{
  "code": 200,
  "data": {
    "overview": {
      "totalDomains": 10,
      "defaultDomains": 3,
      "historyRecords": 245,
      "cachedResults": 10
    },
    "today": {
      "requests": 156,
      "rateLimitHits": 3,
      "rateLimitRate": "1.92%"
    },
    "config": {
      "refreshInterval": 43200,
      "refreshIntervalHuman": "12.0 hours",
      "historyRetention": 7,
      "rateLimit": {
        "windowMs": 60000,
        "maxRequests": 10
      }
    },
    "lastReset": "2024-05-29T00:00:00.000Z"
  },
  "msg": "success"
}
```

---

## 相关文件

- `src/storage/stats.js` - 统计数据存储
- `src/routes/admin/stats.js` - 统计概览路由
- `src/routes/index.js` - 集成统计记录

---

## 后续依赖

- 任务 11：定时任务更新统计
- 任务 24：测试优化验证统计数据
