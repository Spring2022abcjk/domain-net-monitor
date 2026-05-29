import { queryDoH } from '../doh/client.js';
import { DNS_TYPE_HTTPS, STATUS_OK, STATUS_NO, STATUS_ERROR } from '../config.js';

/**
 * HTTPS RR 记录检测（TYPE 65）
 * @param {string} domain - 目标域名
 * @returns {Promise<Object>} - 检测结果对象
 */
export async function detectHttpsRR(domain) {
  try {
    const dohResponse = await queryDoH(domain, DNS_TYPE_HTTPS);

    if (!dohResponse || dohResponse.Status !== 0) {
      return {
        status: STATUS_NO,
        message: 'No HTTPS RR records found or DNS query returned error'
      };
    }

    const hasHttpsRecord = dohResponse.Answer && 
      dohResponse.Answer.length > 0 && 
      dohResponse.Answer.some(record => record.type === DNS_TYPE_HTTPS);

    if (hasHttpsRecord) {
      return {
        status: STATUS_OK,
        message: 'HTTPS RR record found',
        records: dohResponse.Answer.filter(r => r.type === DNS_TYPE_HTTPS)
      };
    }

    return {
      status: STATUS_NO,
      message: 'No HTTPS RR records found'
    };
  } catch (error) {
    return {
      status: STATUS_ERROR,
      message: `DoH query failed: ${error.message}`
    };
  }
}
