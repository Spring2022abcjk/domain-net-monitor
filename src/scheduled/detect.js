// src/scheduled/detect.js

import { detectDomain, saveResult, addToHistory } from '../services/detector.js'
import { getDefaultDomains } from '../storage/default-domains.js'
import { cleanupHistory } from '../storage/history.js'
import { getConfig } from '../storage/config.js'
import { incrementRequests, recordDetectionResult } from '../storage/stats.js'

/**
 * 定时检测默认域名
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<Object>} 检测结果
 */
export async function detectScheduled(env) {
  console.log('[Scheduled] Starting default domains detection...')
  console.log('[Scheduled] Trigger time:', new Date().toISOString())

  const defaultDomains = await getDefaultDomains(env)

  if (defaultDomains.length === 0) {
    console.log('[Scheduled] No default domains configured, skipping.')
    return {
      success: true,
      skipped: true,
      reason: 'No default domains configured',
    }
  }

  const results = []
  let success = 0
  let failed = 0

  for (const domain of defaultDomains) {
    try {
      console.log(`[Scheduled] Detecting ${domain}...`)

      const result = await detectDomain(domain, env)
      await saveResult(env, result)
      await addToHistory(env, result)

      // 统计：记录成功检测
      await incrementRequests(env)

      // 根据 overall 判断是否成功（ok 或 partial 都算成功）
      const isSuccess = result.overall === 'ok' || result.overall === 'partial'
      await recordDetectionResult(env, isSuccess)

      results.push({
        domain,
        success: isSuccess,
        overall: result.overall,
        httpsRR: result.https_rr?.status || 'error',
        ech: result.ech?.status === 'ok',
        ipv6: result.ipv6?.status === 'ok',
      })

      if (isSuccess) {
        success++
        console.log(`[Scheduled] ✓ ${domain}: ${result.overall}`)
      } else {
        failed++
        console.log(`[Scheduled] ✗ ${domain}: ${result.overall}`)
      }
    } catch (error) {
      console.error(`[Scheduled] ✗ Failed to detect ${domain}:`, error.message)

      results.push({
        domain,
        success: false,
        error: error.message,
        overall: 'error',
      })

      failed++
    }
  }

  console.log(`[Scheduled] Detection completed: ${success} success, ${failed} failed`)
  console.log('[Scheduled] ====================================')

  return {
    success: true,
    skipped: false,
    total: defaultDomains.length,
    successCount: success,
    failedCount: failed,
    results,
    timestamp: new Date().toISOString(),
  }
}

/**
 * 定时清理历史记录
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<Object>} 清理结果
 */
export async function cleanupScheduled(env) {
  console.log('[Scheduled] Starting history cleanup...')
  console.log('[Scheduled] Trigger time:', new Date().toISOString())

  try {
    const config = await getConfig(env)
    const retentionDays = config.historyRetention || 7

    console.log(`[Scheduled] Retention days: ${retentionDays}`)

    const result = await cleanupHistory(env, retentionDays)

    console.log(`[Scheduled] Cleanup completed: ${result.recordsRemoved} records removed`)
    console.log(`[Scheduled] Domains processed: ${result.domainsWithHistory}`)
    console.log('[Scheduled] ====================================')

    return {
      success: true,
      retentionDays: result.retentionDays,
      domainsWithHistory: result.domainsWithHistory,
      recordsRemoved: result.recordsRemoved,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[Scheduled] Cleanup failed:', error.message)
    console.error('[Scheduled] ====================================')

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }
}
