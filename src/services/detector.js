// src/services/detector.js

import {
  DNS_TYPE_HTTPS,
  DNS_TYPE_AAAA,
  STATUS_OK,
  STATUS_PARTIAL,
  STATUS_NO,
  STATUS_ERROR,
  KV_KEY_HISTORY_COUNT,
  KV_KEY_RESULT_COUNT,
  REQUEST_TIMEOUT,
} from '../config.js'
import { getConfig } from '../storage/config.js'
import { fetchWithTimeout } from '../utils/helper.js'

/**
 * 递增 KV 计数器（非原子操作，并发时可能略微低计）
 * 统计场景下可接受：计数器用于 stats 展示，不要求精确
 * @param {Object} kv - KV 命名空间
 * @param {string} key - 计数器键名
 */
async function incrementCount(kv, key) {
  const data = await kv.get(key)
  const count = data ? parseInt(data, 10) : 0
  await kv.put(key, String(count + 1))
}

/**
 * 查询 DoH 获取 DNS 记录
 * @param {string} domain - 域名
 * @param {number} recordType - DNS 记录类型 (HTTPS/AAAA)
 * @param {string} dohUrl - DoH 端点 URL
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Object>} DoH 响应 JSON
 */
export async function queryDoh(domain, recordType, dohUrl, timeout = REQUEST_TIMEOUT) {
  const url = `${dohUrl}?name=${encodeURIComponent(domain)}&type=${recordType}`

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        Accept: 'application/dns-json',
      },
    },
    timeout,
  )

  if (!response.ok) {
    throw new Error(`DoH response status: ${response.status}`)
  }

  return await response.json()
}

/**
 * 检测单个域名的各项指标
 * @param {string} domain - 域名
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<Object>} 检测结果
 */
export async function detectDomain(domain, env) {
  const config = await getConfig(env)
  const dohPrimary = config.doh.primary
  const dohBackup = config.doh.backup

  const result = {
    domain,
    timestamp: Date.now(),
    https_rr: { status: STATUS_NO, details: null },
    ech: { status: STATUS_NO, value: null },
    ipv6: { status: STATUS_NO, details: null },
  }

  // ========== 1. 检测 HTTPS RR（RFC 9460）==========
  try {
    const httpsData = await queryDoh(domain, DNS_TYPE_HTTPS, dohPrimary)
    if (httpsData.Answer && httpsData.Answer.length > 0) {
      result.https_rr = {
        status: STATUS_OK,
        details: httpsData.Answer,
      }

      // 检查 ECH（Encrypted Client Hello）
      const httpsRecord = httpsData.Answer[0].data
      if (httpsRecord && httpsRecord.includes('ech')) {
        result.ech = {
          status: STATUS_OK,
          value: true,
        }
      }
    }
  } catch (error) {
    console.error(`HTTPS RR query failed for ${domain}:`, error.message)
    result.https_rr = {
      status: STATUS_ERROR,
      error: error.message,
    }
  }

  // ========== 2. 检测 IPv6（AAAA 记录）==========
  try {
    const ipv6Data = await queryDoh(domain, DNS_TYPE_AAAA, dohPrimary)
    if (ipv6Data.Answer && ipv6Data.Answer.length > 0) {
      result.ipv6 = {
        status: STATUS_OK,
        count: ipv6Data.Answer.length,
      }
    }
  } catch (_error) {
    // 尝试备用 DoH
    try {
      const ipv6Data = await queryDoh(domain, DNS_TYPE_AAAA, dohBackup)
      if (ipv6Data.Answer && ipv6Data.Answer.length > 0) {
        result.ipv6 = {
          status: STATUS_OK,
          count: ipv6Data.Answer.length,
        }
      }
    } catch (backupError) {
      console.error(`IPv6 query failed for ${domain}:`, backupError.message)
      result.ipv6 = {
        status: STATUS_ERROR,
        error: backupError.message,
      }
    }
  }

  // ========== 3. 计算整体状态 ==========
  if (result.https_rr.status === STATUS_OK && result.ech.status === STATUS_OK && result.ipv6.status === STATUS_OK) {
    result.overall = STATUS_OK
  } else if (result.https_rr.status === STATUS_ERROR || result.ipv6.status === STATUS_ERROR) {
    result.overall = STATUS_ERROR
  } else if (result.https_rr.status === STATUS_OK) {
    result.overall = STATUS_PARTIAL
  } else {
    result.overall = STATUS_NO
  }

  return result
}

/**
 * 保存检测结果到 KV（最新结果）
 * @param {import('../types.js').Env} env - 环境变量
 * @param {Object} result - 检测结果
 */
export async function saveResult(env, result) {
  const kv = env.DOMAIN_MONITOR_KV
  const key = `result:${result.domain}`
  const exists = await kv.get(key)
  await kv.put(key, JSON.stringify(result))
  if (!exists) {
    await incrementCount(kv, KV_KEY_RESULT_COUNT)
  }
}

/**
 * 添加检测结果到历史
 * @param {import('../types.js').Env} env - 环境变量
 * @param {Object} result - 检测结果
 */
export async function addToHistory(env, result) {
  const kv = env.DOMAIN_MONITOR_KV
  const key = `history:${result.domain}`
  const config = await getConfig(env)
  const maxEntries = config.historyMaxEntries || 100

  const data = await kv.get(key)
  const history = data ? JSON.parse(data) : []

  history.unshift(result)

  // 限制保留条数（从配置读取，默认 100）
  if (history.length > maxEntries) {
    history.length = maxEntries
  }

  await kv.put(key, JSON.stringify(history))

  // 首次记录该域名历史时增加计数
  if (history.length === 1 && !data) {
    await incrementCount(kv, KV_KEY_HISTORY_COUNT)
  }
}
