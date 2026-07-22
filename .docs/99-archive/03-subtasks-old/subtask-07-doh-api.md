# 子任务 7：DoH 配置 API

**状态**: 🟡 进行中  
**优先级**: 高  
**预计工时**: 2 小时  
**创建日期**: 2026-05-29  
**更新日期**: 2026-05-30  

---

## 任务目标

实现管理员对 DoH（DNS over HTTPS）端点的配置和测试功能，支持自定义 DNS 查询端点。

### 核心需求

1. **配置管理**: 管理员可自定义主/备 DoH 端点
2. **端点测试**: 支持测试任意 DoH 端点的可用性
3. **延迟检测**: 测试返回响应时间，帮助选择最佳端点
4. **超时处理**: 支持自定义超时时间，默认 5 秒

---

## API 端点

| 方法 | 路径 | 说明 | 鉴权 | 限流豁免 |
|------|------|------|------|----------|
| GET | `/api/admin/doh` | 获取 DoH 端点配置 | ✅ | ✅ |
| PUT | `/api/admin/doh` | 更新 DoH 端点 | ✅ | ✅ |
| POST | `/api/admin/doh/test` | 测试 DoH 端点可用性 | ✅ | ✅ |

---

## 实现步骤

### 7.1 配置存储（已完成 ✅）

DoH 配置字段已添加到默认配置中：

```javascript
// src/storage/config.js

const DEFAULT_CONFIG = {
  defaultRefreshInterval: 43200,  // 12 小时
  rateLimit: {
    windowMs: 60000,              // 60 秒
    maxRequests: 10               // 10 次/分钟
  },
  historyRetention: 7,            // 7 天
  defaultDomains: [],
  doh: {
    primary: 'https://cloudflare-dns.com/dns-query',
    backup: 'https://dns.google/resolve'
  }
};
```

**验收**:
- [x] `doh.primary` 字段存在
- [x] `doh.backup` 字段存在
- [x] `getConfig()` 合并默认值
- [x] `setConfig()` 保存完整配置

---

### 7.2 DoH 配置路由

**文件**: `src/routes/admin/doh.js`（新建）

#### GET /api/admin/doh - 获取配置

```javascript
/**
 * 获取 DoH 端点配置
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量
 * @returns {Promise<Response>}
 */
async function getDohConfig(request, env) {
  const config = await getConfig(env);
  
  return jsonResponse({
    primary: config.doh.primary,
    backup: config.doh.backup
  }, 200);
}
```

**响应示例**:
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

---

#### PUT /api/admin/doh - 更新配置

**请求体**:
```json
{
  "primary": "https://cloudflare-dns.com/dns-query",
  "backup": "https://dns.google/resolve"
}
```

**实现逻辑**:
1. 验证请求体是否为有效 JSON
2. 验证 URL 格式（必须是 HTTPS）
3. 合并配置（只更新提供的字段）
4. 保存到 KV

**错误响应**:
- `400`: 无效 URL 格式、无效请求体
- `401`: 未授权

---

#### POST /api/admin/doh/test - 测试端点

**请求体**:
```json
{
  "url": "https://cloudflare-dns.com/dns-query",
  "timeout": 5000
}
```

**响应示例（成功）**:
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

**响应示例（失败）**:
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

**实现要点**:
1. 使用 `fetchWithTimeout` 发送请求
2. 记录响应时间（latency = endTime - startTime）
3. 区分 HTTP 错误和网络错误
4. 超时后返回友好错误信息

---

### 7.3 URL 验证函数

```javascript
/**
 * 验证 DoH URL 格式
 * @param {string} url - 待验证的 URL
 * @returns {boolean}
 */
function isValidDohUrl(url) {
  if (typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && 
           parsed.hostname.includes('.') &&
           parsed.hostname.length > 0;
  } catch {
    return false;
  }
}
```

**验证规则**:
- 必须是字符串
- 必须是有效的 URL（可通过 `URL` 构造函数）
- 协议必须是 `https:`
- 主机名必须包含点号（排除 localhost）

---

### 7.4 路由注册

**文件**: `src/routes/admin/index.js`

```javascript
import { router as dohRouter } from './doh.js';

const adminRoutes = {
  // ... 现有路由
  '/api/admin/doh': {
    GET: dohRouter.getDohConfig,
    PUT: dohRouter.updateDohConfig
  },
  '/api/admin/doh/test': {
    POST: dohRouter.testDohEndpoint
  }
};
```

---

## 测试用例

### 单元测试

**文件**: `tests/integration/doh.test.js`（新建）

```javascript
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMockRequest, createMockEnv } from '../support/test-helpers.js';
import { jsonResponse } from '../../src/utils/helper.js';

/**
 * DoH 配置 API 集成测试
 */
export async function runDohTests() {
  // ========== GET /api/admin/doh ==========
  await runSuite('GET /api/admin/doh - Success', async () => {
    const { getDohConfig } = await import('../../src/routes/admin/doh.js');
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/doh', 'GET', null, {
      'X-API-Token': 'test_secret_token'
    });
    
    const response = await getDohConfig(request, env);
    const body = await response.json();
    
    assertEqual(response.status, 200, 'Returns 200');
    assert(body.data.primary, 'Primary DoH exists');
    assert(body.data.backup, 'Backup DoH exists');
  });
  
  // ========== PUT /api/admin/doh - Success ==========
  await runSuite('PUT /api/admin/doh - Success', async () => {
    const { updateDohConfig } = await import('../../src/routes/admin/doh.js');
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/doh', 'PUT', {
      primary: 'https://dns.google/resolve',
      backup: 'https://cloudflare-dns.com/dns-query'
    }, {
      'X-API-Token': 'test_secret_token'
    });
    
    const response = await updateDohConfig(request, env);
    const body = await response.json();
    
    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.primary, 'https://dns.google/resolve', 'Primary updated');
    assertEqual(body.data.backup, 'https://cloudflare-dns.com/dns-query', 'Backup updated');
  });
  
  // ========== PUT /api/admin/doh - Invalid URL ==========
  await runSuite('PUT /api/admin/doh - Invalid URL', async () => {
    const { updateDohConfig } = await import('../../src/routes/admin/doh.js');
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/doh', 'PUT', {
      primary: 'invalid-url'
    }, {
      'X-API-Token': 'test_secret_token'
    });
    
    const response = await updateDohConfig(request, env);
    assertEqual(response.status, 400, 'Returns 400');
  });
  
  // ========== POST /api/admin/doh/test - Success ==========
  await runSuite('POST /api/admin/doh/test - Success', async () => {
    const { testDohEndpoint } = await import('../../src/routes/admin/doh.js');
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/doh/test', 'POST', {
      url: 'https://cloudflare-dns.com/dns-query',
      timeout: 5000
    }, {
      'X-API-Token': 'test_secret_token'
    });
    
    const response = await testDohEndpoint(request, env);
    const body = await response.json();
    
    assertEqual(response.status, 200, 'Returns 200');
    assert(body.data.latency >= 0, 'Latency is non-negative');
    assertEqual(body.data.url, 'https://cloudflare-dns.com/dns-query', 'URL matches');
  });
  
  // ========== POST /api/admin/doh/test - Timeout ==========
  await runSuite('POST /api/admin/doh/test - Timeout', async () => {
    const { testDohEndpoint } = await import('../../src/routes/admin/doh.js');
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/doh/test', 'POST', {
      url: 'https://invalid-domain-that-does-not-exist.example',
      timeout: 100
    }, {
      'X-API-Token': 'test_secret_token'
    });
    
    const response = await testDohEndpoint(request, env);
    const body = await response.json();
    
    assertEqual(body.data.success, false, 'Success is false');
    assert(body.data.message.includes('timeout') || body.data.latency <= 1000, 'Timeout handled');
  });
}
```

---

### 手动测试（curl）

```bash
export TOKEN="your_api_token"

# 1. 获取 DoH 配置
curl -X GET http://localhost:8787/api/admin/doh \
  -H "X-API-Token: $TOKEN" | jq

# 2. 更新 DoH 配置
curl -X PUT http://localhost:8787/api/admin/doh \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{
    "primary": "https://dns.google/resolve",
    "backup": "https://cloudflare-dns.com/dns-query"
  }' | jq

# 3. 测试 Cloudflare DoH
curl -X POST http://localhost:8787/api/admin/doh/test \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{
    "url": "https://cloudflare-dns.com/dns-query",
    "timeout": 5000
  }' | jq

# 4. 测试 Google DoH
curl -X POST http://localhost:8787/api/admin/doh/test \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{
    "url": "https://dns.google/resolve"
  }' | jq

# 5. 测试超时（应返回失败）
curl -X POST http://localhost:8787/api/admin/doh/test \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{
    "url": "https://invalid.invalid",
    "timeout": 100
  }' | jq

# 6. 测试无效 URL（应返回 400）
curl -X POST http://localhost:8787/api/admin/doh/test \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{
    "url": "not-a-url"
  }' | jq
```

---

## 常见 DoH 端点参考

| 服务商 | URL | 特点 | 推荐度 |
|--------|-----|------|--------|
| Cloudflare | `https://cloudflare-dns.com/dns-query` | 速度快，支持 DoH | ⭐⭐⭐⭐⭐ |
| Google | `https://dns.google/resolve` | 稳定，兼容性好 | ⭐⭐⭐⭐ |
| AdGuard | `https://dns.adguard.com/dns-query` | 带广告拦截 | ⭐⭐⭐⭐ |
| Quad9 | `https://dns.quad9.net/dns-query` | 安全 DNS | ⭐⭐⭐⭐ |
| NextDNS | `https://dns.nextdns.io` | 可自定义 | ⭐⭐⭐ |

---

## 验收标准

### 功能验收

- [ ] GET `/api/admin/doh` 返回当前配置
- [ ] PUT `/api/admin/doh` 验证 URL 格式并保存
- [ ] PUT `/api/admin/doh` 支持部分更新（只更新 primary 或 backup）
- [ ] POST `/api/admin/doh/test` 测试端点连通性
- [ ] 测试返回延迟（单位：毫秒）
- [ ] 超时处理正确（默认 5 秒）
- [ ] 错误响应清晰区分（网络错误 vs HTTP 错误）

### 代码质量验收

- [ ] 使用 `jsonResponse()` 函数
- [ ] 所有函数有 JSDoc 注释
- [ ] URL 验证逻辑完善
- [ ] 错误处理不泄露敏感信息
- [ ] 通过预提交检查：`./scripts/pre-commit-check.sh`

### 测试验收

- [ ] 单元测试覆盖率 100%
- [ ] 所有测试通过（`npm test`）
- [ ] 手动测试用例全部验证

---

## 相关文件

### 新建文件
- `src/routes/admin/doh.js` - DoH 配置路由（待创建）
- `tests/integration/doh.test.js` - DoH 测试（待创建）

### 修改文件
- `src/routes/admin/index.js` - 路由注册（待修改）

### 现有文件
- `src/storage/config.js` - 配置存储（已完成）
- `src/utils/helper.js` - `fetchWithTimeout` 函数
- `src/middleware/auth.js` - 鉴权中间件

---

## 依赖关系

### 前置依赖
- ✅ 任务 1: 环境变量配置 + helper 函数
- ✅ 任务 4: 管理员认证 API
- ✅ 任务 6: 配置 API（配置存储结构）

### 后续依赖
- 任务 8: 检测操作 API（使用 `config.doh.primary`）
- 任务 11: 定时检测任务（使用 DoH 查询）

---

## 实现注意事项

### 1. 恒定时间比较

DoH 配置变更不需要重新鉴权，因为 Token 验证在路由层统一处理。

### 2. 超时设置

- 默认超时：5000ms（5 秒）
- 最小超时：100ms（防止误操作）
- 最大超时：30000ms（30 秒，防止 Worker 超时）

### 3. 错误日志

```javascript
console.error(`DoH test failed for ${url}:`, error.message);
```

便于调试，但不泄露 Token 等敏感信息。

### 4. 响应时间精度

使用 `Date.now()` 记录起止时间，单位为毫秒：

```javascript
const startTime = Date.now();
await fetchWithTimeout(...);
const latency = Date.now() - startTime;
```

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| DoH 端点不可用 | 测试失败 | 支持备用端点，测试返回清晰错误 |
| 超时时间设置不当 | 请求卡死 | 限制最小/最大超时时间 |
| 无效 URL 格式 | 请求失败 | 严格验证 URL 格式 |
| Worker 执行超时 | 5 秒限制 | 设置合理 timeout（< 4 秒） |

---

## 下一步

1. 创建 `src/routes/admin/doh.js`
2. 实现 GET/PUT/POST 三个端点
3. 创建 `tests/integration/doh.test.js`
4. 运行测试验证
5. 更新 `src/routes/admin/index.js` 注册路由
