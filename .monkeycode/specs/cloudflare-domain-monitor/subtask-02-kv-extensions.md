# 子任务 2：KV 存储结构扩展

## 任务目标

扩展现有 KV 存储结构，支持默认域名列表、历史记录、配置和统计数据存储。

---

## 子任务步骤

### 2.1 更新 config.js 常量

添加新增的 KV 键名：

```javascript
// src/config.js

// 现有常量
export const KV_KEY_DOMAIN_LIST = 'domain_list';
export const KV_KEY_RESULT_PREFIX = 'result:';

// === 新增常量 ===
export const KV_KEY_DEFAULT_DOMAINS = 'default_domains';  // 默认展示域名列表
export const KV_KEY_HISTORY_PREFIX = 'history:';         // 历史记录前缀
export const KV_KEY_CONFIG = 'config';                   // 配置存储
export const KV_KEY_STATS = 'stats';                     // 统计数据
```

**文件**: `/workspace/src/config.js`

### 2.2 实现配置存储模块

创建配置管理模块：

```javascript
// src/storage/config.js

import { KV_KEY_CONFIG } from '../config.js';

const DEFAULT_CONFIG = {
  defaultRefreshInterval: 43200,  // 12 小时（秒）
  rateLimit: {
    windowMs: 60000,              // 60 秒
    maxRequests: 10               // 10 次/分钟
  },
  historyRetention: 7,            // 7 天
  defaultDomains: [],             // 默认域名列表（空则使用内置）
  doh: {
    primary: 'https://cloudflare-dns.com/dns-query',
    backup: 'https://dns.google/resolve'
  }
};

/**
 * 获取配置（读默认值如果不存在）
 */
export async function getConfig(env) {
  const kv = getKV(env);
  const data = await kv.get(KV_KEY_CONFIG);
  
  if (!data) {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));  // Deep copy
  }
  
  const config = JSON.parse(data);
  // 合并默认值
  return {
    ...DEFAULT_CONFIG,
    ...config,
    rateLimit: { ...DEFAULT_CONFIG.rateLimit, ...config.rateLimit },
    doh: { ...DEFAULT_CONFIG.doh, ...config.doh }
  };
}

/**
 * 保存配置
 */
export async function setConfig(env, config) {
  const kv = getKV(env);
  await kv.put(KV_KEY_CONFIG, JSON.stringify(config));
}
```

**文件**: `/workspace/src/storage/config.js`

### 2.3 实现默认域名列表存储

```javascript
// src/storage/default-domains.js

import { KV_KEY_DEFAULT_DOMAINS } from '../config.js';

/**
 * 获取默认展示域名列表
 */
export async function getDefaultDomains(env) {
  const kv = getKV(env);
  const data = await kv.get(KV_KEY_DEFAULT_DOMAINS);
  
  if (!data) {
    // 如果未配置，返回空数组（由业务逻辑决定是否使用内置）
    return [];
  }
  
  return JSON.parse(data);
}

/**
 * 设置默认展示域名列表
 */
export async function setDefaultDomains(env, domains) {
  const kv = getKV(env);
  await kv.put(KV_KEY_DEFAULT_DOMAINS, JSON.stringify(domains));
}
```

**文件**: `/workspace/src/storage/default-domains.js`

### 2.4 实现历史记录存储

```javascript
// src/storage/history.js

import { KV_KEY_HISTORY_PREFIX } from '../config.js';

/**
 * 添加历史记录
 * @param {Object} env - 环境变量
 * @param {string} domain - 域名
 * @param {Object} result - 检测结果
 */
export async function addHistory(env, domain, result) {
  const kv = getKV(env);
  const key = `${KV_KEY_HISTORY_PREFIX}${domain}`;
  
  // 读取现有历史
  const data = await kv.get(key);
  const history = data ? JSON.parse(data) : [];
  
  // 添加到开头
  history.unshift({
    ...result,
    timestamp: Date.now()
  });
  
  // 保留最近的 100 条（可配置）
  if (history.length > 100) {
    history.length = 100;
  }
  
  await kv.put(key, JSON.stringify(history));
}

/**
 * 获取历史记录
 * @param {Object} env - 环境变量
 * @param {string} domain - 域名
 * @param {number} days - 天数
 * @param {number} limit - 每域名返回条数
 */
export async function getHistory(env, domain, days = 7, limit = 100) {
  const kv = getKV(env);
  const key = `${KV_KEY_HISTORY_PREFIX}${domain}`;
  
  const data = await kv.get(key);
  if (!data) {
    return [];
  }
  
  const history = JSON.parse(data);
  
  // 过滤天数
  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  const filtered = history.filter(item => item.timestamp >= cutoffTime);
  
  // 限制数量
  return filtered.slice(0, limit);
}

/**
 * 获取所有域名的历史记录
 */
export async function getAllHistory(env, domainList, days = 7, limit = 10) {
  const results = {};
  
  for (const domain of domainList) {
    results[domain] = await getHistory(env, domain, days, limit);
  }
  
  return results;
}

/**
 * 清理过期历史记录
 * @param {Object} env - 环境变量
 * @param {Array} domainList - 域名列表
 * @param {number} retentionDays - 保留天数
 */
export async function cleanupHistory(env, domainList, retentionDays = 30) {
  const kv = getKV(env);
  const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  
  for (const domain of domainList) {
    const key = `${KV_KEY_HISTORY_PREFIX}${domain}`;
    const data = await kv.get(key);
    if (!data) continue;
    
    const history = JSON.parse(data);
    const filtered = history.filter(item => item.timestamp >= cutoffTime);
    
    if (filtered.length !== history.length) {
      await kv.put(key, JSON.stringify(filtered));
    }
  }
}
```

**文件**: `/workspace/src/storage/history.js`

### 2.5 实现统计数据存储

```javascript
// src/storage/stats.js

import { KV_KEY_STATS } from '../config.js';

/**
 * 初始化或获取统计数据
 */
export async function getStats(env) {
  const kv = getKV(env);
  const data = await kv.get(KV_KEY_STATS);
  
  if (!data) {
    return {
      todayRequests: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    };
  }
  
  const stats = JSON.parse(data);
  
  // 检查是否需要重置（新的一天）
  const today = new Date().toDateString();
  const lastResetDate = new Date(stats.lastReset).toDateString();
  
  if (today !== lastResetDate) {
    // 新的天，重置计数
    return {
      todayRequests: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    };
  }
  
  return stats;
}

/**
 * 更新统计数据
 */
export async function incrementStats(env, field = 'todayRequests', amount = 1) {
  const kv = getKV(env);
  const stats = await getStats(env);
  
  stats[field] = (stats[field] || 0) + amount;
  
  await kv.put(KV_KEY_STATS, JSON.stringify(stats));
}

/**
 * 记录限流触发
 */
export async function recordRateLimitHit(env) {
  return incrementStats(env, 'rateLimitHits', 1);
}
```

**文件**: `/workspace/src/storage/stats.js`

### 2.6 更新存储模块导出

```javascript
// src/storage/index.js

// 导出所有存储模块
export * from './kv.js';
export * from './config.js';
export * from './default-domains.js';
export * from './history.js';
export * from './stats.js';
```

**文件**: `/workspace/src/storage/index.js`

---

## KV 结构总览

```
domain_list           → JSON: ["a.com", "b.com"]
default_domains       → JSON: ["cloudflare.com", "google.com"]
config                → JSON: {defaultRefreshInterval, rateLimit, historyRetention, defaultDomains, doh}
stats                 → JSON: {todayRequests, rateLimitHits, lastReset}

result:{domain}       → JSON: {domain, timestamp, https_rr, ech, ipv6}
history:{domain}      → JSON: [{result1}, {result2}, ...]
```

---

## 验收标准

1. ✅ `config.js` 新增常量定义正确
2. ✅ `config.js` 模块可正常读写配置
3. ✅ `default-domains.js` 模块可正常读写默认域名
4. ✅ `history.js` 模块可添加、查询、清理历史记录
5. ✅ `stats.js` 模块可统计请求数和限流次数
6. ✅ 所有模块导出到 `storage/index.js`
7. ✅ KV 结构符合设计文档

---

## 相关文件

- `src/config.js` - 常量配置
- `src/storage/config.js` - 配置管理
- `src/storage/default-domains.js` - 默认域名管理
- `src/storage/history.js` - 历史记录管理
- `src/storage/stats.js` - 统计数据管理
- `src/storage/index.js` - 统一导出

---

## 后续依赖

- 任务 5-11：所有管理 API 需要使用新存储
- 任务 11：定时检测任务需要使用历史记录清理功能
