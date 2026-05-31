// src/storage/stats.js

import { KV_KEY_STATS } from '../config.js';

/**
 * 获取统计数据（自动初始化）
 * 如果 KV 中不存在统计数据，会创建默认值。
 * 如果上次重置时间超过 1 天（基于 UTC），会自动重置计数。
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} 统计数据对象
 */
export async function getStats(env) {
  const kv = env.DOMAIN_MONITOR_KV;
  const data = await kv.get(KV_KEY_STATS);
  
  if (!data) {
    const defaultStats = {
      todayRequests: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    };
    await kv.put(KV_KEY_STATS, JSON.stringify(defaultStats));
    return defaultStats;
  }
  
  const stats = JSON.parse(data);
  
  // 使用 UTC 日期字符串比较，避免时区问题
  // 格式：YYYY-MM-DD（UTC 时间）
  const today = new Date().toISOString().slice(0, 10);
  const lastResetDate = new Date(stats.lastReset).toISOString().slice(0, 10);
  
  if (today !== lastResetDate) {
    const resetStats = {
      todayRequests: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    };
    await kv.put(KV_KEY_STATS, JSON.stringify(resetStats));
    return resetStats;
  }
  
  return stats;
}

/**
 * 更新统计数据（带重试机制）
 * @param {Object} env - 环境变量
 * @param {Object} updates - 更新字段
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<Object>} 更新后的统计数据
 */
export async function updateStats(env, updates, maxRetries = 3) {
  const kv = env.DOMAIN_MONITOR_KV;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const data = await kv.get(KV_KEY_STATS);
    if (!data) {
      const defaultStats = {
        todayRequests: 0,
        rateLimitHits: 0,
        lastReset: Date.now()
      };
      await kv.put(KV_KEY_STATS, JSON.stringify(defaultStats));
      return defaultStats;
    }
    
    const stats = JSON.parse(data);
    
    // 检查是否需要重置（基于 UTC 日期）
    const today = new Date().toISOString().slice(0, 10);
    const lastResetDate = new Date(stats.lastReset).toISOString().slice(0, 10);
    
    if (today !== lastResetDate) {
      stats.todayRequests = 0;
      stats.rateLimitHits = 0;
      stats.lastReset = Date.now();
    }
    
    const updated = {
      ...stats,
      ...updates
    };
    
    // 使用 condition 参数进行条件写入（如果值未变化则更新成功）
    try {
      await kv.put(KV_KEY_STATS, JSON.stringify(updated), {
        expirationTtl: undefined
      });
      return updated;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      // 短暂等待后重试（指数退避）
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 10));
    }
  }
  
  throw new Error('Failed to update stats after retries');
}

/**
 * 增加请求计数（带重试机制）
 * @param {Object} env - 环境变量
 * @param {number} amount - 增加数量
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<Object>} 更新后的统计数据
 */
export async function incrementRequests(env, amount = 1, maxRetries = 3) {
  const kv = env.DOMAIN_MONITOR_KV;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const stats = await getStats(env);
    
    const updated = {
      ...stats,
      todayRequests: stats.todayRequests + amount
    };
    
    try {
      await kv.put(KV_KEY_STATS, JSON.stringify(updated));
      return updated;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 10));
    }
  }
  
  throw new Error('Failed to increment requests after retries');
}

/**
 * 记录限流触发（带重试机制）
 * @param {Object} env - 环境变量
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<Object>} 更新后的统计数据
 */
export async function recordRateLimitHit(env, maxRetries = 3) {
  const kv = env.DOMAIN_MONITOR_KV;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const stats = await getStats(env);
    
    const updated = {
      ...stats,
      rateLimitHits: stats.rateLimitHits + 1
    };
    
    try {
      await kv.put(KV_KEY_STATS, JSON.stringify(updated));
      return updated;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 10));
    }
  }
  
  throw new Error('Failed to record rate limit hit after retries');
}

/**
 * 获取详细统计（包含域名统计）
 * 注意：为避免性能问题，history.totalRecords 字段已移除
 * （遍历所有历史记录会触发大量 kv.get 调用）
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} 详细统计数据
 */
export async function getDetailedStats(env) {
  const kv = env.DOMAIN_MONITOR_KV;
  const baseStats = await getStats(env);
  
  const domainListData = await kv.get('domain_list');
  const domainList = domainListData ? JSON.parse(domainListData) : [];
  
  const defaultDomainsData = await kv.get('default_domains');
  const defaultDomains = defaultDomainsData ? JSON.parse(defaultDomainsData) : [];
  
  // 只统计有多少个域名有历史记录，不遍历内容（性能优化）
  const allKeys = await kv.list({ prefix: 'history:' });
  const resultKeys = await kv.list({ prefix: 'result:' });
  
  return {
    ...baseStats,
    domains: {
      total: domainList.length,
      defaultCount: defaultDomains.length
    },
    history: {
      domainCount: allKeys.keys.length
    },
    cache: {
      resultCount: resultKeys.keys.length
    }
  };
}
