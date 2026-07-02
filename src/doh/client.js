import { DOH_PRIMARY, DOH_BACKUP, DNS_TYPE_HTTPS, DNS_TYPE_AAAA } from '../config.js'
import { fetchWithTimeout } from '../utils/helper.js'

const DOH_ENDPOINTS = {
  [DNS_TYPE_HTTPS]: {
    primary: DOH_PRIMARY,
    backup: DOH_BACKUP,
  },
  [DNS_TYPE_AAAA]: {
    primary: DOH_PRIMARY,
    backup: DOH_BACKUP,
  },
}

/**
 * DoH 查询函数
 * @param {string} domain - 目标域名
 * @param {number} dnsType - DNS 记录类型（65 或 28）
 * @returns {Promise<Object>} - DoH JSON 响应对象
 * @throws {Error} - 双节点均失败时抛出错误
 */
export async function queryDoH(domain, dnsType) {
  const endpoints = DOH_ENDPOINTS[dnsType]

  if (!endpoints) {
    throw new Error(`Unsupported DNS type: ${dnsType}`)
  }

  const dohUrl = `${endpoints.primary}?name=${encodeURIComponent(domain)}&type=${dnsType}`

  try {
    const response = await fetchWithTimeout(dohUrl, {
      headers: {
        Accept: 'application/dns-json',
      },
    })

    if (!response.ok) {
      throw new Error(`DoH primary endpoint returned ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (primaryError) {
    console.warn(`Primary DoH endpoint failed: ${primaryError.message}, switching to backup`)

    const backupUrl = `${endpoints.backup}?name=${encodeURIComponent(domain)}&type=${dnsType}`

    try {
      const response = await fetchWithTimeout(backupUrl, {
        headers: {
          Accept: 'application/dns-json',
        },
      })

      if (!response.ok) {
        // eslint-disable-next-line preserve-caught-error -- HTTP status check, not a re-throw of caught error
        throw new Error(`DoH backup endpoint returned ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (backupError) {
      throw new Error(`Both DoH endpoints failed: ${primaryError.message}, ${backupError.message}`, {
        cause: backupError,
      })
    }
  }
}
