# 测试代码规范

**版本**: 1.0.0  
**生效日期**: 2026-05-29  
**适用范围**: 所有集成测试和单元测试

---

## 📋 核心原则

1. **统一命名** - 变量命名必须一致
2. **使用 helper** - 优先使用辅助函数
3. **批量修改** - 修改前先 grep 再一次性修改
4. **提交前检查** - 运行预提交检查脚本

---

## 🎯 变量命名规范

### 响应体变量

**强制要求**: 统一使用 `body`

```javascript
// ✅ 正确
const response = await handleDomains(request, env);
const body = await response.json();
assertEqual(body.data.domains.length, 2, 'Two domains');

// ❌ 错误 - 使用 config
const config = await response.json();
assertEqual(config.defaultRefreshInterval, 43200, ...);

// ❌ 错误 - 使用 response (与响应对象重名)
const response = await response.json();
```

### 访问 data 字段

**强制要求**: 统一使用 `body.data.xxx`

```javascript
// ✅ 正确
assertEqual(body.data.domains.length, 2, ...);
assertEqual(body.data.config.defaultRefreshInterval, 43200, ...);
assert(body.data.success === true, ...);

// ❌ 错误 - 直接访问 body
assertEqual(body.domains.length, 2, ...);

// ❌ 错误 - 使用 config.data
assertEqual(config.data.defaultRefreshInterval, 43200, ...);
```

### Mock 对象

**推荐使用 helper 函数**

```javascript
// ✅ 正确 - 使用辅助函数
const env = createMockEnv();
const request = createMockRequest(url, method, body, headers);

// ✅ 正确 - 带覆盖值
const env = createMockEnv({
  CLOUDFLARE_API_TOKEN: 'custom_token'
});

// ❌ 错误 - 手动创建冗长
const env = {
  DOMAIN_MONITOR_KV: { ... },
  CLOUDFLARE_API_TOKEN: 'test_token',
  ALLOWED_ORIGINS: '*'
};
```

### 辅助函数导入

```javascript
// ✅ 正确 - 统一从 support 目录导入
import { createMockKV, createMockEnv, createMockRequest } from '../support/test-helpers.js';

// ❌ 错误 - 在每个测试文件中重复定义
function createMockKV() { ... }
```

---

## 📝 批量修改流程

### 步骤 1: 先 grep 查看范围

**不要直接开始替换！**

```bash
# 查看有多少处需要修改
grep -n "const config = await response.json()" tests/integration/config.test.js

# 查看引用模式
grep -n "config\." tests/integration/config.test.js

# 查看所有变量定义
grep -n "const.*=" tests/integration/config.test.js | head -20
```

### 步骤 2: 完整阅读文件

打开文件，理解代码结构：
- 哪些是变量定义
- 哪些是变量引用
- 是否有作用域问题

### 步骤 3: 制定修改方案

示例：
```
需要修改：
- 第 67 行：const config = await response.json() → const body = await response.json()
- 第 68-73 行：config.xxx → body.data.xxx
- 第 92-98 行：config.xxx → body.data.xxx
```

### 步骤 4: 一次性修改

**使用编辑器多光标或查找替换功能**

不要执行：
```bash
# ❌ 错误 - 多次执行替换，容易遗漏
sed -i 's/const config =/const body =/g' test.js
sed -i 's/config\./body.data./g' test.js
```

应该执行：
```bash
# ✅ 正确 - 使用编辑器批量修改
# 1. 打开文件
# 2. 使用查找替换 (Cmd+Shift+F)
# 3. 查找：const config = await response.json()
# 4. 替换：const body = await response.json()
# 5. 全部替换
# 6. 再查找：assertEqual(config.
# 7. 替换：assertEqual(body.data.
```

### 步骤 5: 运行测试验证

```bash
npm test

# 如果有错误，回到步骤 1 重新分析
# 不要看到第一个错误就盲目修复！
```

---

## 🔧 测试辅助函数

### 基础 Helper

位于 `tests/support/test-helpers.js`:

```javascript
import { assert, assertEqual } from '../test-runner.js';

/**
 * 从响应中提取 data 字段
 */
export async function getData(response) {
  const body = await response.json();
  return body.data;
}

/**
 * 创建 Mock KV
 */
export function createMockKV() {
  const store = {};
  return {
    async get(key) { return store[key] || null; },
    async put(key, value) { store[key] = value; },
    async delete(key) { delete store[key]; }
  };
}

/**
 * 创建 Mock Env
 */
export function createMockEnv(overrides = {}) {
  return {
    DOMAIN_MONITOR_KV: createMockKV(),
    CLOUDFLARE_API_TOKEN: 'test_secret_token_123',
    ALLOWED_ORIGINS: '*',
    ...overrides
  };
}

/**
 * 创建 Mock Request
 */
export function createMockRequest(url, method = 'GET', body = null, headers = {}) {
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers['Content-Type'] = 'application/json';
  }
  return new Request(url, options);
}
```

### 使用示例

```javascript
import { createMockEnv, createMockRequest, getData } from '../support/test-helpers.js';

await runSuite('GET /api/admin/config - Default Config', async () => {
  const env = createMockEnv();
  const request = createMockRequest('http://localhost:8787/api/admin/config', 'GET', null, {
    'X-API-Token': 'test_secret_token_123'
  });
  
  const response = await handleConfig(request, env);
  assertEqual(response.status, 200, 'Status is 200');
  
  const data = await getData(response);  // 直接获取 data 字段
  assertEqual(data.defaultRefreshInterval, 43200, 'Default refresh interval');
});
```

---

## 📊 测试结构模板

```javascript
// tests/integration/xxx.test.js

import { assert, assertEqual, runSuite } from '../test-runner.js';
import { createMockEnv, createMockRequest, getData } from '../support/test-helpers.js';
import { handleXxx } from '../../src/routes/admin/xxx.js';

/**
 * 测试套件说明
 */
async function runXxxTests() {
  await runSuite('API 名称 - 测试场景', async () => {
    const env = createMockEnv();
    const request = createMockRequest(url, method, body, headers);
    
    const response = await handleXxx(request, env);
    const data = await getData(response);
    
    assertEqual(data.field, expected, '描述');
  });
}

export async function runXxxIntegrationTests() {
  console.log('\n=== API 名称 Integration Tests ===\n');
  await runXxxTests();
  console.log('\n=== API 名称 Tests Complete ===\n');
}
```

---

## ✅ 提交前检查

### 运行检查脚本

```bash
./scripts/pre-commit-check.sh
```

### 手动检查

```bash
# 1. 检查变量命名一致性
grep -E "const (body|config|response) = await.*json\(\)" tests/integration/*.test.js
# 应该只看到 body，不应该看到 config 或 response

# 2. 检查访问模式
grep -E "(body|config)\.(data\.)?" tests/integration/*.test.js
# 应该只看到 body.data，不应该看到 config. 或 config.data

# 3. 运行测试
npm test
# 应该 100% 通过
```

---

## 🚫 常见错误

### 错误 1: 变量名混用

```javascript
// ❌ 错误 - 同一文件内混用
const body = await response.json();
assertEqual(body.data.domains.length, 2, ...);

const config = await response.json();  // 应该用 body
assertEqual(config.defaultRefreshInterval, 43200, ...);  // 应该用 body.data
```

### 错误 2: 忘记 .data 层

```javascript
// ❌ 错误 - 访问 body 而不是 body.data
const body = await response.json();
assertEqual(body.domains.length, 2, ...);  // 应该是 body.data.domains

// ✅ 正确
assertEqual(body.data.domains.length, 2, ...);
```

### 错误 3: 批量修改不彻底

```javascript
// ❌ 错误 - 只改了部分
const body = await response.json();
assertEqual(body.data.defaultRefreshInterval, 43200, ...);
assertEqual(config.rateLimit.windowMs, 60000, ...);  // 漏改！
```

### 错误 4: 打补丁式修复

```bash
# ❌ 错误流程
npm test  # 报错 line 68
sed -i '68s/config/body.data/'  # 只改 68 行
npm test  # 报错 line 69
sed -i '69s/config/body.data/'  # 只改 69 行
# ... 重复多次

# ✅ 正确流程
grep -n "config\." tests/integration/config.test.js  # 查看所有使用
# 找到所有需要使用 body.data 的地方
sed -i 's/config\./body.data./g'  # 一次性全部修改
npm test  # 验证
```

---

## 📚 相关文件

- [API 响应规范](./api-response-standards.md) - 为什么响应格式是 `{ code, data, msg }`
- [错误处理规范](./error-handling-standards.md) - 错误处理最佳实践
- [test-helpers.js](../tests/support/test-helpers.js) - 辅助函数实现

---

## 📝 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-05-29 | 1.0.0 | 初始版本 | AI Assistant |
