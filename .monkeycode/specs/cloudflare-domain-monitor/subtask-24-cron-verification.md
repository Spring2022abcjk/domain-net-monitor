# 子任务 24：定时检测验证

**状态**: 🔴 未启动  
**优先级**: P0 (高)  
**预计工时**: 1-2 小时  
**创建日期**: 2026-06-06  
**更新日期**: 2026-06-06  
**前置依赖**: 任务 22（部署配置）✅  

---

## 任务目标

验证定时检测任务（Cron Triggers）是否正常工作，确保自动检测和清理功能按预期执行。

### 核心需求

1. **Cron 配置验证**: 检查 `wrangler.toml` Cron 表达式
2. **时区转换**: 验证 UTC 与北京时间转换
3. **手动触发**: 测试定时任务手动执行
4. **检测逻辑**: 验证检测结果保存
5. **清理逻辑**: 验证历史清理功能

---

## 子步骤

### 24.1 Cron Trigger 配置验证

**目标**: 检查 Cron 配置是否正确

#### 步骤 1: 检查 wrangler.toml

```bash
cat wrangler.toml | grep -A 5 "\[triggers\]"
```

**预期配置**:
```toml
[triggers]
crons = ["0 */12 * * *", "0 3 * * *"]
# - 0 */12 * * * : 每 12 小时执行（UTC 00:00 和 12:00）
# - 0 3 * * *    : 每天 03:00 执行（UTC）
```

**北京时间转换**:
- `0 */12 * * *` → 北京 08:00 和 20:00（每 12 小时）
- `0 3 * * *` → 北京 11:00（每天凌晨清理历史）

**验收标准**:
- [ ] Cron 表达式正确
- [ ] 两个定时任务配置
- [ ] 注释说明清晰

#### 步骤 2: 检查生产环境配置

```bash
# 查看生产环境 Cron 配置
npx wrangler cron list --env production
```

**预期输出**:
```
┌─────────────────┬─────────────────┐
│ Cron            │ Created         │
├─────────────────┼─────────────────┤
│ 0 */12 * * *    │ 2026-06-06      │
│ 0 3 * * *       │ 2026-06-06      │
└─────────────────┴─────────────────┘
```

**验收标准**:
- [ ] 生产环境 Cron 已配置
- [ ] 两个 Cron 表达式显示
- [ ] 状态为 Active

#### 步骤 3: 检查定时任务代码

```bash
# 查看 scheduled 函数
cat src/index.js | grep -A 20 "async scheduled"
```

**预期代码**:
```javascript
/**
 * 定时任务处理函数
 * @param {ScheduledController} controller - 定时任务控制器
 * @param {import('./types.js').Env} env - 环境变量对象
 * @param {import('./types.js').CfContext} ctx - 上下文对象
 */
export async function scheduled(controller, env, ctx) {
  const cron = controller.cron;
  const now = new Date();
  
  console.log('[Scheduled] ====================================');
  console.log(`[Scheduled] Cron trigger: ${cron}`);
  console.log(`[Scheduled] Execution time: ${now.toISOString()}`);
  console.log('[Scheduled] ====================================');
  
  // 每 12 小时执行检测
  if (cron === '0 */12 * * *') {
    console.log('[Scheduled] Task: Default domains detection');
    // ... 检测逻辑
  }
  
  // 每天 3 点清理历史
  if (cron === '0 3 * * *') {
    console.log('[Scheduled] Task: History cleanup');
    // ... 清理逻辑
  }
}
```

**验收标准**:
- [ ] scheduled 函数存在
- [ ] 两个 Cron 分支处理
- [ ] 日志记录完整

---

### 24.2 手动触发检测任务

**目标**: 手动触发定时任务并验证执行结果

#### 步骤 1: 手动触发检测

```bash
BASE="https://domain-monitor.varhub.workers.dev"

# 手动触发定时任务（所有 scheduled 事件）
curl -X POST "$BASE/cdn-cgi/handler/scheduled"
```

**预期响应**:
```
Scheduled task started
```

#### 步骤 2: 检查执行日志

```bash
# 查看 Worker 日志（通过 Dashboard 或 wrangler tail）
npx wrangler tail --env production
```

**预期日志**:
```
[Scheduled] ====================================
[Scheduled] Cron trigger: 0 */12 * * *
[Scheduled] Execution time: 2026-06-06T12:00:00.000Z
[Scheduled] ====================================
[Scheduled] Task: Default domains detection
[Scheduled] Starting default domains detection...
[Scheduled] Trigger time: 2026-06-06T12:00:00.000Z
[Scheduled] Task initiated in Xms
[Scheduled] ====================================
[Scheduled] Checking domain: cloudflare.com
[Scheduled] Domain: cloudflare.com, Result: online
[Scheduled] Detection completed: 1 domains processed
[Scheduled] ====================================
```

**验收标准**:
- [ ] 日志显示 Cron trigger
- [ ] 日志显示任务类型
- [ ] 日志显示执行时间
- [ ] 日志显示检测结果

#### 步骤 3: 验证检测结果

```bash
TOKEN="YOUR_CLOUDFLARE_API_TOKEN"

# 检查域名状态
curl -s "$BASE/api/admin/domains" -H "X-API-Token: $TOKEN" | jq .data

# 检查结果缓存
curl -s "$BASE/api/public/domains" | jq .data.domains[0]

# 检查统计更新
curl -s "$BASE/api/admin/stats" -H "X-API-Token: $TOKEN" | jq .data.today
```

**验收标准**:
- [ ] 域名状态更新
- [ ] 结果缓存正确
- [ ] 统计数据更新（今日检测次数+1）

---

### 24.3 检测逻辑验证

**目标**: 验证检测逻辑是否完整正确

#### 检查项 1: 默认域名读取

```javascript
// src/scheduled/detect.js 中应包含：
const defaultDomains = await env.DOMAIN_MONITOR_KV.get('default_domains', 'json') || [];
const allDomains = await env.DOMAIN_MONITOR_KV.get('domain_list', 'json') || [];

// 如果没有默认域名，使用所有域名
const domainsToDetect = defaultDomains.length > 0 ? defaultDomains : allDomains;
```

**验证方法**:
```bash
# 查看默认域名配置
curl -s "$BASE/api/admin/config" -H "X-API-Token: $TOKEN" | jq .data.defaultDomains

# 查看域名列表
curl -s "$BASE/api/admin/domains" -H "X-API-Token: $TOKEN" | jq .data.domains
```

**验收标准**:
- [ ] 默认域名读取正确
- [ ] 如果没有默认域名，使用所有域名
- [ ] 域名列表非空

#### 检查项 2: DoH 查询

```javascript
// 检查 DoH 查询逻辑
const dohConfig = await env.DOMAIN_MONITOR_KV.get('config', 'json');
const dohUrl = dohConfig?.doh?.primary || 'https://cloudflare-dns.com/dns-query';

// 查询 A 记录
const response = await fetch(`${dohUrl}?name=${domain}&type=A`, {
  headers: { 'Accept': 'application/dns-json' }
});
const result = await response.json();
```

**验证方法**:
```bash
# 查看 DoH 配置
curl -s "$BASE/api/admin/doh" -H "X-API-Token: $TOKEN" | jq .data

# 测试 DoH 端点
curl -s -X POST "$BASE/api/admin/doh/test" \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://cloudflare-dns.com/dns-query"}' | jq .data
```

**验收标准**:
- [ ] DoH 配置读取正确
- [ ] DoH 查询成功
- [ ] 返回延迟信息

#### 检查项 3: 结果保存

```javascript
// 检查结果保存逻辑
await env.DOMAIN_MONITOR_KV.put(`result:${domain}`, JSON.stringify({
  status: result.Status === 0 ? 'online' : 'offline',
  responseTime: responseTime,
  timestamp: new Date().toISOString()
}));
```

**验证方法**:
```bash
# 检查特定域名结果
curl -s "https://domain-monitor.varhub.workers.dev/api/result/single" \
  -H "Content-Type: application/json" \
  -d '{"domain":"cloudflare.com"}' | jq .

# 或直接读取 KV（开发环境）
npx wrangler kv:key get --binding=DOMAIN_MONITOR_KV "result:cloudflare.com"
```

**验收标准**:
- [ ] 结果保存到 KV
- [ ] status 字段正确（online/offline）
- [ ] responseTime 字段存在
- [ ] timestamp 字段存在

#### 检查项 4: 统计更新

```javascript
// 检查统计更新逻辑
const stats = await env.DOMAIN_MONITOR_KV.get('stats', 'json') || {};
stats.todayRequests = (stats.todayRequests || 0) + 1;
stats.successCount = (stats.successCount || 0) + (status === 'online' ? 1 : 0);
await env.DOMAIN_MONITOR_KV.put('stats', JSON.stringify(stats));
```

**验证方法**:
```bash
# 检查统计数据
curl -s "$BASE/api/admin/stats" -H "X-API-Token: $TOKEN" | jq .data
```

**验收标准**:
- [ ] todayRequests 增加
- [ ] successCount 正确
- [ ] successRate 计算正确

---

### 24.4 历史清理验证

**目标**: 验证历史清理功能是否正常工作

#### 步骤 1: 手动触发清理任务

```bash
# 方法 1: 触发所有 scheduled 事件
curl -X POST "$BASE/cdn-cgi/handler/scheduled"

# 方法 2: 调用清理 API
curl -s -X DELETE "$BASE/api/admin/history" \
  -H "X-API-Token: $TOKEN" | jq .
```

#### 步骤 2: 检查清理日志

```bash
npx wrangler tail --env production
```

**预期日志**:
```
[Scheduled] ====================================
[Scheduled] Cron trigger: 0 3 * * *
[Scheduled] Execution time: 2026-06-06T03:00:00.000Z
[Scheduled] ====================================
[Scheduled] Task: History cleanup
[Scheduled] Starting history cleanup...
[Scheduled] Trigger time: 2026-06-06T03:00:00.000Z
[Scheduled] Task initiated in Xms
[Scheduled] ====================================
[Scheduled] Retention days: 7
[Scheduled] Cleanup completed: X records removed
[Scheduled] Domains processed: X
[Scheduled] ====================================
```

**验收标准**:
- [ ] 日志显示清理任务
- [ ] 日志显示保留天数
- [ ] 日志显示清理数量

#### 步骤 3: 验证清理结果

```bash
# 检查历史记录
curl -s "$BASE/api/admin/history" -H "X-API-Token: $TOKEN" | jq .data

# 检查清理后的统计
curl -s "$BASE/api/admin/stats" -H "X-API-Token: $TOKEN" | jq .data.historyDomains
```

**验收标准**:
- [ ] 过期历史被清理
- [ ] 保留期内的历史保留
- [ ] historyDomains 统计正确

---

### 24.5 时区转换验证

**目标**: 验证 Cron 表达式的北京时间转换

#### UTC → 北京时间转换

| Cron 表达式 | UTC 时间 | 北京时间 |
|-----------|---------|---------|
| `0 */12 * * *` | 00:00, 12:00 | 08:00, 20:00 |
| `0 3 * * *` | 03:00 | 11:00 |

#### 验证方法

1. **查看 Cron 配置**

```bash
cat wrangler.toml | grep -A 3 "crons ="
```

2. **检查注释说明**

确保 `wrangler.toml` 包含时区说明：
```toml
[triggers]
crons = ["0 */12 * * *", "0 3 * * *"]
# Cron 表达式使用 UTC 时区
# 北京时间 = UTC + 8
# - 0 */12 * * * : 每 12 小时执行（UTC 00:00 和 12:00 = 北京 08:00 和 20:00）
# - 0 3 * * *    : 每天凌晨 3 点清理（UTC 03:00 = 北京 11:00）
```

**验收标准**:
- [ ] Cron 表达式使用 UTC
- [ ] 注释包含北京时间说明
- [ ] 执行时间与预期一致

---

## 验收标准

### Cron 配置

- [ ] `wrangler.toml` 包含 Cron 配置
- [ ] 两个 Cron 表达式正确
- [ ] 生产环境配置正确
- [ ] Cron 列表显示 Active

### 检测任务

- [ ] 手动触发成功
- [ ] 日志记录完整
- [ ] 检测结果保存
- [ ] 统计数据更新
- [ ] 默认域名读取正确

### 清理任务

- [ ] 手动清理成功
- [ ] 清理日志完整
- [ ] 保留期配置生效
- [ ] 过期历史删除

### 时区转换

- [ ] UTC 时间正确
- [ ] 北京时间转换正确
- [ ] 注释说明清晰

---

## 交付物

### 验证报告

| 文档 | 说明 |
|------|------|
| `tests/cron-verification.md` | Cron 验证报告 |
| `tests/scheduled-task-log.md` | 定时任务执行日志 |

### 脚本

| 脚本 | 说明 |
|------|------|
| `scripts/manual-schedule-trigger.sh` | 手动触发定时任务脚本 |
| `scripts/verify-cron.sh` | Cron 配置验证脚本 |

---

## 故障排查

### 问题 1: Cron 未配置

**现象**: `wrangler cron list` 显示为空

**解决**:
```bash
# 重新部署
npx wrangler deploy --env production

# 验证
npx wrangler cron list --env production
```

### 问题 2: 手动触发失败

**现象**: `curl /cdn-cgi/handler/scheduled` 返回 404

**解决**:
```bash
# 检查 Worker 状态
npx wrangler status --env production

# 检查日志
npx wrangler tail --env production
```

### 问题 3: 检测结果未保存

**现象**: 定时任务执行但结果未更新

**解决**:
```bash
# 检查 KV 绑定
cat wrangler.toml | grep -A 3 "kv_namespaces"

# 检查 KV 权限
npx wrangler kv:key get --binding=DOMAIN_MONITOR_KV "domain_list"
```

### 问题 4: 清理逻辑未执行

**现象**: 历史记录未清理

**解决**:
```bash
# 手动触发清理 API
curl -X DELETE "$BASE/api/admin/history" -H "X-API-Token: $TOKEN"

# 检查清理代码
cat src/scheduled/cleanup.js
```

---

## 相关文档

- [Cron Triggers 文档](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [定时任务测试](https://developers.cloudflare.com/workers/configuration/cron-triggers/#test-cron-triggers-locally)
- [Scheduled Workers](https://developers.cloudflare.com/workers/platform/triggers/scheduled/)

---

## 下一步

完成本任务后：
1. 验证生产环境定时任务自动执行
2. 检查日志确认每日执行情况
3. 根据实际需求调整 Cron 表达式

---

**创建时间**: 2026-06-06  
**预计完成**: 2026-06-06  
**状态**: 🔴 待开始
