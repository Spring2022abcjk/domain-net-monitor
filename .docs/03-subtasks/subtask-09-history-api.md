# 子任务 9：历史记录 API

**状态**: 🔴 未启动  
**优先级**: 高  
**预计工时**: 4-6 小时  
**创建日期**: 2026-05-30  
**更新日期**: 2026-05-30  

---

## 任务目标

实现管理员对历史检测记录的查询、筛选和清理功能，支持按域名、时间范围、条数限制进行查询，以及清理过期历史记录。

### 核心需求

1. **查询历史记录**：支持查询单域名或所有域名的历史检测记录
2. **筛选参数**：支持按天数（days）、条数限制（limit）进行筛选
3. **删除历史**：支持删除单域名的所有历史记录
4. **清理过期**：支持批量清理超过保留天数的历史记录
5. **统计信息**：清理操作返回统计信息（清理了多少条记录）

---

## API 端点

| 方法 | 路径 | 说明 | 鉴权 | 限流豁免 |
|------|------|------|------|----------|
| GET | `/api/admin/history` | 查询历史记录 | ✅ | ✅ |
| DELETE | `/api/admin/history/:domain` | 删除单域名历史 | ✅ | ✅ |
| DELETE | `/api/admin/history` | 清理过期记录 | ✅ | ✅ |

---

## 实现步骤

### 9.1 历史记录存储模块

**文件**: `src/storage/history.js`（新建）

实现以下函数：

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
 * @returns {Promise<Array>} 历史记录数组
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
 * @returns {Promise<Object>} 域名 -> 历史记录映射
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
 * @returns {Promise<Object>} 所有域名历史记录
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
 * @returns {Promise<Object>} 删除结果
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
 * @returns {Promise<Object>} 清理统计
 */
export async function cleanupHistory(env, retentionDays = 30) {
  const kv = getKV(env);
  const allKeys = await kv.list({ prefix: KV_KEY_HISTORY_PREFIX });
  
  const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  let domainsWithHistory = 0;
  let recordsRemoved = 0;
  
  for (const key of allKeys.keys) {
    const data = await kv.get(key.name);
    if (!data) continue;
    
    const history = JSON.parse(data);
    const originalLength = history.length;
    const filtered = history.filter(item => item.timestamp >= cutoffTime);
    
    if (filtered.length !== originalLength) {
      await kv.put(key.name, JSON.stringify(filtered));
      recordsRemoved += (originalLength - filtered.length);
    }
    
    domainsWithHistory++;
  }
  
  return {
    domainsWithHistory,
    recordsRemoved,
    retentionDays
  };
}
```

**验收要点**:
- [ ] KV 键名使用 `history:{domain}` 格式
- [ ] 天数过滤逻辑正确（基于 timestamp）
- [ ] 数量限制使用 `slice()`
- [ ] 清理操作只删除过期记录，保留有效记录

### 9.2 历史记录路由

**文件**: `src/routes/admin/history.js`（新建）

```javascript
// src/routes/admin/history.js

import { jsonResponse, cleanDomain } from '../../utils/helper.js';
import { isValidAdminToken, createUnauthorizedResponse } from '../../middleware/auth.js';
import {
  getHistory,
  getMultipleHistory,
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
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function getHistoryRoute(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse();
  }

  const url = new URL(request.url);
  const domain = url.searchParams.get('domain');
  const days = parseInt(url.searchParams.get('days')) || 7;
  const limit = parseInt(url.searchParams.get('limit')) || 50;
  
  if (domain) {
    // 查询单域名历史
    const clean = cleanDomain(domain);
    if (!clean) {
      return jsonResponse(null, 400, 'Invalid domain format');
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
      const history = await getAllHistory(env, null, days, limit);
      
      let totalCount = 0;
      for (const h of Object.values(history)) {
        totalCount += h.length;
      }
      
      return jsonResponse({
        days,
        limit,
        totalDomains: Object.keys(history).length,
        totalCount,
        history
      });
    }
}

/**
 * 删除单域名历史
 * DELETE /api/admin/history/:domain
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @param {string} domain - 域名
 * @returns {Response} 响应
 */
export async function deleteHistoryRoute(request, env, domain) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse();
  }

  const clean = cleanDomain(domain);
  
  if (!clean) {
    return jsonResponse(null, 400, 'Invalid domain format');
  }
  
  const result = await deleteHistory(env, clean);
  
  return jsonResponse(result, 200, 'History deleted successfully');
}

/**
 * 清理过期记录
 * DELETE /api/admin/history
 * 查询参数：
 *   - retentionDays: 保留天数（可选，默认 30）
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function cleanupHistoryRoute(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse();
  }

  const url = new URL(request.url);
  const retentionDays = parseInt(url.searchParams.get('retentionDays')) || 30;
  
  const result = await cleanupHistory(env, retentionDays);
  
  return jsonResponse(result, 200, 'Cleanup completed successfully');
}
```

**验收要点**:
- [ ] 所有函数有 JSDoc 注释
- [ ] 使用 `jsonResponse()` 统一响应格式
- [ ] 鉴权检查（`isValidAdminToken`）
- [ ] 域名验证（`cleanDomain()`）
- [ ] 查询参数正确解析

### 9.3 更新管理路由分发

**文件**: `src/routes/index.js`（修改）

在 `handleRequest` 函数中添加路由映射：

```javascript
// src/routes/index.js

import { getHistoryRoute, deleteHistoryRoute, cleanupHistoryRoute } from './admin/history.js';

// ... 在 handleRequest 函数中添加 ...

// DELETE /api/admin/history/:domain
else if (path.startsWith('/api/admin/history/') && method === 'DELETE') {
  const domain = path.replace('/api/admin/history/', '');
  response = await deleteHistoryRoute(request, env, domain);
}
// GET /api/admin/history
else if (path === '/api/admin/history' && method === 'GET') {
  response = await getHistoryRoute(request, env);
}
// DELETE /api/admin/history
else if (path === '/api/admin/history' && method === 'DELETE') {
  response = await cleanupHistoryRoute(request, env);
}
```

**验收要点**:
- [ ] 导入路由函数
- [ ] 路由路径正确
- [ ] 参数提取正确（domain 从路径提取）

---

## 测试用例

### 单元测试

**文件**: `tests/integration/history.test.js`（新建）

```javascript
// tests/integration/history.test.js

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMockRequest, createMockEnv, assertEqual } from '../support/test-helpers.js';
import { runSuite } from '../test-runner.js';

/**
 * History API 集成测试
 */
export async function runHistoryTests() {
  // ========== GET /api/admin/history - Single Domain ==========
  await runSuite('GET /api/admin/history?domain=example.com - Success', async () => {
    const { getHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    // Mock some history data
    await env.DOMAIN_MONITOR_KV.put('history:example.com', JSON.stringify([
      { timestamp: Date.now(), overall: 'ok' },
      { timestamp: Date.now() - 86400000, overall: 'ok' }
    ]));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history?domain=example.com&days=7&limit=50',
      'GET',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await getHistoryRoute(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.domain, 'example.com', 'Domain matches');
    assert(body.data.history, 'History exists');
    assertEqual(body.data.count, 2, 'Two records');
  });

  await runSuite('GET /api/admin/history?domain=example.com - No Token', async () => {
    const { getHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history?domain=example.com',
      'GET',
      null,
      {}
    );

    const response = await getHistoryRoute(request, env);

    assertEqual(response.status, 401, 'Returns 401');
  });

  // ========== GET /api/admin/history - All Domains ==========
  await runSuite('GET /api/admin/history - All Domains', async () => {
    const { getHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    // Mock multiple domains
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify(['example.com', 'test.com']));
    await env.DOMAIN_MONITOR_KV.put('history:example.com', JSON.stringify([
      { timestamp: Date.now(), overall: 'ok' }
    ]));
    await env.DOMAIN_MONITOR_KV.put('history:test.com', JSON.stringify([
      { timestamp: Date.now(), overall: 'ok' }
    ]));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history',
      'GET',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await getHistoryRoute(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.totalDomains, 2, 'Two domains');
    assert(body.data.history, 'History exists');
  });

  // ========== DELETE /api/admin/history/:domain ==========
  await runSuite('DELETE /api/admin/history/:domain - Success', async () => {
    const { deleteHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    // Mock data
    await env.DOMAIN_MONITOR_KV.put('history:example.com', JSON.stringify([
      { timestamp: Date.now(), overall: 'ok' }
    ]));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history/example.com',
      'DELETE',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await deleteHistoryRoute(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.deleted, true, 'Deleted');
    
    // Verify deletion
    const remaining = await env.DOMAIN_MONITOR_KV.get('history:example.com');
    assertEqual(remaining, null, 'History deleted from KV');
  });

  // ========== DELETE /api/admin/history - Cleanup ==========
  await runSuite('DELETE /api/admin/history - Cleanup', async () => {
    const { cleanupHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    // Mock old and new data
    await env.DOMAIN_MONITOR_KV.put('history:example.com', JSON.stringify([
      { timestamp: Date.now(), overall: 'ok' }, // New
      { timestamp: Date.now() - (40 * 86400000), overall: 'ok' } // Old (40 days)
    ]));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history?retentionDays=30',
      'DELETE',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await cleanupHistoryRoute(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.recordsRemoved, 1, 'One old record removed');
  });
}

export { runHistoryTests as runIntegrationTests };
```

**测试覆盖**:
- [ ] 单域名查询成功
- [ ] 单域名查询无 Token（401）
- [ ] 所有域名汇总查询
- [ ] 删除单域名历史
- [ ] 清理过期记录

### 手动测试（curl）

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

## 验收标准

### 功能验收

- [ ] GET `/api/admin/history` 支持单域名查询（带 `domain` 参数）
- [ ] GET `/api/admin/history` 支持所有域名汇总（不带 `domain` 参数）
- [ ] 查询参数 `days` 正确解析（默认 7）
- [ ] 查询参数 `limit` 正确解析（默认 50）
- [ ] DELETE `/api/admin/history/:domain` 删除指定域名历史
- [ ] DELETE `/api/admin/history` 清理过期记录
- [ ] 清理返回统计信息（`domainsWithHistory`, `recordsRemoved`）

### 代码质量验收

- [ ] 使用 `jsonResponse()` 函数
- [ ] 所有函数有 JSDoc 注释
- [ ] 错误处理完善（400/401）
- [ ] 通过预提交检查

### 测试验收

- [ ] 单元测试覆盖率 100%
- [ ] 所有测试通过（`npm test`）
- [ ] 手动测试用例全部验证

---

## 相关文件

### 新建文件
- `src/storage/history.js` - 历史记录存储模块
- `src/routes/admin/history.js` - 历史记录路由
- `tests/integration/history.test.js` - 历史记录集成测试

### 修改文件
- `src/routes/index.js` - 注册历史路由
- `tests/index.js` - 注册历史测试

### 现有文件
- `src/storage/kv.js` - KV 基础模块（`getKV` 函数）
- `src/config.js` - KV 键名前缀常量

---

## 依赖关系

### 前置依赖
- ✅ 任务 2：KV 存储结构扩展（提供 `getKV` 和 `KV_KEY_HISTORY_PREFIX`）
- ✅ 任务 4：管理员认证 API（提供鉴权中间件）
- ✅ 任务 5：域名管理 API（提供 `getAllDomains`）

### 后续依赖
- 任务 10：统计概览 API（需要历史数据支持）
- 任务 19：前端历史记录页面（需要本 API）

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 历史数据量过大导致查询慢 | 中 | 使用 `limit` 限制返回条数，分页查询 |
| KV list 操作超时 | 中 | 批量查询时使用分批策略 |
| 清理操作耗时过长 | 低 | 清理操作在后台异步执行 |

---

## 下一步

1. 创建 `src/storage/history.js` 存储模块
2. 创建 `src/routes/admin/history.js` 路由
3. 更新 `src/routes/index.js` 注册路由
4. 创建 `tests/integration/history.test.js` 测试
5. 更新 `tests/index.js` 注册测试
6. 运行 `npm test` 验证
7. 运行预提交检查：`./scripts/pre-commit-check.sh`

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-30 | 1.0 | 初始版本，基于项目规范创建 |
