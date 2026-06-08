# 子任务 10：统计概览 API

**状态**: 🔴 未启动  
**优先级**: 高  
**预计工时**: 3-5 小时  
**创建日期**: 2026-05-30  
**更新日期**: 2026-05-30  

---

## 任务目标

实现管理员查看平台统计数据和运营指标的功能，包括域名数量、请求统计、限流命中、历史趋势等维度的数据概览。

### 核心需求

1. **概览数据**：提供域名总数、默认域名数、历史记录总数、缓存结果数
2. **今日统计**：今日请求数、今日限流命中数、限流命中率
3. **配置信息**：展示当前检测间隔、历史保留期、限流配置
4. **每日重置**：请求数和限流命中数在每日零点自动重置
5. **数据持久化**：统计数据保存到 KV，Worker 重启后不丢失

---

## API 端点

| 方法 | 路径 | 说明 | 鉴权 | 限流豁免 |
|------|------|------|------|----------|
| GET | `/api/admin/stats` | 获取统计数据概览 | ✅ | ✅ |

---

## 实现步骤

### 10.1 统计数据存储模块

**文件**: `src/storage/stats.js`（新建）

```javascript
// src/storage/stats.js

import { KV_KEY_STATS } from '../config.js';

/**
 * 获取统计数据（自动初始化）
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} 统计数据对象
 */
export async function getStats(env) {
  const kv = env.DOMAIN_MONITOR_KV;
  const data = await kv.get(KV_KEY_STATS);
  
  if (!data) {
    const defaultStats = {
      todayRequests: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    };
    // 初始化默认值
    await kv.put(KV_KEY_STATS, JSON.stringify(defaultStats));
    return defaultStats;
  }
  
  const stats = JSON.parse(data);
  
  // 检查是否需要重置（新的一天）
  const today = new Date().toDateString();
  const lastResetDate = new Date(stats.lastReset).toDateString();
  
  if (today !== lastResetDate) {
    const resetStats = {
      todayRequests: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    };
    await kv.put(KV_KEY_STATS, JSON.stringify(resetStats));
    return resetStats;
  }
  
  return stats;
}

/**
 * 更新统计数据
 * @param {Object} env - 环境变量
 * @param {Object} updates - 更新字段
 * @returns {Promise<Object>} 更新后的统计数据
 */
export async function updateStats(env, updates) {
  const kv = env.DOMAIN_MONITOR_KV;
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
 * @param {Object} env - 环境变量
 * @param {number} amount - 增加数量
 * @returns {Promise<Object>} 更新后的统计数据
 */
export async function incrementRequests(env, amount = 1) {
  const kv = env.DOMAIN_MONITOR_KV;
  const stats = await getStats(env);
  
  const updated = {
    ...stats,
    todayRequests: stats.todayRequests + amount
  };
  
  await kv.put(KV_KEY_STATS, JSON.stringify(updated));
  return updated;
}

/**
 * 记录限流触发
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} 更新后的统计数据
 */
export async function recordRateLimitHit(env) {
  const kv = env.DOMAIN_MONITOR_KV;
  const stats = await getStats(env);
  
  const updated = {
    ...stats,
    rateLimitHits: stats.rateLimitHits + 1
  };
  
  await kv.put(KV_KEY_STATS, JSON.stringify(updated));
  return updated;
}

/**
 * 获取详细统计（包含域名统计）
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} 详细统计数据
 */
export async function getDetailedStats(env) {
  const kv = env.DOMAIN_MONITOR_KV;
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

**验收要点**:
- [ ] 使用 `KV_KEY_STATS` 常量（在 `config.js` 中定义）
- [ ] 自动检测每日重置（比较 `lastReset` 日期）
- [ ] 使用 `ctx.waitUntil()` 在后台更新统计（避免阻塞请求）
- [ ] 所有函数有 JSDoc 注释

---

### 10.2 统计概览路由

**文件**: `src/routes/admin/stats.js`（新建）

```javascript
// src/routes/admin/stats.js

import { jsonResponse } from '../../utils/helper.js';
import { isValidAdminToken, createUnauthorizedResponse } from '../../middleware/auth.js';
import { getDetailedStats } from '../../storage/stats.js';
import { getConfig } from '../../storage/config.js';

/**
 * 获取统计数据
 * GET /api/admin/stats
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function getStatsRoute(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse();
  }

  try {
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
  } catch (error) {
    console.error('Stats route failed:', error.message);
    return jsonResponse(null, 500, `Operation failed: ${error.message}`);
  }
}

/**
 * 格式化时长（秒转人类可读）
 * @param {number} seconds - 秒数
 * @returns {string} 人类可读格式
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
```

**验收要点**:
- [ ] 使用 `jsonResponse()` 统一响应格式
- [ ] 鉴权检查（`isValidAdminToken`）
- [ ] 错误处理（try-catch）
- [ ] 时长格式化函数：秒 → 人类可读

---

### 10.3 更新管理路由分发

**文件**: `src/routes/index.js`（修改）

1. 导入路由函数：
```javascript
import { getStatsRoute } from './admin/stats.js';
```

2. 添加路由映射（在 `handleRequest` 函数内）：
```javascript
// GET /api/admin/stats
else if (path === '/api/admin/stats' && method === 'GET') {
  response = await withAdminAuth(getStatsRoute)(request, env);
}
```

### 10.4 集成统计记录到现有逻辑

**文件**: `src/routes/index.js`（修改）

1. 导入统计记录函数：
```javascript
import { incrementRequests, recordRateLimitHit } from '../storage/stats.js';
```

2. 在请求处理流程中调用：
```javascript
// 限流检查后
const rateLimitResult = rateLimiter(request);
const limitHeaders = rateLimitHeaders(rateLimitResult);

if (!rateLimitResult.allowed) {
  // 记录限流命中
  await recordRateLimitHit(env);
  
  const response = rateLimitExceededResponse();
  // ... 返回限流响应
}

// 记录请求数
await incrementRequests(env);
```

**验收要点**:
- [ ] 统计记录不阻塞响应返回（建议使用 `ctx.waitUntil()`）
- [ ] 限流命中时才记录 `recordRateLimitHit()`
- [ ] 每个请求都记录 `incrementRequests()`

---

## 统计字段说明

### 响应数据结构

```json
{
  "code": 200,
  "data": {
    "overview": {
      "totalDomains": "number",      // 总域名数
      "defaultDomains": "number",    // 默认展示域名数
      "historyRecords": "number",    // 历史总记录数
      "cachedResults": "number"      // 结果缓存数
    },
    "today": {
      "requests": "number",          // 今日请求数
      "rateLimitHits": "number",     // 今日限流命中数
      "rateLimitRate": "string"      // 限流命中率（百分比）
    },
    "config": {
      "refreshInterval": "number",   // 刷新频率（秒）
      "refreshIntervalHuman": "string", // 可读格式
      "historyRetention": "number",  // 历史保留天数
      "rateLimit": {
        "windowMs": "number",        // 限流窗口（毫秒）
        "maxRequests": "number"      // 最大请求数
      }
    },
    "lastReset": "string"            // 最后重置时间（ISO 8601）
  },
  "msg": "success"
}
```

---

## 验收标准

### 功能验收

- [ ] GET `/api/admin/stats` 返回完整统计数据
- [ ] 统计数据包含 `overview`、`today`、`config` 三部分
- [ ] 域名数量统计正确（总数、默认数）
- [ ] 历史记录统计正确（总记录数、域名数）
- [ ] 缓存结果数统计正确
- [ ] 今日请求数统计准确
- [ ] 今日限流命中数统计准确
- [ ] 限流命中率计算正确
- [ ] 配置信息展示完整
- [ ] 时长格式化正确（秒转人类可读）

### 代码质量验收

- [ ] 使用 `jsonResponse()` 函数
- [ ] 所有函数有 JSDoc 注释
- [ ] 错误处理完善（try-catch）
- [ ] 通过预提交检查

### 测试验收

- [ ] 单元测试覆盖存储层
- [ ] 集成测试覆盖路由
- [ ] 测试每日自动重置逻辑
- [ ] 测试统计记录功能
- [ ] 所有测试通过（`npm test`）

---

## 测试用例

### 单元测试

**文件**: `tests/unit/storage-stats.test.js`（新建）

```javascript
// tests/unit/storage-stats.test.js

import assert from 'node:assert/strict';
import { runSuite } from '../test-runner.js';
import { createMockEnv } from '../support/test-helpers.js';
import { getStats, incrementRequests, recordRateLimitHit } from '../../src/storage/stats.js';

export async function runStorageStatsTests() {
  // ========== 初始化统计 ==========
  await runSuite('Storage Stats - Initialize', async () => {
    const env = createMockEnv();
    const stats = await getStats(env);
    
    assert(stats.todayRequests === 0, 'Initial requests zero');
    assert(stats.rateLimitHits === 0, 'Initial rate limit hits zero');
    assert(typeof stats.lastReset === 'number', 'lastReset is timestamp');
  });

  // ========== 增加请求计数 ==========
  await runSuite('Storage Stats - Increment Requests', async () => {
    const env = createMockEnv();
    
    await incrementRequests(env, 1);
    let stats = await getStats(env);
    assert(stats.todayRequests === 1, 'Requests incremented to 1');
    
    await incrementRequests(env, 5);
    stats = await getStats(env);
    assert(stats.todayRequests === 6, 'Requests incremented to 6');
  });

  // ========== 记录限流命中 ==========
  await runSuite('Storage Stats - Record Rate Limit Hit', async () => {
    const env = createMockEnv();
    
    await recordRateLimitHit(env);
    await recordRateLimitHit(env);
    await recordRateLimitHit(env);
    
    const stats = await getStats(env);
    assert(stats.rateLimitHits === 3, 'Rate limit hits recorded');
  });

  // ========== 每日自动重置 ==========
  await runSuite('Storage Stats - Daily Reset', async () => {
    const env = createMockEnv();
    const kv = env.DOMAIN_MONITOR_KV;
    
    // 设置旧的 lastReset（昨天）
    const yesterday = Date.now() - (24 * 60 * 60 * 1000);
    await kv.put('stats', JSON.stringify({
      todayRequests: 100,
      rateLimitHits: 10,
      lastReset: yesterday
    }));
    
    // 再次获取应该触发重置
    const stats = await getStats(env);
    assert(stats.todayRequests === 0, 'Requests reset to 0');
    assert(stats.rateLimitHits === 0, 'Rate limit hits reset to 0');
    assert(stats.lastReset > yesterday, 'lastReset updated');
  });
}

export { runStorageStatsTests as runUnitTests };
```

### 集成测试

**文件**: `tests/integration/stats.test.js`（新建）

```javascript
// tests/integration/stats.test.js

import assert from 'node:assert/strict';
import { runSuite } from '../test-runner.js';
import { createMockRequest, createMockEnv } from '../support/test-helpers.js';
import { getStatsRoute } from '../../src/routes/admin/stats.js';

export async function runStatsIntegrationTests() {
  // ========== GET /api/admin/stats - Success ==========
  await runSuite('GET /api/admin/stats - Success', async () => {
    const env = createMockEnv();
    
    // Mock some data
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify(['a.com', 'b.com']));
    await env.DOMAIN_MONITOR_KV.put('default_domains', JSON.stringify(['a.com']));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/stats',
      'GET',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await getStatsRoute(request, env);
    const body = await response.json();

    assert(response.status === 200, 'Returns 200');
    assert(body.data.overview, 'Overview exists');
    assert(body.data.today, 'Today stats exists');
    assert(body.data.config, 'Config exists');
  });

  // ========== GET /api/admin/stats - No Token ==========
  await runSuite('GET /api/admin/stats - No Token', async () => {
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/stats',
      'GET',
      null,
      {}
    );

    const response = await getStatsRoute(request, env);
    assert(response.status === 401, 'Returns 401');
  });
}

export { runStatsIntegrationTests as runIntegrationTests };
```

### 手动测试（curl）

```bash
export TOKEN="ff10a24df88c7be158ff06f34e36707044b681f02ef090b569806d779e721703"

# 获取统计概览
curl -X GET http://localhost:8787/api/admin/stats \
  -H "X-API-Token: $TOKEN" | jq

# 验证字段
curl -X GET http://localhost:8787/api/admin/stats \
  -H "X-API-Token: $TOKEN" | jq '.data.overview.totalDomains'
```

---

## 相关文件

### 新建文件
- `src/storage/stats.js` - 统计数据存储模块
- `src/routes/admin/stats.js` - 统计概览路由
- `tests/unit/storage-stats.test.js` - 存储层单元测试
- `tests/integration/stats.test.js` - 集成测试

### 修改文件
- `src/routes/index.js` - 注册统计路由、集成统计记录
- `tests/index.js` - 注册存储层和集成测试
- `src/config.js` - 添加 `KV_KEY_STATS` 常量

---

## 依赖关系

### 前置依赖
- ✅ 任务 2：KV 存储结构扩展（提供 KV 基础）
- ✅ 任务 4：管理员认证 API（提供鉴权中间件）
- ✅ 任务 5：域名管理 API（提供域名列表存储）
- ✅ 任务 6：检测配置 API（提供配置存储）

### 后续依赖
- 任务 11：定时检测任务（需要更新统计）
- 任务 19：前端统计页面（需要本 API）

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| KV 操作频繁增加延迟 | 低 | 使用 `ctx.waitUntil()` 后台执行 |
| 跨时区重置时间不准确 | 中 | 记录 UTC 时间戳而非日期字符串 |
| 统计数据过大 | 低 | KV 限制 128KB，统计数据远小于限制 |

---

## 下一步

1. 创建 `src/storage/stats.js` 存储模块
2. 创建 `src/routes/admin/stats.js` 路由
3. 更新 `src/config.js` 添加 `KV_KEY_STATS` 常量
4. 更新 `src/routes/index.js` 注册路由并集成统计记录
5. 创建单元测试和集成测试
6. 更新 `tests/index.js` 注册测试
7. 运行 `npm test` 验证
8. 运行预提交检查：`./scripts/pre-commit-check.sh`

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-30 | 1.0 | 初始版本，基于项目规范创建 |
