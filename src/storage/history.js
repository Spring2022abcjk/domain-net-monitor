// src/storage/history.js

import { KV_KEY_HISTORY_PREFIX } from '../config.js';

/**
 * 添加历史记录
 * @param {import('../types.js').Env} env - 环境变量
 * @param {string} domain - 域名
 * @param {Object} result - 检测结果
 */
export async function addHistory(env, domain, result) {
  const kv = env.DOMAIN_MONITOR_KV;
  const key = `${KV_KEY_HISTORY_PREFIX}${domain}`;
  
  const data = await kv.get(key);
  const history = data ? JSON.parse(data) : [];
  
  history.unshift({
    ...result,
    timestamp: Date.now()
  });
  
  if (history.length > 100) {
    history.length = 100;
  }
  
  await kv.put(key, JSON.stringify(history));
}

/**
 * 获取历史记录
 * @param {import('../types.js').Env} env - 环境变量
 * @param {string} domain - 域名
 * @param {number} days - 天数
 * @param {number} limit - 每域名返回条数
 * @returns {Promise<Object[]>} 历史记录列表
 */
export async function getHistory(env, domain, days = 7, limit = 100) {
  const kv = env.DOMAIN_MONITOR_KV;
  const key = `${KV_KEY_HISTORY_PREFIX}${domain}`;
  
  const data = await kv.get(key);
  if (!data) {
    return [];
  }
  
  const history = JSON.parse(data);
  
  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  const filtered = history.filter(item => item.timestamp >= cutoffTime);
  
  return filtered.slice(0, limit);
}

/**
 * 获取所有域名的历史记录
 * @param {import('../types.js').Env} env - 环境变量
 * @param {string[]} domainList - 域名列表
 * @param {number} days - 天数
 * @param {number} limit - 每域名返回条数
 * @returns {Promise<Object>} 历史记录对象
 */
export async function getAllHistory(env, domainList, days = 7, limit = 100) {
  const results = {};
  
  for (const domain of domainList) {
    results[domain] = await getHistory(env, domain, days, limit);
  }
  
  return results;
}

/**
 * 清理过期历史记录
 * @param {import('../types.js').Env} env - 环境变量
 * @param {string[]} domainList - 域名列表
 * @param {number} retentionDays - 保留天数
 */
export async function cleanupHistory(env, domainList, retentionDays = 30) {
  const kv = env.DOMAIN_MONITOR_KV;
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
