// src/routes/admin/doh.js

import { jsonResponse } from '../../utils/helper.js'
import { getConfig, setConfig } from '../../storage/config.js'
import { isValidAdminToken } from '../../middleware/auth.js'
import { createUnauthorizedResponse } from '../../middleware/auth.js'

/**
 * 获取 DoH 端点配置
 * GET /api/admin/doh
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function getDohConfig(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse()
  }

  const config = await getConfig(env)

  return jsonResponse(
    {
      primary: config.doh.primary,
      backup: config.doh.backup,
    },
    200,
  )
}

/**
 * 验证 DoH URL 格式
 * @param {string} url - 待验证的 URL
 * @returns {boolean} 是否有效
 */
function isValidDohUrl(url) {
  if (typeof url !== 'string') {
    return false
  }

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname.includes('.') && parsed.hostname.length > 0
  } catch {
    return false
  }
}

/**
 * 更新 DoH 端点配置
 * PUT /api/admin/doh
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function updateDohConfig(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse()
  }

  try {
    const body = await request.json()
    const updates = {}

    if (body.primary !== undefined) {
      if (isValidDohUrl(body.primary)) {
        updates.primary = body.primary
      } else {
        return jsonResponse(null, 400, 'Invalid primary DoH URL format')
      }
    }

    if (body.backup !== undefined) {
      if (isValidDohUrl(body.backup)) {
        updates.backup = body.backup
      } else {
        return jsonResponse(null, 400, 'Invalid backup DoH URL format')
      }
    }

    if (Object.keys(updates).length === 0) {
      return jsonResponse(null, 400, 'No valid fields to update')
    }

    const config = await getConfig(env)
    config.doh = { ...config.doh, ...updates }
    await setConfig(env, config)

    return jsonResponse(
      {
        primary: config.doh.primary,
        backup: config.doh.backup,
      },
      200,
      'DoH configuration updated successfully',
    )
  } catch (error) {
    console.error('Update DoH config failed:', error.message)
    return jsonResponse(null, 400, 'Invalid request body')
  }
}

/**
 * 测试 DoH 端点连通性
 * POST /api/admin/doh/test
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
export async function testDohEndpoint(request, env) {
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { url, timeout = 5000 } = body

    if (!url || !isValidDohUrl(url)) {
      return jsonResponse(null, 400, 'Invalid or missing URL parameter')
    }

    const startTime = Date.now()

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/dns-json',
        },
        signal: AbortSignal.timeout(timeout),
      })

      const latency = Date.now() - startTime

      if (response.ok) {
        return jsonResponse(
          {
            url,
            success: true,
            latency,
            status: response.status,
            message: 'DoH endpoint is reachable',
          },
          200,
        )
      } else {
        return jsonResponse(
          {
            url,
            success: false,
            latency,
            status: response.status,
            message: `HTTP ${response.status}`,
          },
          200,
        )
      }
    } catch (error) {
      const latency = Date.now() - startTime
      const message =
        error.name === 'TimeoutError' ? `Request timeout after ${timeout}ms` : error.message || 'Connection failed'

      return jsonResponse(
        {
          url,
          success: false,
          latency,
          status: null,
          message,
        },
        200,
      )
    }
  } catch (error) {
    console.error('Test DoH endpoint failed:', error.message)
    return jsonResponse(null, 400, 'Invalid request body')
  }
}
