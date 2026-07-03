// src/routes/admin/history.js

import { jsonResponse, cleanDomain } from '../../utils/helper.js'
import { isValidAdminToken, createUnauthorizedResponse } from '../../middleware/auth.js'
import { getHistory, getAllHistory, deleteHistory, cleanupHistory } from '../../storage/history.js'

/**
 * 查询历史记录
 * GET /api/admin/history
 * 查询参数：
 *   - domain: 域名（可选，不提供则返回所有域名汇总）
 *   - days: 天数（可选，默认 7）
 *   - limit: 每域名条数（可选，默认 50）
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function getHistoryRoute(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse()
  }

  try {
    const url = new URL(request.url)
    const domain = url.searchParams.get('domain')
    const days = parseInt(url.searchParams.get('days')) || 7
    const limit = parseInt(url.searchParams.get('limit')) || 50

    if (domain) {
      // 查询单域名历史
      const clean = cleanDomain(domain)
      if (!clean) {
        return jsonResponse(null, 400, 'Invalid domain format')
      }

      const history = await getHistory(env, clean, days, limit)

      return jsonResponse({
        domain: clean,
        days,
        limit,
        count: history.length,
        history,
      })
    } else {
      // 查询所有域名汇总 - 简化：直接使用 getAllHistory
      const history = await getAllHistory(env, null, days, limit)

      let totalCount = 0
      for (const h of Object.values(history)) {
        totalCount += h.length
      }

      // 转换为前端期望的 domains 数组格式
      const domains = Object.entries(history).map(([domain, records]) => ({
        domain,
        history: records,
      }))

      return jsonResponse({
        days,
        limit,
        totalDomains: Object.keys(history).length,
        totalCount,
        history,
        domains,
      })
    }
  } catch (error) {
    console.error('History query failed:', error.message)
    return jsonResponse(null, 500, `Operation failed: ${error.message}`)
  }
}

/**
 * 删除单域名历史
 * DELETE /api/admin/history/:domain
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @param {string} domain - 域名
 * @returns {Response} 响应
 */
export async function deleteHistoryRoute(request, env, domain) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse()
  }

  try {
    const clean = cleanDomain(domain)

    if (!clean) {
      return jsonResponse(null, 400, 'Invalid domain format')
    }

    const result = await deleteHistory(env, clean)

    return jsonResponse(result, 200, 'History deleted successfully')
  } catch (error) {
    console.error('History delete failed:', error.message)
    return jsonResponse(null, 500, `Operation failed: ${error.message}`)
  }
}

/**
 * 清理过期记录
 * DELETE /api/admin/history
 * 查询参数：
 *   - retentionDays: 保留天数（可选，默认 30）
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function cleanupHistoryRoute(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse()
  }

  try {
    const url = new URL(request.url)
    const retentionDays = parseInt(url.searchParams.get('retentionDays')) || 30

    const result = await cleanupHistory(env, retentionDays)

    return jsonResponse(result, 200, 'Cleanup completed successfully')
  } catch (error) {
    console.error('History cleanup failed:', error.message)
    return jsonResponse(null, 500, `Operation failed: ${error.message}`)
  }
}
