// src/routes/admin/stats.js

import { jsonResponse } from '../../utils/helper.js'
import { isValidAdminToken, createUnauthorizedResponse } from '../../middleware/auth.js'
import { getDetailedStats } from '../../storage/stats.js'
import { getConfig } from '../../storage/config.js'

/**
 * 获取统计数据
 * GET /api/admin/stats
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function getStatsRoute(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse()
  }

  try {
    const detailedStats = await getDetailedStats(env)
    const config = await getConfig(env)

    // 计算今日成功率
    const totalDetections = (detailedStats.todaySuccessCount || 0) + (detailedStats.todayFailCount || 0)
    const successRate = totalDetections > 0
      ? ((detailedStats.todaySuccessCount / totalDetections) * 100).toFixed(2) + '%'
      : '0%'

    // 计算系统运行时长
    const uptimeMs = Date.now() - (config.deployTime || Date.now())
    const uptimeSeconds = Math.floor(uptimeMs / 1000)

    const stats = {
      overview: {
        totalDomains: detailedStats.domains.total,
        defaultDomains: detailedStats.domains.defaultCount,
        historyDomains: detailedStats.history.domainCount,
        cachedResults: detailedStats.cache.resultCount,
      },
      today: {
        requests: detailedStats.todayRequests,
        rateLimitHits: detailedStats.rateLimitHits,
        rateLimitRate:
          detailedStats.todayRequests > 0
            ? ((detailedStats.rateLimitHits / detailedStats.todayRequests) * 100).toFixed(2) + '%'
            : '0%',
      },
      detection: {
        successCount: detailedStats.todaySuccessCount || 0,
        failCount: detailedStats.todayFailCount || 0,
        successRate,
      },
      config: {
        refreshInterval: config.defaultRefreshInterval,
        refreshIntervalHuman: formatDuration(config.defaultRefreshInterval),
        historyRetention: config.historyRetention,
        rateLimit: {
          windowMs: config.rateLimit.windowMs,
          maxRequests: config.rateLimit.maxRequests,
        },
      },
      lastReset: new Date(detailedStats.lastReset).toISOString(),
      uptime: uptimeMs,
      uptimeHuman: formatDuration(uptimeSeconds),
    }

    return jsonResponse(stats)
  } catch (error) {
    console.error('Stats route failed:', error.message)
    return jsonResponse(null, 500, `Operation failed: ${error.message}`)
  }
}

/**
 * 格式化时长（秒转人类可读）
 * @param {number} seconds - 秒数
 * @returns {string} 人类可读格式
 */
function formatDuration(seconds) {
  if (typeof seconds !== 'number' || seconds < 0 || !isFinite(seconds)) {
    return 'Invalid duration'
  }
  if (seconds >= 86400) {
    return `${(seconds / 86400).toFixed(1)} days`
  } else if (seconds >= 3600) {
    return `${(seconds / 3600).toFixed(1)} hours`
  } else if (seconds >= 60) {
    return `${(seconds / 60).toFixed(1)} minutes`
  } else {
    return `${seconds} seconds`
  }
}
