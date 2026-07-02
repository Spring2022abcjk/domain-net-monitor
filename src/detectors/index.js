import { detectHttpsRR } from './https-rr.js'
import { detectEch } from './ech.js'
import { detectIpv6 } from './ipv6.js'

export { detectHttpsRR, detectEch, detectIpv6 }

/**
 * 单域名全量检测
 * 并行执行三大检测，提升检测速度
 * @param {string} domain - 目标域名（已清洗）
 * @returns {Promise<Object>} - 完整检测结果对象
 */
export async function detectAll(domain) {
  const timestamp = Date.now()

  const [httpsRR, ech, ipv6] = await Promise.all([detectHttpsRR(domain), detectEch(domain), detectIpv6(domain)])

  return {
    domain: domain,
    timestamp: timestamp,
    https_rr: httpsRR,
    ech: ech,
    ipv6: ipv6,
  }
}
