import { queryDoH } from '../doh/client.js';
import { DNS_TYPE_AAAA, STATUS_OK, STATUS_NO, STATUS_ERROR } from '../config.js';

/**
 * IPv6 服务检测（AAAA 记录）
 * 注意：受限于 Worker 运行环境，仅检查 AAAA 记录存在性
 * @param {string} domain - 目标域名
 * @returns {Promise<Object>} - 检测结果对象
 */
export async function detectIpv6(domain) {
  try {
    const dohResponse = await queryDoH(domain, DNS_TYPE_AAAA);

    if (!dohResponse || dohResponse.Status !== 0) {
      return {
        status: STATUS_NO,
        message: 'No AAAA records found'
      };
    }

    const ipv6Addresses = [];
    if (dohResponse.Answer && dohResponse.Answer.length > 0) {
      for (const record of dohResponse.Answer) {
        if (record.type === DNS_TYPE_AAAA && record.data) {
          ipv6Addresses.push(record.data);
        }
      }
    }

    if (ipv6Addresses.length > 0) {
      return {
        status: STATUS_OK,
        message: 'AAAA records found',
        ipv6Addresses: ipv6Addresses
      };
    }

    return {
      status: STATUS_NO,
      message: 'No AAAA records found'
    };
  } catch (error) {
    return {
      status: STATUS_ERROR,
      message: `DoH query failed: ${error.message}`
    };
  }
}
