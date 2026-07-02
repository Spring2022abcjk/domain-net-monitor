import { KV_KEY_DOMAIN_LIST, KV_KEY_RESULT_PREFIX } from '../config.js'

/**
 * 获取 KV 实例（通过环境变量注入）
 * @returns {KVNamespace} KV 实例
 */
function getKV(env) {
  if (!env || !env.DOMAIN_MONITOR_KV) {
    throw new Error('KV binding not found. Please ensure DOMAIN_MONITOR_KV is bound in wrangler.toml')
  }
  return env.DOMAIN_MONITOR_KV
}

/**
 * 读取域名列表
 * @param {Object} env - 环境变量对象
 * @returns {Promise<string[]>} 域名数组
 */
export async function getDomainList(env) {
  const kv = getKV(env)

  try {
    const data = await kv.get(KV_KEY_DOMAIN_LIST)

    if (!data) {
      return []
    }

    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to read domain list from KV:', error.message)
    throw error
  }
}

/**
 * 写入域名列表
 * @param {Object} env - 环境变量对象
 * @param {string[]} domains - 域名数组
 */
export async function setDomainList(env, domains) {
  const kv = getKV(env)

  try {
    await kv.put(KV_KEY_DOMAIN_LIST, JSON.stringify(domains))
  } catch (error) {
    console.error('Failed to write domain list to KV:', error.message)
    throw error
  }
}

/**
 * 追加单个域名
 * 注意：Cloudflare Worker KV 不支持原子操作，高并发场景下可能存在竞态条件
 * @param {Object} env - 环境变量对象
 * @param {string} domain - 单个域名
 * @returns {Promise<boolean>} true-成功追加，false-已存在
 */
export async function addDomain(env, domain) {
  const list = await getDomainList(env)

  if (list.includes(domain)) {
    return false
  }

  list.push(domain)
  await setDomainList(env, list)

  return true
}

/**
 * 删除单个域名
 * 注意：Cloudflare Worker KV 不支持原子操作，高并发场景下可能存在竞态条件
 * @param {Object} env - 环境变量对象
 * @param {string} domain - 单个域名
 * @returns {Promise<boolean>} true-成功删除，false-不存在
 */
export async function removeDomain(env, domain) {
  const list = await getDomainList(env)

  const index = list.indexOf(domain)
  if (index === -1) {
    return false
  }

  list.splice(index, 1)
  await setDomainList(env, list)

  return true
}

/**
 * 读取单域名检测结果
 * @param {Object} env - 环境变量对象
 * @param {string} domain - 域名
 * @returns {Promise<Object|null>} 检测结果对象或 null
 */
export async function getResult(env, domain) {
  const kv = getKV(env)

  try {
    const key = `${KV_KEY_RESULT_PREFIX}${domain}`
    const data = await kv.get(key)

    if (!data) {
      return null
    }

    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to read result from KV:', error.message)
    throw error
  }
}

/**
 * 写入单域名检测结果
 * @param {Object} env - 环境变量对象
 * @param {string} domain - 域名
 * @param {Object} result - 检测结果对象
 */
export async function setResult(env, domain, result) {
  const kv = getKV(env)

  try {
    const key = `${KV_KEY_RESULT_PREFIX}${domain}`
    await kv.put(key, JSON.stringify(result))
  } catch (error) {
    console.error('Failed to write result to KV:', error.message)
    throw error
  }
}

/**
 * 批量读取所有域名结果
 * @param {Object} env - 环境变量对象
 * @returns {Promise<Object[]>} 结果数组
 */
export async function getAllResults(env) {
  const list = await getDomainList(env)
  const results = []

  for (const domain of list) {
    try {
      const result = await getResult(env, domain)
      if (result) {
        results.push(result)
      }
    } catch (error) {
      console.error(`Failed to read result for ${domain}:`, error.message)
    }
  }

  return results
}
