// src/routes/admin/detect.js

import { jsonResponse, cleanDomain } from '../../utils/helper.js';
import { isValidAdminToken } from '../../middleware/auth.js';
import { createUnauthorizedResponse } from '../../middleware/auth.js';
import { detectDomain, saveResult, addToHistory } from '../../services/detector.js';
import { getAllDomains } from '../../storage/domains.js';
import { getDefaultDomains } from '../../storage/default-domains.js';

/**
 * 单域名检测
 * POST /api/admin/detect/single
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function detectSingle(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse();
  }

  try {
    const body = await request.json();
    const domain = cleanDomain(body.domain);

    if (!domain) {
      return jsonResponse(null, 400, 'Invalid domain format');
    }

    const result = await detectDomain(domain, env);
    await saveResult(env, result);
    await addToHistory(env, result);

    return jsonResponse(result, 200, 'Detection completed');
  } catch (error) {
    console.error('Single detection failed:', error.message);
    return jsonResponse(null, 500, `Detection failed: ${error.message}`);
  }
}

/**
 * 批量检测所有域名
 * POST /api/admin/detect/all
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function detectAll(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse();
  }

  try {
    const domains = await getAllDomains(env);

    if (domains.length === 0) {
      return jsonResponse({
        total: 0,
        success: 0,
        failed: 0,
        results: []
      }, 200, 'No domains to detect');
    }

    // 并发检测（限制并发数为 5，避免 Worker 超时）
    const CONCURRENCY_LIMIT = 5;
    const results = [];
    let success = 0;
    let failed = 0;

    // 分批并发处理
    for (let i = 0; i < domains.length; i += CONCURRENCY_LIMIT) {
      const batch = domains.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.allSettled(
        batch.map(async (domain) => {
          try {
            const result = await detectDomain(domain, env);
            await saveResult(env, result);
            await addToHistory(env, result);
            return { success: true, result };
          } catch (error) {
            console.error(`Batch detection failed for ${domain}:`, error.message);
            return {
              success: false,
              result: {
                domain,
                error: error.message,
                timestamp: Date.now()
              }
            };
          }
        })
      );

      for (const settlement of batchResults) {
        if (settlement.status === 'fulfilled') {
          const { success: isSuccess, result } = settlement.value;
          results.push(result);
          if (isSuccess) {
            success++;
          } else {
            failed++;
          }
        }
      }
    }

    return jsonResponse({
      total: domains.length,
      success,
      failed,
      results
    }, 200, 'Batch detection completed');
  } catch (error) {
    console.error('Batch detection failed:', error.message);
    return jsonResponse(null, 500, `Batch detection failed: ${error.message}`);
  }
}

/**
 * 检测默认域名列表
 * POST /api/admin/detect/default
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function detectDefault(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse();
  }

  try {
    const domains = await getDefaultDomains(env);

    if (domains.length === 0) {
      return jsonResponse({
        total: 0,
        success: 0,
        failed: 0,
        results: []
      }, 200, 'No default domains configured');
    }

    const results = [];
    let success = 0;
    let failed = 0;

    for (const domain of domains) {
      try {
        const result = await detectDomain(domain, env);
        await saveResult(env, result);
        await addToHistory(env, result);
        results.push(result);
        success++;
      } catch (error) {
        console.error(`Default detection failed for ${domain}:`, error.message);
        results.push({
          domain,
          error: error.message,
          timestamp: Date.now()
        });
        failed++;
      }
    }

    return jsonResponse({
      total: domains.length,
      success,
      failed,
      results
    }, 200, 'Default domains detection completed');
  } catch (error) {
    console.error('Default detection failed:', error.message);
    return jsonResponse(null, 500, `Detection failed: ${error.message}`);
  }
}
