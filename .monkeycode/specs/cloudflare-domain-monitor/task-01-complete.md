# 任务 1 完成报告：Worker 环境变量配置

## 执行时间
2026-05-29

## 完成内容

### 1. 更新 wrangler.toml

**文件**: `/workspace/wrangler.toml`

**变更**:
- 添加 `[vars]` 块配置开发环境 `ALLOWED_ORIGINS=*`
- 添加 `[env.production]` 生产环境配置块
- 添加生产环境 KV 绑定
- 添加 Cron Trigger 配置（每 12 小时执行）

```toml
# 开发环境变量
[vars]
ALLOWED_ORIGINS = "*"

# 生产环境配置
[env.production]
# ALLOWED_ORIGINS 和 CLOUDFLARE_API_TOKEN 通过 wrangler secret 注入

[[env.production.kv_namespaces]]
binding = "DOMAIN_MONITOR_KV"
id = "YOUR_KV_NAMESPACE_ID"

# 定时任务配置（Cron Trigger）
[triggers]
crons = ["0 */12 * * *", "0 3 * * *"]
```

### 2. 更新 src/config.js

**文件**: `/workspace/src/config.js`

**变更**: 新增 KV 存储键名常量

```javascript
export const KV_KEY_DEFAULT_DOMAINS = 'default_domains';
export const KV_KEY_HISTORY_PREFIX = 'history:';
export const KV_KEY_CONFIG = 'config';
export const KV_KEY_STATS = 'stats';
```

### 3. 更新 src/utils/helper.js

**文件**: `/workspace/src/utils/helper.js`

**变更**:
- 添加 `getCorsHeaders(request, env)` 函数实现动态 CORS 头生成
- 更新 `handleOptionsRequest(request, env)` 函数使用动态 CORS 头
- 更新 `jsonResponse()` 支持额外 headers 参数
- 更新 `rateLimitExceededResponse()` 支持额外 headers 参数

**关键代码**:
```javascript
export function getCorsHeaders(request, env) {
  const allowedOrigins = env.ALLOWED_ORIGINS || '*';
  const origin = request.headers.get('Origin') || '';
  
  if (allowedOrigins === '*') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Token',
      'Access-Control-Max-Age': '86400'
    };
  }
  
  const origins = allowedOrigins.split(',').map(o => o.trim());
  
  if (origins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Token',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
  }
  
  return {};
}
```

### 4. 更新 src/index.js

**文件**: `/workspace/src/index.js`

**变更**:
- 更新导入包含 `getCorsHeaders`
- 更新 `handleOptionsRequest` 调用传入 `request` 和 `env`
- **修复 Response headers 不可变问题**：将 corsHeaders 传递给 handleRequest
- 在错误响应中直接展开 corsHeaders

```javascript
const corsHeaders = getCorsHeaders(request, env);

try {
  const response = await handleRequest(request, env, corsHeaders);
  return response;
} catch (error) {
  return new Response(JSON.stringify({...}), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
```

### 5. 更新 src/routes/index.js

**文件**: `/workspace/src/routes/index.js`

**变更**:
- `handleRequest()` 函数新增 `corsHeaders` 参数
- **修复 Response headers 不可变问题**：使用 `new Headers()` 克隆后合并 headers
- 限流响应也正确合并 CORS 和限流头

```javascript
export async function handleRequest(request, env, corsHeaders = {}) {
  // ...
  if (!rateLimitResult.allowed) {
    const headers = new Headers(response.headers);
    // 合并限流头和 CORS 头
    for (const [key, value] of Object.entries(limitHeaders)) {
      headers.set(key, value);
    }
    for (const [key, value] of Object.entries(corsHeaders)) {
      headers.set(key, value);
    }
    return new Response(response.body, { status: response.status, headers });
  }
  // ...
}
```

### 6. 创建配置文档

**文件**: `/workspace/docs/environment-setup.md`

**内容**:
- 环境变量列表及说明
- Token 生成方法（OpenSSL 命令）
- 注入命令（`wrangler secret put`）
- 验证配置方法
- 故障排查指南

### 7. 生成随机 Token

**命令**:
```bash
openssl rand -hex 32
```

**生成结果**:
```
ff10a24df88c7be158ff06f34e36707044b681f02ef090b569806d779e721703
```

---

## 代码评审修复

根据代码评审结果，修复了以下严重问题：

### 🔴 修复：Response Headers 不可变问题

**问题**: Cloudflare Worker 中 `Response.headers` 是不可变的，直接调用 `response.headers.set()` 会导致运行时错误。

**修复方案**:
1. `src/index.js`: 将 `corsHeaders` 传递给 `handleRequest()` 函数
2. `src/routes/index.js`: 使用 `new Headers()` 克隆 headers，然后合并限流头和 CORS 头
3. `src/utils/helper.js`: 更新 `jsonResponse()` 和 `rateLimitExceededResponse()` 支持额外 headers 参数

---

## 待完成步骤（需要手工执行）

### 部署到生产环境

1. **注入 CORS 白名单**:
```bash
wrangler secret put ALLOWED_ORIGINS --env production
# 输入：https://your-single.your-domain.pages.dev
```

2. **注入 API Token**:
```bash
wrangler secret put CLOUDFLARE_API_TOKEN --env production
# 输入：ff10a24df88c7be158ff06f34e36707044b681f02ef090b569806d779e721703
```

3. **部署**:
```bash
wrangler deploy --env production
```

---

## 验证方法

### 本地开发验证

```bash
npm run dev
```

应该看到：
- `env.ALLOWED_ORIGINS ("*")`
- `env.CLOUDFLARE_API_TOKEN ("(hidden)")`

### CORS 测试

```bash
# 测试允许的 Origin
curl -v -X OPTIONS http://localhost:8787/api/admin/config \
  -H "Origin: https://your-single.your-domain.pages.dev"

# 应该看到 Access-Control-Allow-Origin 头
```

---

## 验收标准

- ✅ `wrangler.toml` 配置完整（开发 + 生产环境）
- ✅ KV 常量定义完整
- ✅ 动态 CORS 函数实现
- ✅ Worker 入口集成 CORS
- ✅ **Response headers 不可变问题已修复**
- ✅ 配置文档创建完成
- ✅ Token 生成方法说明
- ⚠️ 生产环境注入需要手工执行（涉及密钥）

---

## 相关文档

- 子任务文档：`.monkeycode/specs/cloudflare-domain-monitor/subtask-01-env-config.md`
- 配置指南：`docs/environment-setup.md`
- 完成报告：`.monkeycode/specs/cloudflare-domain-monitor/task-01-complete.md`

---

## 下一步

继续任务 2：KV 存储结构扩展
