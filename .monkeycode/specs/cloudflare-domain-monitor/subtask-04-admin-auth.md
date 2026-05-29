# 任务 4：管理员认证 API - 子任务分解

## 任务目标

实现管理员认证相关的 API 端点，包括 Token 验证、鉴权中间件、安全配置查询等功能。

---

## 子任务列表

### 4.1 创建鉴权中间件模块

**文件**: `src/middleware/auth.js`

**功能**:
- `isValidAdminToken(request, env)` - 验证 API Token 是否有效
- `withAdminAuth(handler)` - 鉴权中间件包装器
- `extractToken(request)` - 从请求头提取 Token

**实现要点**:
```javascript
// 从 X-API-Token 头提取 Token
const token = request.headers.get('X-API-Token');

// 与 env.CLOUDFLARE_API_TOKEN 比较
const isValid = token === env.CLOUDFLARE_API_TOKEN;

// 返回 401 响应（如果无效）
return jsonResponse({ code: 401, msg: 'Invalid or missing API Token' }, 401);
```

**验收标准**:
- ✅ Token 为空时返回 401
- ✅ Token 不匹配时返回 401
- ✅ Token 匹配时调用原始 handler
- ✅ 未配置 CLOUDFLARE_API_TOKEN 时返回 401
- ✅ 中间件包装器正确保留 handler 的返回值

---

### 4.2 创建响应式中间件模块

**文件**: `src/middleware/rate-limit.js`

**功能**:
- `shouldBypassRateLimit(request, env)` - 检查是否豁免限流（管理员 Token）
- `rateLimitMiddleware(handler)` - 限流中间件包装器

**实现要点**:
```javascript
// 管理员 Token 豁免限流
if (isValidAdminToken(request, env)) {
  return handler(request, env);  // 直接调用，不限流
}

// 普通用户走限流逻辑
const { allowed, remaining } = rateLimiter(ip, env);
if (!allowed) {
  return rateLimitExceededResponse();
}
```

**验收标准**:
- ✅ 有有效 Admin Token 时不限流
- ✅ 普通用户正常限流（10 次/分钟）
- ✅ 限流头正确返回（X-RateLimit-Limit, X-RateLimit-Remaining）

---

### 4.3 实现 Token 验证 API

**文件**: `src/routes/admin/auth.js`

**API**: `POST /api/admin/auth/verify`

**请求**:
```http
POST /api/admin/auth/verify
Content-Type: application/json
X-API-Token: <token>

{
  "test": true  // 可选，仅测试连接
}
```

**响应（成功）**:
```json
{
  "code": 200,
  "data": {
    "valid": true,
    "message": "Token is valid"
  },
  "msg": "success"
}
```

**响应（失败）**:
```json
{
  "code": 401,
  "data": null,
  "msg": "Invalid or missing API Token"
}
```

**验收标准**:
- ✅ Token 有效返回 200 + valid: true
- ✅ Token 无效返回 401
- ✅ Token 缺失返回 401
- ✅ 请求体可选（支持空 body）
- ✅ 响应包含 CORS 头

---

### 4.4 实现注销 API（可选）

**文件**: `src/routes/admin/auth.js`

**API**: `POST /api/admin/auth/logout`

**请求**:
```http
POST /api/admin/auth/logout
X-API-Token: <token>
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "message": "Logout successful. Please clear stored credentials on client side."
  },
  "msg": "success"
}
```

**功能说明**:
- 无状态 API（不需要服务端 session）
- 仅提示前端清除 localStorage
- 返回成功消息即可

**验收标准**:
- ✅ 返回 200 成功响应
- ✅ 响应提示前端清除凭据
- ✅ 不需要实际验证 Token（允许前端强制登出）

---

### 4.5 实现安全配置查询 API

**文件**: `src/routes/admin/config.js`

**API**: `GET /api/admin/config/security`

**请求**:
```http
GET /api/admin/config/security
X-API-Token: <token>
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "corsMode": "whitelist",
    "allowedOrigins": ["https://your-single.your-domain.pages.dev"],
    "rateLimit": {
      "enabled": true,
      "windowMs": 60000,
      "maxRequests": 10,
      "adminBypass": true
    },
    "tokenConfigured": true
  },
  "msg": "success"
}
```

**实现要点**:
```javascript
// 读取环境变量
const corsMode = env.ALLOWED_ORIGINS === '*' ? 'public' : 'whitelist';
const allowedOrigins = corsMode === 'whitelist' 
  ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];
const tokenConfigured = !!env.CLOUDFLARE_API_TOKEN;
```

**验收标准**:
- ✅ 返回 CORS 配置模式（public/whitelist）
- ✅ 返回允许的 Origin 列表
- ✅ 返回限流配置
- ✅ 返回 Token 是否已配置
- ✅ 需要有效 Token 才能访问（401 保护）

---

### 4.6 更新路由分发器

**文件**: `src/routes/index.js`

**改动**:
```javascript
// 导入管理路由
import { handleAuth } from './admin/auth.js';
import { handleConfig } from './admin/config.js';

// 添加路由规则
if (path.startsWith('/api/admin/auth/')) {
  return handleAuth(request, env);
}

if (path.startsWith('/api/admin/config/')) {
  return handleConfig(request, env);
}
```

**验收标准**:
- ✅ `/api/admin/auth/*` 路由到 auth handler
- ✅ `/api/admin/config/security` 路由到 config handler
- ✅ 404 路由仍然正常工作

---

### 4.7 集成鉴权中间件到所有管理 API

**文件**: `src/routes/admin/*.js`

**改动**:
```javascript
import { withAdminAuth } from '../../middleware/auth.js';

// 使用中间件包装
export async function handleAuth(request, env) {
  // 内部逻辑
}

// 或者在路由层包装
const wrappedHandler = withAdminAuth(handleAuth);
```

**验收标准**:
- ✅ 所有 `/api/admin/*` API 都需要 Token
- ✅ 未携带 Token 返回 401
- ✅ Token 无效返回 401
- ✅ Token 有效正常处理请求

---

### 4.8 编写集成测试

**文件**: `tests/integration/auth.test.js`

**测试场景**:

1. **Token 验证 API 测试**:
   - ✅ 空 Token 返回 401
   - ✅ 错误 Token 返回 401
   - ✅ 正确 Token 返回 200
   - ✅ Token 长度边界测试

2. **安全配置 API 测试**:
   - ✅ 无 Token 返回 401
   - ✅ 有 Token 返回配置
   - ✅ CORS 配置格式正确
   - ✅ 限流配置格式正确

3. **限流豁免测试**:
   - ✅ 普通用户触发限流
   - ✅ Admin Token 不限流（超过 10 次仍成功）

4. **中间件测试**:
   - ✅ withAdminAuth 包装器保留 handler 返回值
   - ✅ 错误响应包含正确 JSON 格式

**验收标准**:
- ✅ 至少 15 个测试用例
- ✅ 所有测试通过
- ✅ 包含边界场景测试

---

## 路由表总览

| 路径 | 方法 | 鉴权 | 限流 | 说明 |
|------|------|------|------|------|
| `/api/admin/auth/verify` | POST | ✅ | ❌（管理员豁免） | 验证 Token |
| `/api/admin/auth/logout` | POST | ❌（可选） | ❌ | 注销登录 |
| `/api/admin/config/security` | GET | ✅ | ❌（管理员豁免） | 查询安全配置 |

---

## 相关文件

### 新增文件
- `src/middleware/auth.js` - 鉴权中间件
- `src/middleware/rate-limit.js` - 限流中间件（管理员豁免逻辑）
- `src/routes/admin/auth.js` - 认证路由
- `src/routes/admin/config.js` - 配置路由
- `tests/integration/auth.test.js` - 集成测试

### 更新文件
- `src/routes/index.js` - 路由分发器
- `src/utils/helper.js` - 可能需要导出 `extractToken` 工具函数

---

## 实现步骤

### 步骤 1: 创建中间件模块
```bash
mkdir -p src/middleware
touch src/middleware/auth.js
touch src/middleware/rate-limit.js
```

### 步骤 2: 实现鉴权中间件
- 编写 `isValidAdminToken` 函数
- 编写 `withAdminAuth` 包装器
- 添加 JSDoc 类型注释

### 步骤 3: 实现限流中间件
- 编写 `shouldBypassRateLimit` 函数
- 包装现有 `rateLimiter` 逻辑
- 测试管理员豁免

### 步骤 4: 创建管理路由
- 创建 `src/routes/admin/` 目录
- 实现 `auth.js`（verify + logout）
- 实现 `config.js`（security config）

### 步骤 5: 更新路由分发
- 在 `src/routes/index.js` 添加 admin 路由规则
- 导入新的 handler
- 测试路由匹配

### 步骤 6: 集成鉴权
- 为所有 `/api/admin/*` handler 添加 `withAdminAuth` 包装
- 验证 Token 保护生效

### 步骤 7: 编写测试
- 创建集成测试文件
- 覆盖所有场景
- 运行测试验证

### 步骤 8: 文档更新
- 更新 API 文档
- 记录 Token 认证流程
- 添加安全配置说明

---

## 安全考虑

### Token 安全
- ✅ Token 通过环境变量注入（不硬编码）
- ✅ Token 通过 `wrangler secret put` 设置
- ✅ Token 不在日志中打印
- ✅ Token 比较使用恒定时间比较（防止时序攻击）

### 限流豁免
- ✅ 仅管理员 Token 豁免限流
- ✅ 豁免逻辑在中间件层实现
- ✅ 普通用户仍然受 10 次/分钟限制

### CORS 保护
- ✅ 管理 API 受 CORS 白名单保护
- ✅ `Vary: Origin` 头防止 CDN 缓存污染
- ✅ 不在白名单的 Origin 无法访问管理 API

---

## 验收标准

### 功能验收
- ✅ 所有 `/api/admin/*` API 需要有效 Token
- ✅ Token 验证 API 返回正确响应
- ✅ 安全配置 API 返回完整配置
- ✅ 管理员 Token 豁免限流
- ✅ 普通用户限流正常工作

### 代码质量
- ✅ 中间件可复用
- ✅ 完整的 JSDoc 类型注释
- ✅ 遵循现有代码风格
- ✅ 错误处理完善

### 测试覆盖
- ✅ 至少 15 个测试用例
- ✅ 包含边界场景
- ✅ 所有测试通过

### 文档
- ✅ API 文档更新
- ✅ 使用说明完整
- ✅ 安全注意事项说明

---

## 下一步

- **任务 5**: 域名管理 API（需要任务 4 的鉴权）
- **任务 6**: 检测配置 API（需要任务 4 的鉴权）
- **任务 7-11**: 其他管理 API（都需要任务 4 的鉴权）

---

## 相关文件

- `/workspace/src/middleware/auth.js` - 鉴权中间件
- `/workspace/src/middleware/rate-limit.js` - 限流中间件
- `/workspace/src/routes/admin/auth.js` - 认证路由
- `/workspace/src/routes/admin/config.js` - 配置路由
- `/workspace/tests/integration/auth.test.js` - 集成测试
