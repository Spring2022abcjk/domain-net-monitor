// src/storage/history.js

import { KV_KEY_HISTORY_PREFIX, KV_KEY_HISTORY_COUNT } from '../config.js';

/**
 * 追加单条历史记录
 * @deprecated 生产环境使用 services/detector.js 中的 addToHistory() 替代
 * @param {Object} env - 环境变量
 * @param {string} domain - 域名
 * @param {Object} record - 历史记录对象
 * @param {number} maxEntries - 最大保留条数
 * @returns {Promise<void>}
 */
export async function addHistory(env, domain, record, maxEntries = 100) {
  const kv = env.DOMAIN_MONITOR_KV;
  const key = `${KV_KEY_HISTORY_PREFIX}${domain}`;
  
  const data = await kv.get(key);
  const history = data ? JSON.parse(data) : [];
  
  const recordWithTimestamp = {
    ...record,
    domain,
    timestamp: Date.now()
  };
  
  history.unshift(recordWithTimestamp);
  
  if (history.length > maxEntries) {
    history.length = maxEntries;
  }
  
  await kv.put(key, JSON.stringify(history));
}

/**
 * 获取单域名历史记录
 * @param {Object} env - 环境变量
 * @param {string} domain - 域名
 * @param {number} days - 天数
 * @param {number} limit - 每域名返回条数
 * @returns {Promise<Array>} 历史记录数组
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
 * 获取多个域名的历史记录
 * @param {Object} env - 环境变量
 * @param {Array} domains - 域名列表
 * @param {number} days - 天数
 * @param {number} limit - 每域名返回条数
 * @returns {Promise<Object>} 域名 -> 历史记录映射
 */
async function getMultipleHistory(env, domains, days = 7, limit = 50) {
  const results = {};
  
  for (const domain of domains) {
    results[domain] = await getHistory(env, domain, days, limit);
  }
  
  return results;
}

/**
 * 获取所有域名的历史记录
 * @param {Object} env - 环境变量
 * @param {Array|null} domains - 域名列表（可选，不提供则自动获取所有有历史的域名）
 * @param {number} days - 天数
 * @param {number} limit - 每域名返回条数
 * @returns {Promise<Object>} 所有域名历史记录
 */
export async function getAllHistory(env, domains = null, days = 7, limit = 100) {
  const kv = env.DOMAIN_MONITOR_KV;
  
  if (domains && domains.length > 0) {
    // 获取指定域名的历史 - 复用 getMultipleHistory
    return getMultipleHistory(env, domains, days, limit);
  }
  
  // 自动获取所有有历史记录的域名
  const allKeys = await kv.list({ prefix: KV_KEY_HISTORY_PREFIX });
  const results = {};
  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  for (const key of allKeys.keys) {
    const data = await kv.get(key.name);
    if (data) {
      const history = JSON.parse(data);
      const domain = key.name.replace(KV_KEY_HISTORY_PREFIX, '');
      results[domain] = history.filter(item => item.timestamp >= cutoffTime).slice(0, limit);
    }
  }
  
  return results;
}

/**
 * 删除单域名历史记录
 * @param {Object} env - 环境变量
 * @param {string} domain - 域名
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteHistory(env, domain) {
  const kv = env.DOMAIN_MONITOR_KV;
  const key = `${KV_KEY_HISTORY_PREFIX}${domain}`;
  const exists = await kv.get(key);
  await kv.delete(key);
  if (exists) {
    const countData = await kv.get(KV_KEY_HISTORY_COUNT);
    const count = countData ? Math.max(0, parseInt(countData, 10) - 1) : 0;
    await kv.put(KV_KEY_HISTORY_COUNT, String(count));
  }
  return { domain, deleted: true };
}

/**
 * 清理过期历史记录
 * @param {Object} env - 环境变量
 * @param {number} retentionDays - 保留天数
 * @returns {Promise<Object>} 清理统计
 *   - domainsWithHistory: 有历史记录的域名数量（不是配置的域名总数）
 *   - recordsRemoved: 被删除的过期记录数量
 *   - retentionDays: 使用的保留天数
 */
export async function cleanupHistory(env, retentionDays = 30) {
  const kv = env.DOMAIN_MONITOR_KV;
  const allKeys = await kv.list({ prefix: KV_KEY_HISTORY_PREFIX });
  
  const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  let domainsWithHistory = 0;
  let recordsRemoved = 0;
  
  for (const key of allKeys.keys) {
    const data = await kv.get(key.name);
    if (!data) continue;
    
    const history = JSON.parse(data);
    const originalLength = history.length;
    const filtered = history.filter(item => item.timestamp >= cutoffTime);
    
    if (filtered.length !== originalLength) {
      await kv.put(key.name, JSON.stringify(filtered));
      recordsRemoved += (originalLength - filtered.length);
    }
    
    domainsWithHistory++;
  }
  
  return {
    domainsWithHistory,
    recordsRemoved,
    retentionDays
  };
}
