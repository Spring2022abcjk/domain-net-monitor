# Admin API Route Template Skill

根据给定的功能需求，快速生成符合项目规范的 Admin API 路由文件。

## 适用场景

当需要创建新的管理后台 API 端点时，使用本 Skill 生成路由文件。

## 检测条件

用户提出以下需求时触发：
- "创建一个 XXX API"
- "实现 XXX 功能的路由"
- "添加新的 admin 端点"
- 任务规划中识别到新的 API 需求

## 核心步骤模板

### 步骤 1：确认 API 设计

1. **端点定义**：
   - HTTP 方法（GET/POST/PUT/DELETE）
   - 路径（`/api/admin/xxx`）
   - 请求体格式（如果是 POST/PUT）
   - 响应格式（统一 `{ code, data, msg }`）

2. **鉴权需求**：
   - 是否需要管理员 Token（所有 `/api/admin/*` 端点必需）
   - 是否需要限流豁免

3. **存储需求**：
   - 是否需要读取 KV
   - 是否需要写入 KV
   - 涉及哪些存储模块

### 步骤 2：生成路由文件

```javascript
// src/routes/admin/<feature>.js

import { jsonResponse } from '../../utils/helper.js';
import { isValidAdminToken } from '../../middleware/auth.js';
import { createUnauthorizedResponse } from '../../middleware/auth.js';

/**
 * GET /api/admin/<feature>
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function getFeature(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse();
  }

  // 实现逻辑
  const data = await doSomething(env);

  return jsonResponse(data, 200);
}

/**
 * POST /api/admin/<feature>
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function postFeature(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse();
  }

  try {
    const body = await request.json();
    
    // 验证请求体
    if (!body.field) {
      return jsonResponse(null, 400, 'Missing required field');
    }

    // 实现逻辑
    const result = await doSomething(body, env);

    return jsonResponse(result, 200, 'Operation successful');
  } catch (error) {
    console.error('Feature operation failed:', error.message);
    return jsonResponse(null, 500, `Operation failed: ${error.message}`);
  }
}
```

### 步骤 3：注册路由

**文件**: `src/routes/index.js`

1. 导入路由函数：
```javascript
import { getFeature, postFeature } from './admin/<feature>.js';
```

2. 添加路由映射（在 `handleRequest` 函数内）：
```javascript
// GET /api/admin/<feature>
else if (path === '/api/admin/<feature>' && method === 'GET') {
  response = await withAdminAuth(getFeature)(request, env);
}
// POST /api/admin/<feature>
else if (path === '/api/admin/<feature>' && method === 'POST') {
  response = await withAdminAuth(postFeature)(request, env);
}
```

### 步骤 4：创建测试文件

**文件**: `tests/integration/<feature>.test.js`

```javascript
// tests/integration/<feature>.test.js

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMockRequest, createMockEnv, assertEqual } from '../support/test-helpers.js';
import { runSuite } from '../test-runner.js';

export async function runFeatureTests() {
  await runSuite('GET /api/admin/<feature> - Success', async () => {
    const { getFeature } = await import('../../src/routes/admin/<feature>.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/<feature>',
      'GET',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await getFeature(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assert(body.data, 'Data exists');
  });

  await runSuite('GET /api/admin/<feature> - No Token', async () => {
    const { getFeature } = await import('../../src/routes/admin/<feature>.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/<feature>',
      'GET',
      null,
      {}
    );

    const response = await getFeature(request, env);

    assertEqual(response.status, 401, 'Returns 401');
  });
}

export { runFeatureTests as runIntegrationTests };
```

### 步骤 5：注册测试

**文件**: `tests/index.js`

1. 导入测试函数：
```javascript
import { runFeatureTests } from './integration/<feature>.test.js';
```

2. 添加到测试执行流程：
```javascript
await runFeatureTests();
```

---

## 代码质量检查清单

创建完成后，确认以下项目：

- [ ] 所有响应使用 `jsonResponse()` 函数
- [ ] 所有函数有 JSDoc 注释（包含 `@param` 和 `@returns`）
- [ ] 导入 `isValidAdminToken` 和 `createUnauthorizedResponse`
- [ ] 每个端点显式检查 Token
- [ ] 错误处理使用 `console.error` 记录日志
- [ ] 测试覆盖成功场景和失败场景
- [ ] 测试使用 `body.data.xxx` 访问响应数据
- [ ] 运行预提交检查通过：`./scripts/pre-commit-check.sh`

---

## 参考示例

- `src/routes/admin/doh.js` - DoH 配置 API（任务 7）
- `src/routes/admin/detect.js` - 检测操作 API（任务 8）
- `tests/integration/doh.test.js` - DoH 测试
- `tests/integration/detect.test.js` - 检测测试

---

## 常见问题排查

**Q: 路由不生效？**
- 检查 `src/routes/index.js` 是否正确导入和注册
- 检查路径是否拼写正确
- 确认 Worker 已重新部署

**Q: 测试失败？**
- 确认 Token 值正确（`test_secret_token_123`）
- 确认测试使用了 `body.data.xxx` 访问模式
- 运行 `npm test` 查看完整错误

**Q: 401 错误？**
- 确认请求头包含 `X-API-Token`
- 确认 Token 值与环境变量 `CLOUDFLARE_API_TOKEN` 匹配

---

## 验收标准

创建的 API 路由必须通过以下验证：

1. **功能验收**：
   - [ ] 端点能正常响应
   - [ ] 鉴权生效（无 Token 返回 401）
   - [ ] 错误处理正确

2. **代码质量验收**：
   - [ ] 通过 `./scripts/pre-commit-check.sh`
   - [ ] API 响应格式检查通过
   - [ ] 测试代码命名检查通过
   - [ ] 测试访问模式检查通过
   - [ ] 单元测试 100% 通过

3. **测试覆盖率**：
   - [ ] 成功场景测试
   - [ ] 失败场景测试（无 Token、无效输入）
   - [ ] 边界场景测试（空值、极限值）

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-30 | 1.0 | 初始版本，基于任务 4/5/6/7/8 实践经验 |

