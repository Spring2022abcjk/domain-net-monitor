// src/storage/stats.js

import { KV_KEY_STATS } from '../config.js';

/**
 * 初始化或获取统计数据
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<Object>} 统计数据对象
 */
export async function getStats(env) {
  const kv = env.DOMAIN_MONITOR_KV;
  const data = await kv.get(KV_KEY_STATS);
  
  if (!data) {
    return {
      todayRequests: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    };
  }
  
  const stats = JSON.parse(data);
  
  const today = new Date().toDateString();
  const lastResetDate = new Date(stats.lastReset).toDateString();
  
  if (today !== lastResetDate) {
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
 * @param {import('../types.js').Env} env - 环境变量
 * @param {string} field - 字段名
 * @param {number} amount - 增量
 */
export async function incrementStats(env, field = 'todayRequests', amount = 1) {
  const kv = env.DOMAIN_MONITOR_KV;
  const stats = await getStats(env);
  
  stats[field] = (stats[field] || 0) + amount;
  
  await kv.put(KV_KEY_STATS, JSON.stringify(stats));
}

/**
 * 记录限流触发
 * @param {import('../types.js').Env} env - 环境变量
 */
export async function recordRateLimitHit(env) {
  return incrementStats(env, 'rateLimitHits', 1);
}
