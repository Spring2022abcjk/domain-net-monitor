# 子任务 8：检测操作 API

## 任务目标

实现管理员手动触发域名检测的功能，包括单域名检测、批量检测和默认列表检测。

---

## API 端点

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/admin/detect/single` | 单域名即时检测 | ✅ |
| POST | `/api/admin/detect/all` | 批量检测所有域名 | ✅ |
| POST | `/api/admin/detect/default` | 检测默认域名列表 | ✅ |

---

## 子任务步骤

### 8.1 域名检测逻辑模块

```javascript
// src/services/detector.js

import { DOH_PRIMARY, DOH_BACKUP, DNS_TYPE_HTTPS, DNS_TYPE_AAAA, STATUS_OK, STATUS_PARTIAL, STATUS_NO, STATUS_ERROR } from '../config.js';
import { fetchWithTimeout } from '../utils/helper.js';
import { getConfig } from '../storage/config.js';

/**
 * 查询 DoH 获取 DNS 记录
 * @param {string} domain - 域名
 * @param {number} recordType - DNS 记录类型
 * @param {string} dohUrl - DoH 端点 URL
 * @param {number} timeout - 超时时间（毫秒）
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
 * @param {Object} env - 环境变量
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
  
  // 检测 HTTPS RR（RFC 9460）
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
  
  // 检测 IPv6（AAAA 记录）
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
  
  // 计算整体状态
  if (result.https_rr.status === STATUS_OK && result.ech.status === STATUS_OK && result.ipv6.status === STATUS_OK) {
    result.overall = STATUS_OK;
  } else if (result.https_rr.status === STATUS_ERROR || result.ipv6.status === STATUS_ERROR) {
    result.overall = STATUS_ERROR;
  } else if (result.https_rr.status === STATUS_OK) {
    result.overall = STATUS_PARTIAL;
  } else {
    result.overall = STATUS_NO;
  }
  
  return result;
}

/**
 * 保存检测结果到 KV
 * @param {Object} env - 环境变量
 * @param {Object} result - 检测结果
 */
export async function saveResult(env, result) {
  const kv = getKV(env);
  const key = `${KV_KEY_RESULT_PREFIX}${result.domain}`;
  await kv.put(key, JSON.stringify(result));
}

/**
 * 添加历史记录
 * @param {Object} env - 环境变量
 * @param {Object} result - 检测结果
 */
export async function addToHistory(env, result) {
  const kv = getKV(env);
  const key = `${KV_KEY_HISTORY_PREFIX}${result.domain}`;
  
  const data = await kv.get(key);
  const history = data ? JSON.parse(data) : [];
  
  history.unshift(result);
  
  // 限制保留 100 条
  if (history.length > 100) {
    history.length = 100;
  }
  
  await kv.put(key, JSON.stringify(history));
}
```

**文件**: `/workspace/src/services/detector.js`

### 8.2 检测操作路由

```javascript
// src/routes/admin/detect.js

import { jsonResponse } from '../../utils/helper.js';
import { cleanDomain } from '../../utils/helper.js';
import { detectDomain, saveResult, addToHistory } from '../../services/detector.js';
import { getAllDomains } from '../../storage/domains.js';
import { getDefaultDomains } from '../../storage/default-domains.js';

/**
 * 单域名检测
 * POST /api/admin/detect/single
 */
async function detectSingle(request, env) {
  try {
    const body = await request.json();
    const domain = cleanDomain(body.domain);
    
    if (!domain) {
      return new Response(JSON.stringify({
        code: 400,
        data: null,
        msg: 'Invalid domain format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await detectDomain(domain, env);
    await saveResult(env, result);
    await addToHistory(env, result);
    
    return jsonResponse(result, 200, 'Detection completed');
  } catch (error) {
    return new Response(JSON.stringify({
      code: 500,
      data: null,
      msg: `Detection failed: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

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
    return new Response(JSON.stringify({
      code: 500,
      data: null,
      msg: `Batch detection failed: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

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
    return new Response(JSON.stringify({
      code: 500,
      data: null,
      msg: `Detection failed: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const router = {
  detectSingle,
  detectAll,
  detectDefault
};
```

**文件**: `/workspace/src/routes/admin/detect.js`

### 8.3 更新管理路由分发

```javascript
// src/routes/admin/index.js

import { router as detectRouter } from './detect.js';

const adminRoutes = {
  // ... 其他路由
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

// ... 导出 handleAdminRoute
```

**文件**: `/workspace/src/routes/admin/index.js`

---

## 验收标准

1. ✅ `src/services/detector.js` 检测服务实现
2. ✅ 单域名检测返回完整结果（HTTPS RR、ECH、IPv6）
3. ✅ 批量检测支持所有域名
4. ✅ 默认列表检测只检测配置的域名
5. ✅ 检测结果保存到 KV（`result:{domain}`）
6. ✅ 历史记录保存（`history:{domain}`）
7. ✅ 错误处理正确（单域名失败不影响其他）

---

## 测试用例

```bash
export TOKEN="ff10a24df88c7be158ff06f34e36707044b681f02ef090b569806d779e721703"

# 单域名检测
curl -X POST http://localhost:8787/api/admin/detect/single \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{"domain": "cloudflare.com"}' | jq

# 批量检测所有域名
curl -X POST http://localhost:8787/api/admin/detect/all \
  -H "X-API-Token: $TOKEN" | jq

# 检测默认域名列表
curl -X POST http://localhost:8787/api/admin/detect/default \
  -H "X-API-Token: $TOKEN" | jq
```

---

## 响应示例

### POST /api/admin/detect/single

```json
{
  "code": 200,
  "data": {
    "domain": "cloudflare.com",
    "timestamp": 1717020000000,
    "https_rr": {
      "status": "ok",
      "details": {...}
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
  },
  "msg": "Detection completed"
}
```

### POST /api/admin/detect/all

```json
{
  "code": 200,
  "data": {
    "total": 5,
    "success": 4,
    "failed": 1,
    "results": [...]
  },
  "msg": "Batch detection completed"
}
```

---

## 相关文件

- `src/services/detector.js` - 检测服务
- `src/routes/admin/detect.js` - 检测操作路由
- `src/routes/admin/index.js` - 管理路由分发

---

## 后续依赖

- 任务 11：定时检测使用 `detectDomain` 函数
