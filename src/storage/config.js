// src/storage/config.js

import { KV_KEY_CONFIG } from '../config.js';

const DEFAULT_CONFIG = {
  defaultRefreshInterval: 43200,  // 12 小时（秒）
  rateLimit: {
    windowMs: 60000,              // 60 秒
    maxRequests: 10               // 10 次/分钟
  },
  historyRetention: 7,            // 7 天
  historyMaxEntries: 100,         // 单域名历史记录最大条数
  defaultDomains: [],             // 默认域名列表（空则使用内置）
  doh: {
    primary: 'https://cloudflare-dns.com/dns-query',
    backup: 'https://dns.google/resolve'
  }
};

/**
 * 获取配置（读默认值如果不存在）
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<Object>} 配置对象
 */
export async function getConfig(env) {
  const kv = env.DOMAIN_MONITOR_KV;
  const data = await kv.get(KV_KEY_CONFIG);
  
  if (!data) {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  
  const config = JSON.parse(data);
  return {
    ...DEFAULT_CONFIG,
    ...config,
    rateLimit: { ...DEFAULT_CONFIG.rateLimit, ...config.rateLimit },
    doh: { ...DEFAULT_CONFIG.doh, ...config.doh }
  };
}

/**
 * 保存配置
 * @param {import('../types.js').Env} env - 环境变量
 * @param {Object} config - 配置对象
 */
export async function setConfig(env, config) {
  const kv = env.DOMAIN_MONITOR_KV;
  await kv.put(KV_KEY_CONFIG, JSON.stringify(config));
}
