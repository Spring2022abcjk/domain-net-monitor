# API Response Validator Skill

自动检查和强制执行 API 响应格式规范，确保所有 API 端点使用统一的响应格式。

## 适用场景

当用户开发或修改 API 端点时，自动检测以下场景：

1. **新建 API 路由** - 检查是否使用 `jsonResponse()` 函数
2. **修改现有 API** - 验证响应格式是否符合规范
3. **提交前检查** - 扫描所有 API 文件确保格式统一
4. **代码评审** - 识别不一致的响应格式

## 检测规则

### 规则 1: 禁止直接使用 Response

❌ **禁止**:
```javascript
return new Response(JSON.stringify({ code: 200, data: config }), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
});
```

✅ **正确**:
```javascript
import { jsonResponse } from '../utils/helper.js';

return jsonResponse(config, 200);
```

### 规则 2: 强制使用统一格式

所有 API 响应必须遵循以下结构：

```json
{
  "code": 200,
  "data": { ... },
  "msg": "success"
}
```

### 规则 3: 禁止格式混用

同一文件中不允许混用多种响应格式。

## 执行流程

### 步骤 1: 扫描 API 文件

```bash
# 扫描所有 API 路由文件
find src/routes -name "*.js" -type f
```

### 步骤 2: 检测违规模式

使用以下正则表达式检测违规代码：

```javascript
// 检测直接使用 Response
const responsePattern = /new Response\(JSON\.stringify\(/

// 检测 jsonResponse 导入
const importPattern = /import.*jsonResponse.*from/

// 检测 jsonResponse 调用
const callPattern = /jsonResponse\(/
```

### 步骤 3: 生成检查报告

```markdown
## API 响应格式检查报告

### 通过 ✅
- `src/routes/admin/domains.js` - 使用 jsonResponse
- `src/routes/admin/config.js` - 使用 jsonResponse

### 失败 ❌
- `src/routes/admin/legacy.js` - 发现 Response 直接使用 (第 23 行)
```

### 步骤 4: 自动修复（可选）

对于简单的违规模式，提供自动修复建议：

```javascript
// 修复前
return new Response(JSON.stringify({ success: true }), {
  status: 200
});

// 修复后
import { jsonResponse } from '../utils/helper.js';

return jsonResponse({ success: true }, 200);
```

## 错误码规范

检测错误响应是否使用正确的 HTTP 状态码：

| 状态码 | 场景 | 示例 |
|--------|------|------|
| 400 | 请求格式错误 | `jsonResponse(null, 400, 'Invalid domain format')` |
| 401 | 认证失败 | `jsonResponse(null, 401, 'Invalid API Token')` |
| 404 | 资源不存在 | `jsonResponse(null, 404, 'Domain not found')` |
| 409 | 资源冲突 | `jsonResponse(null, 409, 'Domain already exists')` |
| 429 | 限流 | `jsonResponse(null, 429, 'Rate limit exceeded')` |
| 500 | 服务器错误 | `jsonResponse(null, 500, 'Internal server error')` |

## 使用方式

### 方式 1: 提交前检查

```bash
./scripts/check-api-response.sh
```

### 方式 2: 在对话中请求

用户："检查 API 响应格式是否规范"

Skill 自动执行检查并生成报告。

### 方式 3: 开发新 API 时

用户："创建新的 API 端点"

Skill 提供正确的代码模板，包含 `jsonResponse` 导入和使用。

## 检查脚本示例

```bash
#!/bin/bash
# scripts/check-api-response.sh

echo "🔍 检查 API 响应格式..."

# 检查直接使用 Response 的情况
VIOLATIONS=$(grep -rn "new Response(JSON.stringify" src/routes/ | grep -v "handleOptionsRequest" | wc -l)

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "❌ 发现 $VIOLATIONS 处违规使用 Response"
  grep -rn "new Response(JSON.stringify" src/routes/ | grep -v "handleOptionsRequest"
  exit 1
fi

# 检查是否所有 API 文件都导入了 jsonResponse
MISSING_IMPORT=$(grep -L "jsonResponse" src/routes/admin/*.js | wc -l)

if [ "$MISSING_IMPORT" -gt 0 ]; then
  echo "⚠️ 发现 $MISSING_IMPORT 个文件未使用 jsonResponse"
  grep -L "jsonResponse" src/routes/admin/*.js
  exit 1
fi

echo "✅ 所有 API 响应格式检查通过"
exit 0
```

## 验证清单

- [ ] 所有 API 文件导入 `jsonResponse`
- [ ] 无直接使用 `new Response(JSON.stringify)`
- [ ] 错误响应使用正确的状态码
- [ ] 响应包含 `code`、`data`、`msg` 字段
- [ ] 同一文件中无格式混用

## 相关文件

- `src/utils/helper.js` - `jsonResponse()` 函数实现
- `docs/api-response-standards.md` - 原始规范文档
- `scripts/check-api-response.sh` - 检查脚本

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-06-01 | 1.0 | 基于 api-response-standards.md 升级到 Skill |
