import { handleAuth } from './admin/auth.js'
import { handleConfig } from './admin/config.js'
import { handleDomains } from './admin/domains.js'
import { getDohConfig, updateDohConfig, testDohEndpoint } from './admin/doh.js'
import { detectSingle, detectAll, detectDefault } from './admin/detect.js'
import { getHistoryRoute, deleteHistoryRoute, cleanupHistoryRoute } from './admin/history.js'
import { getStatsRoute } from './admin/stats.js'

import { handleGetPublicDomains } from './public/domains.js'
import { handleGetPublicStats } from './public/stats.js'

import { withAdminAuth, isValidAdminToken } from '../middleware/auth.js'
import { rateLimiterKV, rateLimitHeaders, rateLimitExceededResponse, jsonResponse } from '../utils/helper.js'
import { incrementRequests, recordRateLimitHit } from '../storage/stats.js'

/**
 * 路由分发处理函数
 * @param {Request} request - 请求对象
 * @param {import('../types.js').Env} env - 环境变量对象
 * @param {import('../types.js').CorsHeaders} corsHeaders - CORS 响应头
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} 响应对象
 */
export async function handleRequest(request, env, corsHeaders = {}, _ctx) {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  // 限流检查（KV 分布式，管理员 Token 豁免）
  let limitHeaders = {}
  if (!isValidAdminToken(request, env)) {
    const rateLimitResult = await rateLimiterKV(env.DOMAIN_MONITOR_KV, request)
    limitHeaders = rateLimitHeaders(rateLimitResult)

    if (!rateLimitResult.allowed) {
      await recordRateLimitHit(env)

      const response = rateLimitExceededResponse()
      const headers = new Headers(response.headers)
      for (const [key, value] of Object.entries(limitHeaders)) {
        headers.set(key, value)
      }
      for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value)
      }
      return new Response(response.body, {
        status: response.status,
        headers,
      })
    }
  }

  // 记录请求数
  await incrementRequests(env)

  let response

  // === Health Check Route ===

  // GET /health
  if (path === '/health' && method === 'GET') {
    const responseData = new Response(
      JSON.stringify({
        code: 200,
        data: { status: 'ok', timestamp: new Date().toISOString() },
        msg: 'OK',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    )

    return responseData
  }

  // === Admin Routes (需要鉴权) ===

  // POST /api/admin/auth/verify
  if (path === '/api/admin/auth/verify' && method === 'POST') {
    response = await withAdminAuth(handleAuth)(request, env)
  }
  // POST /api/admin/auth/logout
  else if (path === '/api/admin/auth/logout' && method === 'POST') {
    response = await handleAuth(request, env)
  }
  // GET /api/admin/config/security
  else if (path === '/api/admin/config/security' && method === 'GET') {
    response = await withAdminAuth(handleConfig)(request, env)
  }
  // GET /api/admin/config
  else if (path === '/api/admin/config' && method === 'GET') {
    response = await withAdminAuth(handleConfig)(request, env)
  }
  // PUT /api/admin/config
  else if (path === '/api/admin/config' && method === 'PUT') {
    response = await withAdminAuth(handleConfig)(request, env)
  }
  // GET/POST/DELETE /api/admin/domains/*
  else if (path.startsWith('/api/admin/domains')) {
    response = await withAdminAuth(handleDomains)(request, env)
  }
  // GET /api/admin/doh
  else if (path === '/api/admin/doh' && method === 'GET') {
    response = await withAdminAuth(getDohConfig)(request, env)
  }
  // PUT /api/admin/doh
  else if (path === '/api/admin/doh' && method === 'PUT') {
    response = await withAdminAuth(updateDohConfig)(request, env)
  }
  // POST /api/admin/doh/test
  else if (path === '/api/admin/doh/test' && method === 'POST') {
    response = await withAdminAuth(testDohEndpoint)(request, env)
  }
  // POST /api/admin/detect/single
  else if (path === '/api/admin/detect/single' && method === 'POST') {
    response = await withAdminAuth(detectSingle)(request, env)
  }
  // POST /api/admin/detect/all
  else if (path === '/api/admin/detect/all' && method === 'POST') {
    response = await withAdminAuth(detectAll)(request, env)
  }
  // POST /api/admin/detect/default
  else if (path === '/api/admin/detect/default' && method === 'POST') {
    response = await withAdminAuth(detectDefault)(request, env)
  }
  // DELETE /api/admin/history/:domain
  else if (path.startsWith('/api/admin/history/') && method === 'DELETE') {
    const domain = path.replace('/api/admin/history/', '')
    response = await withAdminAuth(deleteHistoryRoute)(request, env, domain)
  }
  // GET /api/admin/history
  else if (path === '/api/admin/history' && method === 'GET') {
    response = await withAdminAuth(getHistoryRoute)(request, env)
  }
  // DELETE /api/admin/history
  else if (path === '/api/admin/history' && method === 'DELETE') {
    response = await withAdminAuth(cleanupHistoryRoute)(request, env)
  }
  // GET /api/admin/stats
  else if (path === '/api/admin/stats' && method === 'GET') {
    response = await withAdminAuth(getStatsRoute)(request, env)
  }

  // === Public Routes (限流) ===
  // GET /api/public/domains
  else if (path === '/api/public/domains' && method === 'GET') {
    response = await handleGetPublicDomains(request, env)
  }
  // GET /api/public/stats/:domain
  else if (path.startsWith('/api/public/stats/') && method === 'GET') {
    const domain = path.replace('/api/public/stats/', '')
    response = await handleGetPublicStats(request, env, decodeURIComponent(domain))
  }
  // 404
  else {
    response = jsonResponse(null, 404, 'Route not found')
  }

  // 添加限流响应头和 CORS 头
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(limitHeaders)) {
    headers.set(key, value)
  }
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value)
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  })
}
