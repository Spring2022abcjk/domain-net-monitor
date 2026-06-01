# Integration Test Template Skill

为新的 API 端点快速生成符合项目规范的集成测试文件。

## 适用场景

当创建新的 API 路由后，需要编写对应的集成测试时，使用本 Skill。

## 检测条件

用户提出以下需求时触发：
- "为 XXX API 写测试"
- "创建集成测试文件"
- 任务规划中识别到测试需求
- API 路由创建完成后自动提醒

## 核心步骤模板

### 步骤 1：确认测试覆盖范围

1. **成功场景**：
   - 正常请求（有效 Token + 有效参数）
   - 返回正确状态码和数据

2. **失败场景**：
   - 无 Token（返回 401）
   - 无效 Token（返回 401）
   - 无效参数（返回 400）
   - 数据不存在（返回 404）

3. **边界场景**：
   - 空值/空数组
   - 极限值（最大/最小）
   - 特殊字符

### 步骤 2：生成测试文件

```javascript
// tests/integration/<feature>.test.js

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMockRequest, createMockEnv, assertEqual } from '../support/test-helpers.js';
import { runSuite } from '../test-runner.js';

/**
 * <Feature> API 集成测试
 */
export async function runFeatureTests() {
  // ========== GET /api/admin/<feature> ==========
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

  // ========== POST /api/admin/<feature> ==========
  await runSuite('POST /api/admin/<feature> - Success', async () => {
    const { postFeature } = await import('../../src/routes/admin/<feature>.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/<feature>',
      'POST',
      { field: 'value' },
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await postFeature(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.field, 'value', 'Field matches');
  });

  await runSuite('POST /api/admin/<feature> - Invalid Parameter', async () => {
    const { postFeature } = await import('../../src/routes/admin/<feature>.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/<feature>',
      'POST',
      { field: '' },
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await postFeature(request, env);

    assertEqual(response.status, 400, 'Returns 400');
  });

  // ========== KV Storage Tests (如果涉及 KV 操作) ==========
  await runSuite('POST /api/admin/<feature> - Result saved to KV', async () => {
    const { postFeature } = await import('../../src/routes/admin/<feature>.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/<feature>',
      'POST',
      { field: 'test' },
      { 'X-API-Token': 'test_secret_token_123' }
    );

    await postFeature(request, env);

    // Verify result was saved
    const savedData = await env.DOMAIN_MONITOR_KV.get('key:test');
    assert(savedData, 'Data saved to KV');
    
    const parsed = JSON.parse(savedData);
    assertEqual(parsed.field, 'test', 'Field matches');
  });
}

export { runFeatureTests as runIntegrationTests };
```

### 步骤 3：注册测试

**文件**: `tests/index.js`

1. 导入测试函数：
```javascript
import { runFeatureTests } from './integration/<feature>.test.js';
```

2. 添加到测试执行流程（在 `runAllTests` 函数内）：
```javascript
await runFeatureTests();
```

### 步骤 4：运行验证

```bash
# 运行单个测试文件
node tests/integration/<feature>.test.js

# 运行完整测试套件
npm test

# 预提交检查
./scripts/pre-commit-check.sh
```

---

## 测试编写规范

### 变量命名

✅ **正确**:
```javascript
const body = await response.json();
assertEqual(body.data.field, 'value', 'Field matches');
```

❌ **错误**:
```javascript
const config = await response.json();
assertEqual(config.data.field, 'value', 'Field matches');
// 或
assertEqual(config.field, 'value', 'Field matches');
```

### 断言格式

✅ **正确**:
```javascript
assertEqual(response.status, 200, 'Returns 200');
assert(body.data.domains, 'Domains exists');
assertEqual(body.data.domains.length, 2, 'Two domains');
assertEqual(body.msg, 'success', 'Message matches');
```

### 测试套件命名

使用以下格式：
```javascript
await runSuite('<METHOD> <PATH> - <Scenario>', async () => {
  // ...
});
```

示例：
- `GET /api/admin/doh - Success`
- `POST /api/admin/detect/single - Invalid Domain`
- `PUT /api/admin/config - Partial Update`

---

## 代码质量检查清单

创建完成后，确认以下项目：

- [ ] 使用 `const body = await response.json()` 统一命名
- [ ] 访问数据使用 `body.data.xxx`
- [ ] 所有测试使用 `assertEqual` 和 `assert`
- [ ] 每个测试用例有清晰的描述信息
- [ ] 覆盖成功、失败、边界场景
- [ ] KV 操作测试验证数据持久化
- [ ] 运行 `npm test` 通过
- [ ] 预提交检查通过

---

## 参考示例

- `tests/integration/doh.test.js` - DoH 测试（22 个用例）
- `tests/integration/detect.test.js` - 检测测试（23 个用例）
- `tests/integration/auth.test.js` - 认证测试（54 个用例）
- `tests/integration/config.test.js` - 配置测试（33 个用例）

---

## 常见问题排查

**Q: 测试报错 "Cannot read properties of undefined"?**
- 检查是否使用了 `body.data.xxx` 访问模式
- 确认响应格式是 `{ code, data, msg }`

**Q: Token 验证失败？**
- 确认使用 `test_secret_token_123`
- 确认 `createMockEnv()` 设置了正确的环境变量

**Q: KV 测试失败？**
- 确认 Mock KV 工作正常
- 使用 `await env.DOMAIN_MONITOR_KV.put()` 和 `get()` 验证

---

## 验收标准

创建的测试文件必须通过以下验证：

1. **覆盖率验收**：
   - [ ] 成功场景测试
   - [ ] 无 Token 测试（401）
   - [ ] 无效参数测试（400）
   - [ ] KV 持久化测试（如果涉及）

2. **代码质量验收**：
   - [ ] 变量命名统一使用 `body`
   - [ ] 访问模式统一使用 `body.data.xxx`
   - [ ] 通过 `./scripts/pre-commit-check.sh` 测试代码命名检查
   - [ ] 通过 `./scripts/pre-commit-check.sh` 测试访问模式检查

3. **测试执行**：
   - [ ] `npm test` 100% 通过
   - [ ] 无警告、无错误

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-30 | 1.0 | 初始版本，基于任务 4/5/6/7/8 测试实践经验 |

