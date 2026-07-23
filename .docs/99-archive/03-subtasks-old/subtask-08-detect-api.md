# 子任务 8：检测操作 API

**状态**: 🔴 未开始  
**优先级**: 高  
**预计工时**: 4 小时  
**创建日期**: 2026-05-29  
**更新日期**: 2026-05-30  

---

## 任务目标

实现管理员手动触发域名检测的功能，包括单域名检测、批量检测和默认列表检测。

### 核心需求

1. **单域名检测**: 即时检测指定域名的 DNS 特性
2. **批量检测**: 一次性检测所有已添加的域名
3. **默认列表检测**: 检测内置默认域名列表
4. **结果保存**: 检测结果保存到 KV（最新结果 + 历史记录）

---

## API 端点

| 方法 | 路径 | 说明 | 鉴权 | 限流豁免 |
|------|------|------|------|----------|
| POST | `/api/admin/detect/single` | 单域名即时检测 | ✅ | ✅ |
| POST | `/api/admin/detect/all` | 批量检测所有域名 | ✅ | ✅ |
| POST | `/api/admin/detect/default` | 检测默认域名列表 | ✅ | ✅ |

---

## 实现步骤

### 8.1 检测服务模块

**文件**: `src/services/detector.js`（新建）

#### 核心函数结构

```javascript
// src/services/detector.js

import { DNS_TYPE_HTTPS, DNS_TYPE_AAAA, STATUS_OK, STATUS_PARTIAL, STATUS_NO, STATUS_ERROR } from '../config.js';
import { getConfig } from '../storage/config.js';
import { fetchWithTimeout } from '../utils/helper.js';

/**
 * 查询 DoH 获取 DNS 记录
 * @param {string} domain - 域名
 * @param {number} recordType - DNS 记录类型 (HTTPS/AAAA)
 * @param {string} dohUrl - DoH 端点 URL
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Object>} DoH 响应 JSON
 */
async function queryDoh(domain, recordType, dohUrl, timeout = 5000) {
  const url = `${dohUrl}?name=${encodeURIComponent(domain)}&type=${recordType}`;
  
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/dns-json'
    }
  }, timeout);
  
  if (!response.ok) {
    throw new Error(`DoH response status: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * 检测单个域名的各项指标
 * @param {string} domain - 域名
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<Object>} 检测结果
 */
export async function detectDomain(domain, env) {
  const config = await getConfig(env);
  const dohPrimary = config.doh.primary;
  const dohBackup = config.doh.backup;
  
  const result = {
    domain,
    timestamp: Date.now(),
    https_rr: { status: STATUS_NO, details: null },
    ech: { status: STATUS_NO, value: null },
    ipv6: { status: STATUS_NO, details: null }
  };
  
  // ========== 1. 检测 HTTPS RR（RFC 9460）==========
  try {
    const httpsData = await queryDoh(domain, DNS_TYPE_HTTPS, dohPrimary);
    if (httpsData.Answer && httpsData.Answer.length > 0) {
      result.https_rr = {
        status: STATUS_OK,
        details: httpsData.Answer
      };
      
      // 检查 ECH（Encrypted Client Hello）
      const httpsRecord = httpsData.Answer[0].data;
      if (httpsRecord && httpsRecord.includes('ech')) {
        result.ech = {
          status: STATUS_OK,
          value: true
        };
      }
    }
  } catch (error) {
    console.error(`HTTPS RR query failed for ${domain}:`, error.message);
    result.https_rr = {
      status: STATUS_ERROR,
      error: error.message
    };
  }
  
  // ========== 2. 检测 IPv6（AAAA 记录）==========
  try {
    const ipv6Data = await queryDoh(domain, DNS_TYPE_AAAA, dohPrimary);
    if (ipv6Data.Answer && ipv6Data.Answer.length > 0) {
      result.ipv6 = {
        status: STATUS_OK,
        count: ipv6Data.Answer.length
      };
    }
  } catch (error) {
    // 尝试备用 DoH
    try {
      const ipv6Data = await queryDoh(domain, DNS_TYPE_AAAA, dohBackup);
      if (ipv6Data.Answer && ipv6Data.Answer.length > 0) {
        result.ipv6 = {
          status: STATUS_OK,
          count: ipv6Data.Answer.length
        };
      }
    } catch (backupError) {
      console.error(`IPv6 query failed for ${domain}:`, backupError.message);
      result.ipv6 = {
        status: STATUS_ERROR,
        error: backupError.message
      };
    }
  }
  
  // ========== 3. 计算整体状态 ==========
  if (result.https_rr.status === STATUS_OK && 
      result.ech.status === STATUS_OK && 
      result.ipv6.status === STATUS_OK) {
    result.overall = STATUS_OK;
  } else if (result.https_rr.status === STATUS_ERROR || 
             result.ipv6.status === STATUS_ERROR) {
    result.overall = STATUS_ERROR;
  } else if (result.https_rr.status === STATUS_OK) {
    result.overall = STATUS_PARTIAL;
  } else {
    result.overall = STATUS_NO;
  }
  
  return result;
}

/**
 * 保存检测结果到 KV（最新结果）
 * @param {import('../types.js').Env} env - 环境变量
 * @param {Object} result - 检测结果
 */
export async function saveResult(env, result) {
  const kv = env.DOMAIN_MONITOR_KV;
  const key = `result:${result.domain}`;
  await kv.put(key, JSON.stringify(result));
}

/**
 * 添加检测结果到历史
 * @param {import('../types.js').Env} env - 环境变量
 * @param {Object} result - 检测结果
 */
export async function addToHistory(env, result) {
  const kv = env.DOMAIN_MONITOR_KV;
  const key = `history:${result.domain}`;
  
  const data = await kv.get(key);
  const history = data ? JSON.parse(data) : [];
  
  history.unshift(result);
  
  // 限制保留 100 条（可配置）
  if (history.length > 100) {
    history.length = 100;
  }
  
  await kv.put(key, JSON.stringify(history));
}
```

**关键点**:
- 使用 `config.doh.primary` 和 `config.doh.backup`
- HTTPS RR 检测失败不重试
- IPv6 检测失败尝试备用 DoH
- 状态计算：全部 OK = OK，任一 ERROR = ERROR，仅 HTTPS = PARTIAL

---

### 8.2 检测操作路由

**文件**: `src/routes/admin/detect.js`（新建）

#### POST /api/admin/detect/single

```javascript
/**
 * 单域名检测
 * POST /api/admin/detect/single
 */
async function detectSingle(request, env) {
  try {
    const body = await request.json();
    const domain = cleanDomain(body.domain);
    
    if (!domain) {
      return jsonResponse(null, 400, 'Invalid domain format');
    }
    
    const result = await detectDomain(domain, env);
    await saveResult(env, result);
    await addToHistory(env, result);
    
    return jsonResponse(result, 200, 'Detection completed');
  } catch (error) {
    console.error('Single detection failed:', error.message);
    return jsonResponse(null, 500, `Detection failed: ${error.message}`);
  }
}
```

**请求体**:
```json
{
  "domain": "cloudflare.com"
}
```

---

#### POST /api/admin/detect/all

```javascript
/**
 * 批量检测所有域名
 * POST /api/admin/detect/all
 */
async function detectAll(request, env) {
  try {
    const domains = await getAllDomains(env);
    
    if (domains.length === 0) {
      return jsonResponse({
        total: 0,
        success: 0,
        failed: 0,
        results: []
      }, 200, 'No domains to detect');
    }
    
    const results = [];
    let success = 0;
    let failed = 0;
    
    for (const domain of domains) {
      try {
        const result = await detectDomain(domain, env);
        await saveResult(env, result);
        await addToHistory(env, result);
        results.push(result);
        success++;
      } catch (error) {
        console.error(`Batch detection failed for ${domain}:`, error.message);
        results.push({
          domain,
          error: error.message,
          timestamp: Date.now()
        });
        failed++;
      }
    }
    
    return jsonResponse({
      total: domains.length,
      success,
      failed,
      results
    }, 200, 'Batch detection completed');
  } catch (error) {
    console.error('Batch detection failed:', error.message);
    return jsonResponse(null, 500, `Batch detection failed: ${error.message}`);
  }
}
```

---

#### POST /api/admin/detect/default

```javascript
/**
 * 检测默认域名列表
 * POST /api/admin/detect/default
 */
async function detectDefault(request, env) {
  try {
    const domains = await getDefaultDomains(env);
    
    if (domains.length === 0) {
      return jsonResponse({
        total: 0,
        success: 0,
        failed: 0,
        results: []
      }, 200, 'No default domains configured');
    }
    
    const results = [];
    let success = 0;
    let failed = 0;
    
    for (const domain of domains) {
      try {
        const result = await detectDomain(domain, env);
        await saveResult(env, result);
        await addToHistory(env, result);
        results.push(result);
        success++;
      } catch (error) {
        console.error(`Default detection failed for ${domain}:`, error.message);
        results.push({
          domain,
          error: error.message,
          timestamp: Date.now()
        });
        failed++;
      }
    }
    
    return jsonResponse({
      total: domains.length,
      success,
      failed,
      results
    }, 200, 'Default domains detection completed');
  } catch (error) {
    console.error('Default detection failed:', error.message);
    return jsonResponse(null, 500, `Detection failed: ${error.message}`);
  }
}
```

**导出**:
```javascript
export const router = {
  detectSingle,
  detectAll,
  detectDefault
};
```

---

### 8.3 路由注册

**文件**: `src/routes/admin/index.js`

```javascript
import { router as detectRouter } from './detect.js';

const adminRoutes = {
  // ... 现有路由
  '/api/admin/detect/single': {
    POST: detectRouter.detectSingle
  },
  '/api/admin/detect/all': {
    POST: detectRouter.detectAll
  },
  '/api/admin/detect/default': {
    POST: detectRouter.detectDefault
  }
};
```

---

## 检测结果结构

```json
{
  "domain": "cloudflare.com",
  "timestamp": 1717020000000,
  "https_rr": {
    "status": "ok",
    "details": [
      {
        "name": "cloudflare.com",
        "type": 65,
        "TTL": 300,
        "data": "..."
      }
    ]
  },
  "ech": {
    "status": "ok",
    "value": true
  },
  "ipv6": {
    "status": "ok",
    "count": 2
  },
  "overall": "ok"
}
```

### 状态码说明

| 状态 | 说明 |
|------|------|
| `ok` | 检测通过 |
| `partial` | 部分通过（HTTPS RR OK，但 ECH/IPv6 不 OK） |
| `no` | 检测不通过 |
| `error` | 检测出错 |

---

## 测试用例

### 单元测试

**文件**: `tests/integration/detect.test.js`（新建）

```javascript
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMockRequest, createMockEnv } from '../support/test-helpers.js';

export async function runDetectTests() {
  // ========== POST /api/admin/detect/single ==========
  await runSuite('POST /api/admin/detect/single - Success', async () => {
    const { detectSingle } = await import('../../src/routes/admin/detect.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/detect/single',
      'POST',
      { domain: 'cloudflare.com' },
      { 'X-API-Token': 'test_secret_token' }
    );
    
    const response = await detectSingle(request, env);
    const body = await response.json();
    
    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.domain, 'cloudflare.com', 'Domain matches');
    assert(body.data.timestamp > 0, 'Timestamp exists');
    assertEqual(body.msg, 'Detection completed', 'Message matches');
  });
  
  // ========== POST /api/admin/detect/single - Invalid domain ==========
  await runSuite('POST /api/admin/detect/single - Invalid domain', async () => {
    const { detectSingle } = await import('../../src/routes/admin/detect.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/detect/single',
      'POST',
      { domain: 'invalid' },
      { 'X-API-Token': 'test_secret_token' }
    );
    
    const response = await detectSingle(request, env);
    const body = await response.json();
    
    assertEqual(response.status, 400, 'Returns 400');
    assertEqual(body.code, 400, 'Code matches');
  });
  
  // ========== POST /api/admin/detect/all - Empty list ==========
  await runSuite('POST /api/admin/detect/all - Empty list', async () => {
    const { detectAll } = await import('../../src/routes/admin/detect.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/detect/all',
      'POST',
      null,
      { 'X-API-Token': 'test_secret_token' }
    );
    
    const response = await detectAll(request, env);
    const body = await response.json();
    
    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.total, 0, 'Total is 0');
    assertEqual(body.data.results.length, 0, 'Results empty');
  });
  
  // ========== POST /api/admin/detect/default ==========
  await runSuite('POST /api/admin/detect/default - Success', async () => {
    const { detectDefault } = await import('../../src/routes/admin/detect.js');
    const env = createMockEnv({
      DEFAULT_DOMAINS_JSON: '["cloudflare.com","google.com"]'
    });
    const request = createMockRequest(
      'http://localhost:8787/api/admin/detect/default',
      'POST',
      null,
      { 'X-API-Token': 'test_secret_token' }
    );
    
    const response = await detectDefault(request, env);
    const body = await response.json();
    
    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.total, 2, 'Total is 2');
    assert(body.data.results.length === 2, 'Two results');
  });
}
```

---

### 手动测试（curl）

```bash
export TOKEN="your_api_token"

# 1. 单域名检测
curl -X POST http://localhost:8787/api/admin/detect/single \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{"domain": "cloudflare.com"}' | jq

# 2. 批量检测所有域名
curl -X POST http://localhost:8787/api/admin/detect/all \
  -H "X-API-Token: $TOKEN" | jq

# 3. 检测默认域名列表
curl -X POST http://localhost:8787/api/admin/detect/default \
  -H "X-API-Token: $TOKEN" | jq

# 4. 检测无效域名（测试错误处理）
curl -X POST http://localhost:8787/api/admin/detect/single \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{"domain": "invalid-domain-that-does-not-exist.invalid"}' | jq

# 5. 检测无 Token（应返回 401）
curl -X POST http://localhost:8787/api/admin/detect/single \
  -H "Content-Type: application/json" \
  -d '{"domain": "cloudflare.com"}' | jq
```

---

## 验收标准

### 功能验收

- [ ] `detectDomain()` 正确检测 HTTPS RR、ECH、IPv6
- [ ] 单域名检测返回完整结果
- [ ] 批量检测支持所有域名，单个失败不影响其他
- [ ] 默认列表检测只检测配置的域名
- [ ] 检测结果保存到 KV（`result:{domain}`）
- [ ] 历史记录保存（`history:{domain}`）
- [ ] 错误处理正确（单域名失败不影响批量检测）

### 代码质量验收

- [ ] 使用 `jsonResponse()` 函数
- [ ] 所有函数有 JSDoc 注释
- [ ] 错误日志记录详细（`console.error`）
- [ ] 不泄露敏感信息
- [ ] 通过预提交检查：`./scripts/pre-commit-check.sh`

### 测试验收

- [ ] 单元测试覆盖率 100%
- [ ] 所有测试通过（`npm test`）
- [ ] 手动测试用例全部验证

---

## 相关文件

### 新建文件
- `src/services/detector.js` - 检测服务（待创建）
- `src/routes/admin/detect.js` - 检测操作路由（待创建）
- `tests/integration/detect.test.js` - 检测测试（待创建）

### 修改文件
- `src/routes/admin/index.js` - 路由注册（待修改）

### 现有文件
- `src/storage/config.js` - 配置存储（DoH 配置）
- `src/storage/domains.js` - 域名存储（`getAllDomains`）
- `src/storage/default-domains.js` - 默认域名（`getDefaultDomains`）
- `src/utils/helper.js` - `fetchWithTimeout`、`cleanDomain`

---

## 依赖关系

### 前置依赖
- ✅ 任务 1: helper 函数（`fetchWithTimeout`、`cleanDomain`）
- ✅ 任务 4: 管理员认证 API
- ✅ 任务 5: 域名管理 API（`getAllDomains`）
- ✅ 任务 6: 配置 API（`getConfig`）
- ✅ 任务 7: DoH 配置 API（`config.doh.primary/backup`）

### 后续依赖
- 任务 9: 历史记录 API（读取 `history:{domain}`）
- 任务 10: 统计概览 API（读取 `result:{domain}`）
- 任务 11: 定时检测任务（调用 `detectDomain()`）

---

## 实现注意事项

### 1. 失败隔离

批量检测时，单个域名失败不应影响其他域名：

```javascript
for (const domain of domains) {
  try {
    // 检测
  } catch (error) {
    // 记录错误，继续下一个
    failed++;
  }
}
```

### 2. 历史记录限制

防止历史记录无限增长：

```javascript
if (history.length > 100) {
  history.length = 100;  // 保留最近 100 条
}
```

### 3. 错误日志

记录详细错误便于调试：

```javascript
console.error(`HTTPS RR query failed for ${domain}:`, error.message);
```

### 4. 执行时间

Cloudflare Worker 执行时间限制：
- 免费版：CPU 时间 10ms，总时间 50ms
- 付费版：CPU 时间 50ms，总时间 50s

批量检测多个域名时注意超时风险。

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| DoH 端点不可用 | 检测失败 | 使用备用端点，错误处理清晰 |
| 批量检测超时 | Worker 被终止 | 限制单次检测数量，异步处理 |
| DNS 记录解析失败 | 结果不准确 | 捕获 JSON 解析错误 |
| KV 写入失败 | 结果丢失 | 捕获 KV 错误，记录日志 |

---

## 下一步

1. 创建 `src/services/detector.js` - 实现检测逻辑
2. 创建 `src/routes/admin/detect.js` - 实现三个端点
3. 创建 `tests/integration/detect.test.js` - 编写测试
4. 更新 `src/routes/admin/index.js` - 注册路由
5. 运行测试验证：`npm test`
6. 手动测试：使用 curl 验证
