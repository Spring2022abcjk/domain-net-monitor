# 任务 0：代码质量改进计划

**创建时间**: 2026-05-29  
**任务状态**: ⏳ 待执行  
**优先级**: 🔴 高（阻塞后续开发）  
**预计工期**: 0.5 天

---

## 📋 问题背景

在任务 5 和 6 的开发过程中，暴露出以下体系性问题：

### 核心问题

1. **响应格式不规范** - API 响应格式没有强制约定，导致同一项目中存在两种格式
2. **测试代码混乱** - 变量命名不一致，批量修改引入更多问题
3. **错误处理粗糙** - 捕获所有异常返回相同错误信息
4. **缺少代码审查流程** - 提交前没有检查一致性的步骤

### 影响

- 测试代码维护成本高
- 新功能开发容易引入不一致
- 代码审查效率低
- 团队协作困难

---

## 🎯 改进目标

1. **统一 API 响应格式** - 所有端点必须使用 `jsonResponse()` 函数
2. **规范测试代码** - 统一定义变量命名和访问模式
3. **完善错误处理** - 区分不同类型错误，返回准确信息
4. **建立审查流程** - 提交前必须通过一致性检查

---

## 📝 改进计划

### 阶段 1：制定规范（0.25 天）

#### 1.1 API 响应规范

**文件**: `docs/api-response-standards.md`

**核心内容**:
```markdown
# API 响应格式规范

## 强制要求

1. 所有 API 端点必须使用 `jsonResponse()` 函数
2. 禁止直接使用 `new Response(JSON.stringify(...))`
3. 响应格式统一为：
   ```json
   {
     "code": 200,
     "data": { ... },
     "msg": "success"
   }
   ```

## 使用示例

### 成功响应
```javascript
return jsonResponse({
  domains: list,
  count: list.length
}, 200);
```

### 错误响应
```javascript
return jsonResponse(null, 400, 'Invalid domain format');
```

### 带额外数据
```javascript
return jsonResponse({
  success: true,
  message: 'Domain added successfully',
  domain: cleanedDomain
}, 200);
```
```

#### 1.2 测试代码规范

**文件**: `docs/test-coding-standards.md`

**核心内容**:
```markdown
# 测试代码规范

## 变量命名约定

### 响应体变量
```javascript
// ✅ 正确
const body = await response.json();
assertEqual(body.data.domains.length, 2, ...);

// ❌ 错误
const config = await response.json();
const response = await response.json();
```

### Mock 对象
```javascript
// ✅ 正确
const env = createMockEnv();
const request = createMockRequest(url, method, body, headers);

// ❌ 错误
const mockEnv = createMockEnv();
const req = createMockRequest(...);
```

## 批量修改流程

1. **先 grep 查看范围**
   ```bash
   grep -n "const config = await" tests/integration/config.test.js
   grep -n "config\." tests/integration/config.test.js
   ```

2. **完整阅读相关文件**
   - 找出所有需要修改的地方
   - 理解代码结构

3. **一次性修改**
   - 使用编辑器多光标或查找替换
   - 确保所有相关代码一起修改

4. **运行测试验证**
   ```bash
   npm test
   ```

## 提交前检查

```bash
# 检查变量命名一致性
grep -E "(const|let|var) (body|config|response) =" tests/integration/*.test.js

# 检查访问模式
grep -E "(body|config)\.(data\.)?" tests/integration/*.test.js

# 检查 JSON 响应格式
grep -n "new Response(JSON.stringify" src/routes/admin/*.js
# 应该返回 0 个结果（除了 handleOptionsRequest）
```
```

#### 1.3 错误处理规范

**文件**: `docs/error-handling-standards.md`

**核心内容**:
```markdown
# 错误处理规范

## 基本原则

1. **区分错误类型** - 不同错误返回不同信息
2. **记录详细日志** - 便于排查问题
3. **不泄露敏感信息** - 错误信息对用户友好

## 错误类型分类

### 客户端错误 (4xx)
- 400 Bad Request - 请求格式错误
- 401 Unauthorized - 认证失败
- 404 Not Found - 资源不存在
- 409 Conflict - 资源冲突（如重复）

### 服务端错误 (5xx)
- 500 Internal Server Error - 服务器内部错误

## 实现模式

### JSON 解析错误
```javascript
let body;
try {
  body = await request.json();
} catch (error) {
  console.error('Failed to parse request body:', error.message);
  return jsonResponse(null, 400, 'Invalid JSON format');
}
```

### 业务逻辑错误
```javascript
if (!domain) {
  return jsonResponse(null, 400, 'Invalid domain format');
}

if (list.includes(domain)) {
  return jsonResponse(null, 409, 'Domain already exists');
}
```

### 未知错误
```javascript
try {
  // 业务逻辑
} catch (error) {
  console.error('Unexpected error:', error.message);
  return jsonResponse(null, 500, 'Internal server error');
}
```
```

---

### 阶段 2：工具建设（0.25 天）

#### 2.1 测试辅助函数

**文件**: `tests/support/test-helpers.js`

**内容**:
```javascript
// tests/support/test-helpers.js

/**
 * 从响应中提取 data 字段
 * @param {Response} response - 响应对象
 * @returns {Promise<Object>} data 字段内容
 */
export async function getData(response) {
  const body = await response.json();
  return body.data;
}

/**
 * 创建标准 Mock KV 存储
 * @returns {Object} Mock KV 对象
 */
export function createMockKV() {
  const store = {};
  return {
    async get(key) {
      return store[key] || null;
    },
    async put(key, value) {
      store[key] = value;
    },
    async delete(key) {
      delete store[key];
    }
  };
}

/**
 * 创建标准 Mock Env
 * @param {Object} overrides - 覆盖值
 * @returns {Object} Mock Env 对象
 */
export function createMockEnv(overrides = {}) {
  return {
    DOMAIN_MONITOR_KV: createMockKV(),
    CLOUDFLARE_API_TOKEN: 'test_secret_token_123',
    ALLOWED_ORIGINS: '*',
    ...overrides
  };
}
```

#### 2.2 预提交检查脚本

**文件**: `scripts/pre-commit-check.sh`

**内容**:
```bash
#!/bin/bash

# 预提交检查脚本
# 用法：./scripts/pre-commit-check.sh

set -e

echo "🔍 运行预提交检查..."

# 1. 检查 API 响应格式
echo "📋 检查 API 响应格式..."
INVALID_RESPONSE=$(grep -rn "new Response(JSON.stringify" src/routes/admin/*.js | grep -v "handleOptionsRequest" | wc -l)
if [ "$INVALID_RESPONSE" -gt 0 ]; then
  echo "❌ 发现 $INVALID_RESPONSE 处直接使用 new Response(JSON.stringify)"
  echo "   请使用 jsonResponse() 函数"
  exit 1
fi
echo "✅ API 响应格式检查通过"

# 2. 检查测试变量命名
echo "📋 检查测试变量命名..."
INCONSISTENT=$(grep -E "const (config|response) = await.*json\(\)" tests/integration/*.test.js | wc -l)
if [ "$INCONSISTENT" -gt 0 ]; then
  echo "❌ 发现 $INCONSISTENT 处使用 config/response 而非 body"
  echo "   请统一使用: const body = await response.json()"
  exit 1
fi
echo "✅ 测试变量命名检查通过"

# 3. 运行测试
echo "📋 运行测试..."
npm test
if [ $? -ne 0 ]; then
  echo "❌ 测试失败"
  exit 1
fi
echo "✅ 测试检查通过"

echo "✅ 所有预提交检查通过！"
```

---

### 阶段 3：文档化（0.1 天）

#### 3.1 更新项目 README

**文件**: `README.md`

**新增章节**:
```markdown
## 开发规范

本项目遵循以下开发规范：

### API 响应格式

所有 API 端点必须使用 `jsonResponse()` 函数，返回统一格式：

```json
{
  "code": 200,
  "data": { ... },
  "msg": "success"
}
```

### 测试代码

- 响应体变量统一使用 `body`
- 访问 data 字段：`body.data.xxx`
- Mock 对象使用 `createMockEnv()` 和 `createMockRequest()`

### 错误处理

- 区分错误类型（400/401/404/409/500）
- 记录详细日志
- 返回用户友好的错误信息

## 预提交检查

提交前运行：

```bash
./scripts/pre-commit-check.sh
```

检查项目：
- API 响应格式
- 测试变量命名
- 单元测试

## 相关文档

- [API 响应规范](docs/api-response-standards.md)
- [测试代码规范](docs/test-coding-standards.md)
- [错误处理规范](docs/error-handling-standards.md)
```

#### 3.2 更新新开发者指南

**文件**: `docs/onboarding-guide.md`

**新增内容**:
```markdown
## 代码质量工具链

### 必装工具

- Node.js (v20+)
- npm

### 推荐配置

在 VSCode 中安装 ESLint 和 Prettier 插件。

### 开发流程

1. 编写代码
2. 运行 `npm test`
3. 运行 `./scripts/pre-commit-check.sh`
4. 提交代码

### 常见问题

Q: 测试报错 "Cannot read properties of undefined"
A: 检查是否正确访问 `body.data.xxx`

Q: 批量修改后测试混乱
A: 先 grep 查看范围，再一次性修改，最后运行测试
```

---

### 阶段 4：团队培训（0.1 天）

#### 4.1 代码审查清单

**文件**: `docs/code-review-checklist.md`

**内容**:
```markdown
# 代码审查清单

## API 开发

- [ ] 所有端点使用 `jsonResponse()` 函数
- [ ] 响应格式符合 `{ code, data, msg }` 结构
- [ ] 错误处理区分不同类型
- [ ] 记录详细日志
- [ ] JSDoc 注释完整

## 测试开发

- [ ] 变量命名统一使用 `body`
- [ ] 访问 data 字段使用 `body.data.xxx`
- [ ] Mock 对象使用 helper 函数
- [ ] 测试覆盖边界场景
- [ ] 测试代码有 JSDoc 注释

## 代码质量

- [ ] 通过 `npm test`
- [ ] 通过 `./scripts/pre-commit-check.sh`
- [ ] 没有 console.log 调试代码
- [ ] 没有注释掉的代码块
- [ ] 文件大小合理（< 500 行）

## 文档

- [ ] 更新相关 API 文档
- [ ] 复杂逻辑有注释说明
- [ ] 提交信息清晰描述改动
```

---

## 📅 执行计划

| 阶段 | 任务 | 预计时间 | 完成标准 |
|------|------|---------|---------|
| 1.1 | 制定 API 响应规范 | 0.1 天 | 文档创建 |
| 1.2 | 制定测试代码规范 | 0.1 天 | 文档创建 |
| 1.3 | 制定错误处理规范 | 0.05 天 | 文档创建 |
| 2.1 | 创建测试辅助函数 | 0.1 天 | 文件创建并通过测试 |
| 2.2 | 创建预提交检查脚本 | 0.1 天 | 脚本可执行 |
| 3.1 | 更新 README | 0.05 天 | 文档更新 |
| 3.2 | 更新新开发者指南 | 0.05 天 | 文档更新 |
| 4.1 | 创建代码审查清单 | 0.05 天 | 文档创建 |
| **总计** | | **0.5 天** | |

---

## ✅ 验收标准

### 文档验收
- [ ] `docs/api-response-standards.md` 创建
- [ ] `docs/test-coding-standards.md` 创建
- [ ] `docs/error-handling-standards.md` 创建
- [ ] `docs/code-review-checklist.md` 创建
- [ ] `README.md` 更新
- [ ] `docs/onboarding-guide.md` 更新

### 工具验收
- [ ] `tests/support/test-helpers.js` 创建
- [ ] `scripts/pre-commit-check.sh` 创建并可执行
- [ ] 预提交检查全部通过

### 代码验收
- [ ] 所有 API 端点使用 `jsonResponse()`
- [ ] 所有测试使用统一变量命名
- [ ] 错误处理区分类型
- [ ] 所有测试通过（100%）

---

## 📊 成功指标

| 指标 | 当前 | 目标 | 测量方式 |
|------|------|------|---------|
| API 格式一致性 | 50% | 100% | grep 检查 |
| 测试变量命名一致性 | 60% | 100% | grep 检查 |
| 测试通过率 | 100% | 100% | npm test |
| 代码审查效率 | 低 | 高 | 主观评估 |
| 新人上手时间 | 长 | 短 | 主观评估 |

---

## 🔗 相关文档

- [任务 5 子任务文档](subtask-05-domains-api.md)
- [任务 6 子任务文档](subtask-06-config-api.md)
- [代码评审反馈](任务 5-6 评审问题汇总)

---

## 📝 变更记录

| 日期 | 变更内容 | 作者 |
|------|---------|------|
| 2026-05-29 | 初始版本 | AI Assistant |

---

## 🎯 下一步

1. 执行本改进计划（任务 0）
2. 应用改进到任务 5 和 6 的代码
3. 在后续任务中严格执行新规范
4. 定期回顾和改进规范
