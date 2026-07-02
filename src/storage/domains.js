// src/storage/domains.js

import { getDomainList, setDomainList } from './kv.js'

/**
 * 获取所有域名（从 KV 读取）
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<string[]>} 域名数组
 */
export async function getAllDomains(env) {
  return await getDomainList(env)
}

/**
 * 添加域名到列表
 * @param {import('../types.js').Env} env - 环境变量
 * @param {string} domain - 域名
 */
export async function addDomain(env, domain) {
  const domains = await getDomainList(env)

  if (!domains.includes(domain)) {
    domains.push(domain)
    await setDomainList(env, domains)
  }

  return domains
}

/**
 * 从列表删除域名
 * @param {import('../types.js').Env} env - 环境变量
 * @param {string} domain - 域名
 */
export async function removeDomain(env, domain) {
  const domains = await getDomainList(env)
  const filtered = domains.filter((d) => d !== domain)
  await setDomainList(env, filtered)
  return filtered
}
