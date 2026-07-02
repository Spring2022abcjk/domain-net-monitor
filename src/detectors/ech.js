import { queryDoH } from '../doh/client.js'
import { DNS_TYPE_HTTPS, STATUS_OK, STATUS_NO, STATUS_ERROR } from '../config.js'

/**
 * ECH 能力检测
 * 注意：受限于 Worker 运行环境，仅检查 DNS 层面的 ECH 配置
 * @param {string} domain - 目标域名
 * @returns {Promise<Object>} - 检测结果对象
 */
export async function detectEch(domain) {
  try {
    const dohResponse = await queryDoH(domain, DNS_TYPE_HTTPS)

    if (!dohResponse || dohResponse.Status !== 0) {
      return {
        status: STATUS_ERROR,
        message: `DoH query failed`,
      }
    }

    if (!dohResponse.Answer || dohResponse.Answer.length === 0) {
      return {
        status: STATUS_NO,
        message: 'No HTTPS RR records found, ECH not supported',
      }
    }

    const hasEchConfig = dohResponse.Answer.some((record) => {
      if (record.type !== DNS_TYPE_HTTPS || !record.data) {
        return false
      }

      const dataStr = JSON.stringify(record).toLowerCase()
      return dataStr.includes('ech') || dataStr.includes('encrypted_client_hello')
    })

    if (hasEchConfig) {
      return {
        status: STATUS_OK,
        message: 'ECH configuration found in HTTPS RR record',
      }
    }

    return {
      status: STATUS_NO,
      message: 'No ECH configuration found in HTTPS RR record',
    }
  } catch (error) {
    return {
      status: STATUS_ERROR,
      message: `DoH query failed: ${error.message}`,
    }
  }
}
