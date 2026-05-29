# 子任务 11：定时检测任务（Cron Trigger）

## 任务目标

配置 Cloudflare Worker Cron Trigger，实现定时自动检测默认域名列表，并清理过期历史记录。

---

## 触发条件

- 每 12 小时自动执行一次默认域名列表检测
- 每天自动清理一次过期历史记录

---

## 子任务步骤

### 11.1 更新 wrangler.toml 配置 Cron

```toml
# wrangler.toml

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
crons = ["0 */12 * * *", "0 3 * * *"]  # 每 12 小时检测，每天 3 点清理历史

[env.production]
# ALLOWED_ORIGINS 和 CLOUDFLARE_API_TOKEN 通过 wrangler secret 注入

[[env.production.kv_namespaces]]
binding = "DOMAIN_MONITOR_KV"
id = "YOUR_KV_NAMESPACE_ID"
```

**文件**: `/workspace/wrangler.toml`

### 11.2 实现定时任务处理器

```javascript
// src/scheduled/detect.js

import { detectDomain, saveResult, addToHistory } from '../services/detector.js';
import { getDefaultDomains } from '../storage/default-domains.js';
import { cleanupHistory } from '../storage/history.js';
import { getConfig } from '../storage/config.js';

/**
 * 定时检测默认域名
 */
export async function detectScheduled(env) {
  console.log('[Scheduled] Starting default domains detection...');
  
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
      const result = await detectDomain(domain, env);
      await saveResult(env, result);
      await addToHistory(env, result);
      results.push({
        domain,
        success: true,
        overall: result.overall
      });
      success++;
      console.log(`[Scheduled] Detected ${domain}: ${result.overall}`);
    } catch (error) {
      results.push({
        domain,
        success: false,
        error: error.message
      });
      failed++;
      console.error(`[Scheduled] Failed to detect ${domain}:`, error.message);
    }
  }
  
  console.log(`[Scheduled] Detection completed: ${success} success, ${failed} failed`);
  
  return {
    success: true,
    skipped: false,
    total: defaultDomains.length,
    success,
    failed,
    results
  };
}

/**
 * 定时清理历史记录
 */
export async function cleanupScheduled(env) {
  console.log('[Scheduled] Starting history cleanup...');
  
  const config = await getConfig(env);
  const retentionDays = config.historyRetention || 7;
  
  const result = await cleanupHistory(env, retentionDays);
  
  console.log(`[Scheduled] Cleanup completed: ${result.recordsRemoved} records removed`);
  
  return {
    success: true,
    retentionDays: result.retentionDays,
    recordsRemoved: result.recordsRemoved
  };
}
```

**文件**: `/workspace/src/scheduled/detect.js`

### 11.3 更新 Worker 入口集成定时任务

```javascript
// src/index.js

import { handleOptionsRequest, getCorsHeaders } from './utils/helper.js';
import { handleRequest } from './routes/index.js';
import { detectScheduled, cleanupScheduled } from './scheduled/detect.js';

export default {
  async fetch(request, env, ctx) {
    const method = request.method;

    if (method === 'OPTIONS') {
      return handleOptionsRequest(request, env);
    }

    const corsHeaders = getCorsHeaders(request, env);

    try {
      const response = await handleRequest(request, env);
      
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }
      
      return response;
    } catch (error) {
      console.error('Unhandled error:', error);
      
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
  
  // === 定时任务入口 ===
  async scheduled(event, env, ctx) {
    const cronTime = event.cron;
    console.log(`[Scheduled] Triggered at ${new Date().toISOString()}, cron: ${cronTime}`);
    
    // 每 12 小时执行检测（0 */12 * * *）
    if (cronTime.includes('*/12') || cronTime.includes('0 0') || cronTime.includes('0 12')) {
      ctx.waitUntil(detectScheduled(env));
    }
    
    // 每天 3 点清理历史（0 3 * * *）
    if (cronTime.includes('0 3')) {
      ctx.waitUntil(cleanupScheduled(env));
    }
    
    return new Response('Scheduled task started');
  }
};
```

**文件**: `/workspace/src/index.js`

### 11.4 部署时绑定 Cron Trigger

```bash
# 部署到生产环境（会自动绑定 Cron）
wrangler deploy --env production

# 验证 Cron 配置
wrangler tail --env production
```

### 11.5 手动触发测试（可选）

```bash
# 本地测试定时任务
wrangler dev --test-scheduled

# 在浏览器访问 http://localhost:8787/__scheduled 触发
# 或使用 curl
curl -X POST http://localhost:8787/__scheduled
```

---

## Cron 表达式说明

| Cron 表达式 | 含义 | 说明 |
|------------|------|------|
| `0 */12 * * *` | 每 12 小时 | 00:00 和 12:00 执行 |
| `0 3 * * *` | 每天凌晨 3 点 | 清理历史记录 |

**完整格式**：`分钟 小时 日 月 星期`

---

## 验收标准

1. ✅ `wrangler.toml` 配置 `[triggers]` 块
2. ✅ `src/index.js` 实现 `scheduled` 方法
3. ✅ `src/scheduled/detect.js` 实现检测和清理函数
4. ✅ 使用 `ctx.waitUntil()` 确保异步任务完成
5. ✅ 日志输出清晰（便于调试）
6. ✅ 部署后 Cron 自动激活

---

## 测试用例

### 本地测试定时任务

```bash
# 启动带定时任务支持的开发服务器
wrangler dev --test-scheduled

# 触发定时任务
curl -X POST http://localhost:8787/__scheduled

# 或使用 wrangler 命令
wrangler scheduled now domain-monitor
```

### 查看日志

```bash
# 实时查看生产环境日志
wrangler tail --env production

# 应该看到：
# [Scheduled] Triggered at 2024-05-29T00:00:00.000Z, cron: 0 */12 * * *
# [Scheduled] Starting default domains detection...
# [Scheduled] Detected cloudflare.com: ok
# ...
```

---

## 日志示例

```
[Scheduled] Triggered at 2024-05-29T00:00:00.000Z, cron: 0 */12 * * *
[Scheduled] Starting default domains detection...
[Scheduled] Detected cloudflare.com: ok
[Scheduled] Detected google.com: ok
[Scheduled] Detected github.com: partial
[Scheduled] Detection completed: 2 success, 1 failed
```

---

## 相关文件

- `wrangler.toml` - Cron 配置
- `src/index.js` - Worker 入口（集成 scheduled）
- `src/scheduled/detect.js` - 定时任务逻辑

---

## 注意事项

### 1. Cron 时区
- Cloudflare Workers Cron 使用 **UTC 时区**
- `0 3 * * *` 表示 UTC 时间凌晨 3 点（北京时间 11 点）
- 如需北京时间凌晨 3 点，应配置 `0 19 * * *`（前一天 19 点 UTC）

### 2. 本地测试限制
- 本地开发环境的 `--test-scheduled` 功能可能不稳定
- 建议部署后在生产环境验证

### 3. 任务超时
- Cloudflare Workers 免费计划：最长 CPU 时间 10ms
- 使用 `ctx.waitUntil()` 延长后台任务执行时间
- 如果检测任务耗时较长，考虑分批处理

### 4. 失败重试
- Cron 任务失败不会自动重试
- 建议在代码中捕获异常并记录日志

---

## 后续依赖

- 任务 23：部署配置需要确认 Cron 绑定成功
- 任务 24：测试优化验证定时任务执行情况
