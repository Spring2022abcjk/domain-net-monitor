/**
 * 公开域名统计 API
 * 无需认证即可访问
 */

import { jsonResponse } from '../../utils/helper.js'

/**
 * 获取单个域名的统计信息（公开）
 * GET /api/public/stats/:domain
 */
export async function handleGetPublicStats(request, env, domain) {
  try {
    // 域名格式验证
    if (!domain) {
      return jsonResponse(null, 400, 'Domain is required')
    }
    
    // 基本域名格式验证
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/
    if (!domainRegex.test(domain)) {
      return jsonResponse(null, 400, 'Invalid domain format')
    }
    
    const stats = await env.KV_DOMAIN_LIST.get(`stats:${domain}`, { type: 'json' })
    
    if (!stats) {
      return jsonResponse(null, 404, 'Domain not found')
    }
    
    const history = await env.KV_DOMAIN_LIST.get(`history:${domain}`, { type: 'json' }) || []
    const latestResults = history.slice(-10).reverse()
    
    return jsonResponse({
      domain,
      status: stats.status || 'unknown',
      firstSeen: stats.firstSeen || null,
      lastChecked: stats.lastChecked || null,
      totalChecks: stats.totalChecks || 0,
      successCount: stats.successCount || 0,
      failureCount: stats.failureCount || 0,
      successRate: stats.successRate || 0,
      latestResults
    }, 200)
  } catch (error) {
    console.error('Error in handleGetPublicStats:', error.message)
    return jsonResponse(null, 500, 'Internal server error')
  }
}
