# 子任务 5：域名管理 API

## 任务目标

实现管理员对域名的增删改查（CRUD）操作，以及默认展示域名列表管理。

---

## API 端点

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/admin/domains` | 获取所有域名 | ✅ |
| GET | `/api/admin/domains/default` | 获取默认展示域名 | ✅ |
| POST | `/api/admin/domains` | 添加域名 | ✅ |
| DELETE | `/api/admin/domains/:domain` | 删除域名 | ✅ |
| POST | `/api/admin/domains/:domain/default` | 设为默认展示 | ✅ |
| DELETE | `/api/admin/domains/:domain/default` | 取消默认展示 | ✅ |

---

## 子任务步骤

### 5.1 域名存储实现（如果任务 2 未完成）

```javascript
// src/storage/domains.js

import { KV_KEY_DOMAIN_LIST, KV_KEY_DEFAULT_DOMAINS } from '../config.js';
import { getKV } from './kv.js';

/**
 * 获取所有域名
 */
export async function getAllDomains(env) {
  const kv = getKV(env);
  const data = await kv.get(KV_KEY_DOMAIN_LIST);
  return data ? JSON.parse(data) : [];
}

/**
 * 添加域名
 */
export async function addDomain(env, domain) {
  const kv = getKV(env);
  const domains = await getAllDomains(env);
  
  if (!domains.includes(domain)) {
    domains.push(domain);
    await kv.put(KV_KEY_DOMAIN_LIST, JSON.stringify(domains));
  }
  
  return domains;
}

/**
 * 删除域名
 */
export async function removeDomain(env, domain) {
  const kv = getKV(env);
  const domains = await getAllDomains(env);
  const filtered = domains.filter(d => d !== domain);
  
  await kv.put(KV_KEY_DOMAIN_LIST, JSON.stringify(filtered));
  
  // 同时删除该域名的结果和历史记录
  await kv.delete(`${KV_KEY_RESULT_PREFIX}${domain}`);
  await kv.delete(`${KV_KEY_HISTORY_PREFIX}${domain}`);
  
  return filtered;
}

/**
 * 获取默认展示域名
 */
export async function getDefaultDomains(env) {
  const kv = getKV(env);
  const data = await kv.get(KV_KEY_DEFAULT_DOMAINS);
  return data ? JSON.parse(data) : [];
}

/**
 * 设置默认展示域名
 */
export async function setDefaultDomains(env, domains) {
  const kv = getKV(env);
  await kv.put(KV_KEY_DEFAULT_DOMAINS, JSON.stringify(domains));
}

/**
 * 添加域名到默认列表
 */
export async function addToDefaultDomains(env, domain) {
  const defaultDomains = await getDefaultDomains(env);
  
  if (!defaultDomains.includes(domain)) {
    defaultDomains.push(domain);
    await setDefaultDomains(env, defaultDomains);
  }
  
  return defaultDomains;
}

/**
 * 从默认列表移除域名
 */
export async function removeFromDefaultDomains(env, domain) {
  const defaultDomains = await getDefaultDomains(env);
  const filtered = defaultDomains.filter(d => d !== domain);
  
  await setDefaultDomains(env, filtered);
  
  return filtered;
}
```

**文件**: `/workspace/src/storage/domains.js`

### 5.2 域名管理路由

```javascript
// src/routes/admin/domains.js

import { jsonResponse } from '../../utils/helper.js';
import { cleanDomain } from '../../utils/helper.js';
import {
  getAllDomains,
  addDomain,
  removeDomain,
  getDefaultDomains,
  addToDefaultDomains,
  removeFromDefaultDomains
} from '../../storage/domains.js';

/**
 * 获取所有域名
 * GET /api/admin/domains
 */
async function getDomains(request, env) {
  const domains = await getAllDomains(env);
  
  return jsonResponse({
    list: domains,
    total: domains.length
  });
}

/**
 * 获取默认展示域名
 * GET /api/admin/domains/default
 */
async function getDefault(request, env) {
  const domains = await getDefaultDomains(env);
  
  return jsonResponse({
    list: domains,
    total: domains.length
  });
}

/**
 * 添加域名
 * POST /api/admin/domains
 */
async function addDomainRoute(request, env) {
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
    
    const domains = await addDomain(env, domain);
    
    return jsonResponse({
      domain,
      total: domains.length
    }, 201, 'Domain added successfully');
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
 * 删除域名
 * DELETE /api/admin/domains/:domain
 */
async function deleteDomain(request, env, domain) {
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
  
  const domains = await removeDomain(env, clean);
  
  return jsonResponse({
    domain: clean,
    remaining: domains.length
  }, 200, 'Domain deleted successfully');
}

/**
 * 设为默认展示
 * POST /api/admin/domains/:domain/default
 */
async function setAsDefault(request, env, domain) {
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
  
  const defaultDomains = await addToDefaultDomains(env, clean);
  
  return jsonResponse({
    domain: clean,
    totalDefault: defaultDomains.length
  }, 200, 'Added to default list');
}

/**
 * 取消默认展示
 * DELETE /api/admin/domains/:domain/default
 */
async function removeFromDefault(request, env, domain) {
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
  
  const defaultDomains = await removeFromDefaultDomains(env, clean);
  
  return jsonResponse({
    domain: clean,
    remaining: defaultDomains.length
  }, 200, 'Removed from default list');
}

export const router = {
  getDomains,
  getDefault,
  addDomainRoute,
  deleteDomain,
  setAsDefault,
  removeFromDefault
};
```

**文件**: `/workspace/src/routes/admin/domains.js`

### 5.3 更新管理路由分发

```javascript
// src/routes/admin/index.js

import { isValidAdminToken } from '../../middleware/auth.js';
import { router as authRouter } from './auth.js';
import { router as domainsRouter } from './domains.js';

const adminRoutes = {
  // 认证
  '/api/admin/auth/verify': { POST: authRouter.verifyToken },
  '/api/admin/auth/logout': { POST: authRouter.logout },
  '/api/admin/config/security': { GET: authRouter.getSecurityConfig },
  
  // 域名管理
  '/api/admin/domains': {
    GET: domainsRouter.getDomains,
    POST: domainsRouter.addDomainRoute
  },
  '/api/admin/domains/default': {
    GET: domainsRouter.getDefault
  },
  '/api/admin/domains/:domain/default': {
    POST: domainsRouter.setAsDefault,
    DELETE: domainsRouter.removeFromDefault
  },
  '/api/admin/domains/:domain': {
    DELETE: domainsRouter.deleteDomain
  }
};

// 需要鉴权的路径（排除 verify 和 logout）
const noAuthPaths = ['/api/admin/auth/verify', '/api/admin/auth/logout'];

export async function handleAdminRoute(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // 精确匹配
  let route = adminRoutes[path];
  let domainParam = null;
  
  // 处理带参数的路径（如 /api/admin/domains/:domain）
  if (!route) {
    for (const [pattern, handlers] of Object.entries(adminRoutes)) {
      if (pattern.includes(':domain')) {
        const regex = new RegExp('^' + pattern.replace(':domain', '([^/]+)') + '$');
        const match = path.match(regex);
        if (match) {
          route = handlers;
          domainParam = match[1];
          break;
        }
      }
    }
  }
  
  if (!route) {
    return null;  // 不是管理路由
  }
  
  const handler = route[method];
  if (!handler) {
    return new Response(JSON.stringify({
      code: 405,
      data: null,
      msg: `Method ${method} not allowed`
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 鉴权检查
  if (!noAuthPaths.includes(path) && !isValidAdminToken(request, env)) {
    return new Response(JSON.stringify({
      code: 401,
      data: null,
      msg: 'Invalid or missing API Token'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return handler(request, env, domainParam);
}
```

**文件**: `/workspace/src/routes/admin/index.js`

---

## 验收标准

1. ✅ `src/storage/domains.js` 存储模块实现
2. ✅ `src/routes/admin/domains.js` 域名管理路由
3. ✅ 管理路由支持路径参数 `:domain`
4. ✅ 所有 6 个 API 端点正常工作
5. ✅ 域名格式验证正确
6. ✅ 删除域名时同时清理结果和历史记录

---

## 测试用例

```bash
# 设置 Token
export TOKEN="ff10a24df88c7be158ff06f34e36707044b681f02ef090b569806d779e721703"

# 获取所有域名
curl -X GET http://localhost:8787/api/admin/domains -H "X-API-Token: $TOKEN"

# 添加域名
curl -X POST http://localhost:8787/api/admin/domains \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{"domain": "example.com"}'

# 设为默认展示
curl -X POST http://localhost:8787/api/admin/domains/example.com/default \
  -H "X-API-Token: $TOKEN"

# 获取默认展示域名
curl -X GET http://localhost:8787/api/admin/domains/default \
  -H "X-API-Token: $TOKEN"

# 取消默认展示
curl -X DELETE http://localhost:8787/api/admin/domains/example.com/default \
  -H "X-API-Token: $TOKEN"

# 删除域名
curl -X DELETE http://localhost:8787/api/admin/domains/example.com \
  -H "X-API-Token: $TOKEN"
```

---

## 相关文件

- `src/storage/domains.js` - 域名存储
- `src/routes/admin/domains.js` - 域名管理路由
- `src/routes/admin/index.js` - 管理路由分发

---

## 后续依赖

- 任务 8：批量检测需要读取域名列表
- 任务 11：定时检测默认域名需要读取默认列表
