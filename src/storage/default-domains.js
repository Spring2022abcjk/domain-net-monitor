// src/storage/default-domains.js

import { KV_KEY_DEFAULT_DOMAINS } from '../config.js';

/**
 * 获取默认展示域名列表
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<string[]>} 域名列表
 */
export async function getDefaultDomains(env) {
  const kv = env.DOMAIN_MONITOR_KV;
  const data = await kv.get(KV_KEY_DEFAULT_DOMAINS);
  
  if (!data) {
    return [];
  }
  
  return JSON.parse(data);
}

/**
 * 设置默认展示域名列表
 * @param {import('../types.js').Env} env - 环境变量
 * @param {string[]} domains - 域名列表
 */
export async function setDefaultDomains(env, domains) {
  const kv = env.DOMAIN_MONITOR_KV;
  await kv.put(KV_KEY_DEFAULT_DOMAINS, JSON.stringify(domains));
}
