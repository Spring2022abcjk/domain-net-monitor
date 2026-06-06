/**
 * 公开域名列表 API
 * 无需认证即可访问
 */

import { jsonResponse } from '../../utils/helper.js'

/**
 * 获取所有域名列表（公开）
 * GET /api/public/domains
 */
export async function handleGetPublicDomains(request, env) {
  try {
    const domainList = await env.DOMAIN_MONITOR_KV.get('domain_list', { type: 'json' }) || []
    const domains = []
    for (const domain of domainList) {
      const stats = await env.DOMAIN_MONITOR_KV.get(`stats:${domain}`, { type: 'json' })
      domains.push({
        domain,
        firstSeen: stats?.firstSeen || null,
        lastChecked: stats?.lastChecked || null,
        status: stats?.status || 'unknown'
      })
    }
    
    return jsonResponse({
      domains,
      count: domains.length
    }, 200)
  } catch (error) {
    console.error('Error in handleGetPublicDomains:', error.message)
    return jsonResponse(null, 500, 'Internal server error')
  }
}
