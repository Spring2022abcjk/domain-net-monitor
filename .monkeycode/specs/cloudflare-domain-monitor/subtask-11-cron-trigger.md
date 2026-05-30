# 子任务 11：定时检测任务（Cron Trigger）

**状态**: 🔴 未启动  
**优先级**: 高  
**预计工时**: 4-6 小时  
**创建日期**: 2026-05-30  
**更新日期**: 2026-05-30  

---

## 任务目标

配置 Cloudflare Worker Cron Trigger，实现定时自动检测默认域名列表，并在每天固定时间清理过期历史记录，同时更新统计数据。

### 核心需求

1. **定时检测**：每 12 小时自动检测默认域名列表
2. **定时清理**：每天凌晨 3 点（UTC）清理过期历史记录
3. **统计更新**：每次检测后更新统计信息
4. **错误处理**：检测失败不阻塞后续任务，记录日志
5. **异步执行**：使用 `ctx.waitUntil()` 确保任务完成

---

## Cron 配置

### 触发时间表

| Cron 表达式 | 含义 | UTC 时间 | 北京时间 |
|------------|------|---------|----------|
| `0 */12 * * *` | 每 12 小时 | 00:00 和 12:00 | 08:00 和 20:00 |
| `0 3 * * *` | 每天凌晨 3 点 | 03:00 | 11:00 |

**说明**：Cloudflare Workers Cron 使用 UTC 时区，北京时间 = UTC + 8

---

## 实现步骤

### 11.1 更新 wrangler.toml 配置 Cron

**文件**: `wrangler.toml`（修改）

```toml
name = "domain-monitor"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
ALLOWED_ORIGINS = "*"

[dev]
port = 8787

[[kv_namespaces]]
binding = "DOMAIN_MONITOR_KV"
id = "YOUR_KV_NAMESPACE_ID"
preview_id = "YOUR_KV_NAMESPACE_ID"

# === 定时任务配置 ===
[triggers]
crons = ["0 */12 * * *", "0 3 * * *"]

[env.production]
# ALLOWED_ORIGINS 和 CLOUDFLARE_API_TOKEN 通过 wrangler secret 注入

[[env.production.kv_namespaces]]
binding = "DOMAIN_MONITOR_KV"
id = "YOUR_KV_NAMESPACE_ID"
```

**验收要点**:
- [ ] `[triggers]` 块位于 `[kv_namespaces]]` 之后
- [ ] `crons` 数组包含两个表达式
- [ ] 生产环境也能触发 Cron（无需额外配置）

---

### 11.2 实现定时任务处理器

**文件**: `src/scheduled/detect.js`（新建）

```javascript
// src/scheduled/detect.js

import { detectDomain, saveResult } from '../services/detector.js';
import { addToHistory } from '../services/detector.js';
import { getDefaultDomains } from '../storage/default-domains.js';
import { cleanupHistory } from '../storage/history.js';
import { getConfig } from '../storage/config.js';
import { incrementRequests, recordRateLimitHit } from '../storage/stats.js';

/**
 * 定时检测默认域名
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<Object>} 检测结果
 */
export async function detectScheduled(env) {
  console.log('[Scheduled] Starting default domains detection...');
  console.log('[Scheduled] Trigger time:', new Date().toISOString());
  
  const defaultDomains = await getDefaultDomains(env);
  
  if (defaultDomains.length === 0) {
    console.log('[Scheduled] No default domains configured, skipping.');
    return {
      success: true,
      skipped: true,
      reason: 'No default domains configured'
    };
  }
  
  const results = [];
  let success = 0;
  let failed = 0;
  
  for (const domain of defaultDomains) {
    try {
      console.log(`[Scheduled] Detecting ${domain}...`);
      
      const result = await detectDomain(domain, env);
      await saveResult(env, result);
      await addToHistory(env, result);
      
      // 统计：记录成功检测
      await incrementRequests(env);
      
      results.push({
        domain,
        success: true,
        overall: result.overall,
        httpsRR: result.https_rr,
        ech: result.ech,
        ipv6: result.ipv6
      });
      
      success++;
      console.log(`[Scheduled] ✓ ${domain}: ${result.overall}`);
    } catch (error) {
      console.error(`[Scheduled] ✗ Failed to detect ${domain}:`, error.message);
      
      results.push({
        domain,
        success: false,
        error: error.message
      });
      
      failed++;
      
      // 统计：记录失败（可选）
      // await recordRateLimitHit(env);
    }
  }
  
  console.log(`[Scheduled] Detection completed: ${success} success, ${failed} failed`);
  console.log('[Scheduled] ====================================');
  
  return {
    success: true,
    skipped: false,
    total: defaultDomains.length,
    success,
    failed,
    results,
    timestamp: new Date().toISOString()
  };
}

/**
 * 定时清理历史记录
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<Object>} 清理结果
 */
export async function cleanupScheduled(env) {
  console.log('[Scheduled] Starting history cleanup...');
  console.log('[Scheduled] Trigger time:', new Date().toISOString());
  
  try {
    const config = await getConfig(env);
    const retentionDays = config.historyRetention || 7;
    
    console.log(`[Scheduled] Retention days: ${retentionDays}`);
    
    const result = await cleanupHistory(env, retentionDays);
    
    console.log(`[Scheduled] Cleanup completed: ${result.recordsRemoved} records removed`);
    console.log(`[Scheduled] Domains processed: ${result.domainsWithHistory}`);
    console.log('[Scheduled] ====================================');
    
    return {
      success: true,
      retentionDays: result.retentionDays,
      domainsWithHistory: result.domainsWithHistory,
      recordsRemoved: result.recordsRemoved,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Scheduled] Cleanup failed:', error.message);
    console.error('[Scheduled] ====================================');
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
```

**验收要点**:
- [ ] 使用 `console.log()` 记录详细日志
- [ ] 每个域名检测结果清晰标记（✓/✗）
- [ ] 错误处理不中断整个流程
- [ ] 返回包含时间戳的结果对象
- [ ] 函数有 JSDoc 注释

---

### 11.3 更新 Worker 入口集成定时任务

**文件**: `src/index.js`（修改）

```javascript
// src/index.js

import { handleOptionsRequest, getCorsHeaders } from './utils/helper.js';
import { handleRequest } from './routes/index.js';
import { detectScheduled, cleanupScheduled } from './scheduled/detect.js';

export default {
  /**
   * HTTP 请求处理
   */
  async fetch(request, env, ctx) {
    const method = request.method;

    if (method === 'OPTIONS') {
      return handleOptionsRequest(request, env);
    }

    const corsHeaders = getCorsHeaders(request, env);

    try {
      const response = await handleRequest(request, env, corsHeaders);
      
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }
      
      return response;
    } catch (error) {
      console.error('Unhandled error in fetch:', error);
      
      return new Response(JSON.stringify({
        code: 500,
        data: null,
        msg: `Internal Server Error: ${error.message}`
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  },
  
  /**
   * 定时任务处理
   */
  async scheduled(event, env, ctx) {
    const cronTime = event.cron;
    const scheduledTime = new Date().toISOString();
    
    console.log('[Scheduled] ====================================');
    console.log(`[Scheduled] Cron trigger: ${cronTime}`);
    console.log(`[Scheduled] Execution time: ${scheduledTime}`);
    console.log('[Scheduled] ====================================');
    
    // 每 12 小时执行检测（0 */12 * * *）
    // 匹配所有包含 */12 或特定时区的 cron
    if (cronTime.includes('*/12') || cronTime === '0 0 * * *' || cronTime === '0 12 * * *') {
      console.log('[Scheduled] Task: Default domains detection');
      // 使用 ctx.waitUntil() 确保异步任务完成
      ctx.waitUntil(detectScheduled(env));
    }
    
    // 每天 3 点清理历史（0 3 * * *）
    if (cronTime === '0 3 * * *') {
      console.log('[Scheduled] Task: History cleanup');
      ctx.waitUntil(cleanupScheduled(env));
    }
    
    return new Response('Scheduled task started', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
```

**验收要点**:
- [ ] 实现 `scheduled()` 方法
- [ ] 使用 `ctx.waitUntil()` 确保异步任务完成
- [ ] 日志包含 cron 表达式和执行时间
- [ ] 使用 `console.log()` 而非 `print()`
- [ ] 返回文本响应（便于调试）

---

### 11.4 部署时绑定 Cron Trigger

**部署命令**:
```bash
# 部署到生产环境（会自动绑定 Cron）
wrangler deploy --env production

# 或者使用别名
npm run deploy
```

**验证 Cron 配置**:
```bash
# 查看 Worker 配置（包含 triggers）
wrangler tail --env production

# 手动触发定时任务（测试用）
wrangler scheduled now domain-monitor --env production
```

---

### 11.5 手动触发测试（本地）

**启动带定时任务支持的开发服务器**:
```bash
wrangler dev --test-scheduled
```

**触发定时任务**:
```bash
# 方法 1: curl 访问特殊端点
curl -X POST http://localhost:8787/__scheduled

# 方法 2: 使用 wrangler 命令
wrangler scheduled now domain-monitor
```

**注意事项**:
- 本地 `--test-scheduled` 功能可能不稳定
- 建议部署后在生产环境验证
- 使用 `wrangler tail` 查看实时日志

---

## 统计字段说明

### 检测结果返回

```javascript
{
  success: "boolean",      // 任务是否成功
  skipped: "boolean",      // 是否跳过（无配置）
  total: "number",         // 总域名数
  success: "number",       // 成功数
  failed: "number",        // 失败数
  results: [               // 详细结果
    {
      domain: "string",    // 域名
      success: "boolean",  // 是否成功
      overall: "string",   // 总体状态 (ok/partial/no/error)
      httpsRR: "boolean",  // HTTPS RR 状态
      ech: "boolean",      // ECH 状态
      ipv6: "boolean"      // IPv6 状态
    }
  ],
  timestamp: "string"      // ISO 8601 时间戳
}
```

### 清理结果返回

```javascript
{
  success: "boolean",          // 是否成功
  retentionDays: "number",     // 保留天数
  domainsWithHistory: "number", // 有历史的域名数
  recordsRemoved: "number",    // 删除的记录数
  timestamp: "string"          // ISO 8601 时间戳
}
```

---

## 验收标准

### 功能验收

- [ ] `wrangler.toml` 配置 `[triggers]` 块
- [ ] 两个 Cron 表达式正确配置
- [ ] `src/index.js` 实现 `scheduled` 方法
- [ ] `src/scheduled/detect.js` 实现检测函数
- [ ] `src/scheduled/detect.js` 实现清理函数
- [ ] 使用 `ctx.waitUntil()` 确保异步任务完成
- [ ] 日志输出清晰（便于调试）
- [ ] 检测单个域名失败不中断整个流程
- [ ] 清理任务捕获异常，防止崩溃

### 部署验收

- [ ] 部署后 Cron 自动激活
- [ ] `wrangler tail` 能看到 cron 日志
- [ ] 生产环境定时任务正常执行

### 代码质量验收

- [ ] 使用 JSDoc 注释
- [ ] 错误处理完善
- [ ] 日志格式统一
- [ ] 通过预提交检查

---

## 测试用例

### 手动测试步骤

**步骤 1: 本地测试定时任务**

```bash
# 1. 启动开发服务器（带定时任务支持）
wrangler dev --test-scheduled

# 2. 在新终端触发定时任务
curl -X POST http://localhost:8787/__scheduled

# 3. 查看终端输出
# 应该看到：
# [Scheduled] ====================================
# [Scheduled] Cron trigger: */12 * * *
# [Scheduled] Execution time: 2026-05-30T00:00:00.000Z
# [Scheduled] Task: Default domains detection
# [Scheduled] Starting default domains detection...
# [Scheduled] ✓ cloudflare.com: ok
# ...

# 4. 清理历史任务
curl -X POST http://localhost:8787/__scheduled
# 注意：本地环境可能需要修改 cron 表达式触发
```

**步骤 2: 生产环境验证**

```bash
# 1. 部署到生产环境
wrangler deploy --env production

# 2. 实时查看日志
wrangler tail --env production

# 3. 等待定时任务触发（或手动触发）
wrangler scheduled now domain-monitor --env production

# 4. 查看日志确认执行
```

### 日志示例

**成功检测日志**:
```
[Scheduled] ====================================
[Scheduled] Cron trigger: 0 */12 * * *
[Scheduled] Execution time: 2026-05-30T00:00:00.000Z
[Scheduled] ====================================
[Scheduled] Task: Default domains detection
[Scheduled] Starting default domains detection...
[Scheduled] Trigger time: 2026-05-30T00:00:00.000Z
[Scheduled] Detecting cloudflare.com...
[Scheduled] ✓ cloudflare.com: ok
[Scheduled] Detecting google.com...
[Scheduled] ✓ google.com: ok
[Scheduled] Detecting example.com...
[Scheduled] ✓ example.com: partial
[Scheduled] Detection completed: 2 success, 1 failed
[Scheduled] ====================================
```

**清理日志**:
```
[Scheduled] ====================================
[Scheduled] Cron trigger: 0 3 * * *
[Scheduled] Execution time: 2026-05-30T03:00:00.000Z
[Scheduled] ====================================
[Scheduled] Task: History cleanup
[Scheduled] Starting history cleanup...
[Scheduled] Trigger time: 2026-05-30T03:00:00.000Z
[Scheduled] Retention days: 7
[Scheduled] Cleanup completed: 156 records removed
[Scheduled] Domains processed: 10
[Scheduled] ====================================
```

**失败日志**:
```
[Scheduled] ✗ Failed to detect invalid-domain: Network error
[Scheduled] Detection completed: 1 success, 1 failed
[Scheduled] Cleanup failed: KV operation failed
```

---

## 相关文件

### 新建文件
- `src/scheduled/detect.js` - 定时任务逻辑

### 修改文件
- `wrangler.toml` - 添加 Cron 配置
- `src/index.js` - 实现 `scheduled()` 方法

### 现有文件（引用）
- `src/services/detector.js` - 检测服务
- `src/storage/default-domains.js` - 默认域名存储
- `src/storage/history.js` - 历史记录存储
- `src/storage/config.js` - 配置存储
- `src/storage/stats.js` - 统计存储

---

## 依赖关系

### 前置依赖
- ✅ 任务 2：KV 存储结构扩展
- ✅ 任务 6：检测配置 API（提供 `historyRetention` 配置）
- ✅ 任务 9：历史记录 API（提供 `cleanupHistory` 函数）
- ✅ 任务 10：统计概览 API（提供统计更新）

### 后续依赖
- 任务 23：部署配置需要确认 Cron 绑定成功
- 任务 24：测试优化验证定时任务执行情况

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Cron 时区混淆（UTC vs 本地） | 高 | 在注释中明确标注 UTC 和北京时间 |
| 定时任务超时 | 中 | 使用 `ctx.waitUntil()` 延长执行时间 |
| 单个域名检测失败阻塞流程 | 中 | try-catch 包裹每个域名检测 |
| 清理任务删除过多数据 | 低 | 使用配置的 `historyRetention`，不硬编码 |
| Cron 未触发 | 中 | 部署后手动验证，检查 `wrangler.toml` 语法 |
| 本地测试不稳定 | 低 | 建议生产环境验证 |

---

## 注意事项

### 1. Cron 时区
- **Cloudflare Workers Cron 使用 UTC 时区**
- `0 3 * * *` 表示 UTC 时间凌晨 3 点 = 北京时间 11 点
- 如需北京时间凌晨 3 点，应配置 `0 19 * * *`（前一天 19 点 UTC）
- 建议在注释中明确时区转换

### 2. 任务超时
- Cloudflare Workers 免费计划：最长 CPU 时间 10ms
- 使用 `ctx.waitUntil()` 可以延长后台任务执行时间（最多 30 秒）
- 如果检测任务耗时较长，考虑分批处理

### 3. 失败重试
- Cron 任务失败**不会自动重试**
- 建议在代码中捕获异常并记录日志
- 可在后续任务中添加失败告警机制

### 4. 本地测试限制
- 本地开发环境的 `--test-scheduled` 功能可能不稳定
- 某些 cron 表达式可能无法触发
- 建议部署后在生产环境验证

### 5. 并发控制
- 如果定时任务执行时，上一次任务还未完成
- Cloudflare 会跳过触发（不会并发执行）
- 建议在日志中记录任务耗时，如有需要可优化性能

---

## 常见问题排查

**Q: Cron 未触发？**
- 检查 `wrangler.toml` 中 `[triggers]` 块是否正确
- 确认部署成功后，在 Cloudflare Dashboard 查看 Triggers 配置
- 使用 `wrangler scheduled now` 手动触发测试

**Q: 定时任务执行失败？**
- 查看日志：`wrangler tail --env production`
- 检查 KV 绑定是否正确
- 确认环境变量（如 `CLOUDFLARE_API_TOKEN`）已配置

**Q: 本地测试不工作？**
- 确认使用了 `--test-scheduled` 标志
- 尝试访问 `http://localhost:8787/__scheduled`
- 查看终端输出日志

**Q: 时区不对？**
- Cron 使用 UTC 时区
- 使用 [crontab.guru](https://crontab.guru/) 验证表达式
- 在注释中标注 UTC 和北京时间

---

## 下一步

1. 更新 `wrangler.toml` 添加 `[triggers]` 配置
2. 创建 `src/scheduled/detect.js` 定时任务模块
3. 更新 `src/index.js` 实现 `scheduled()` 方法
4. 本地测试定时任务（`wrangler dev --test-scheduled`）
5. 部署到生产环境（`wrangler deploy`）
6. 使用 `wrangler tail` 查看日志确认执行
7. 手动触发验证（可选）：`wrangler scheduled now domain-monitor`

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-30 | 1.0 | 初始版本，基于项目规范创建 |
