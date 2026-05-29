// src/routes/admin/config.js

import { isValidAdminToken, createUnauthorizedResponse } from '../../middleware/auth.js';

/**
 * 处理配置相关请求
 * GET /api/admin/config/security - 查询安全配置
 * 
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Promise<Response>} 响应对象
 */
export async function handleConfig(request, env) {
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // GET /api/admin/config/security
  if (path === '/api/admin/config/security' && method === 'GET') {
    return handleSecurityConfig(request, env);
  }
  
  // 方法不允许
  return new Response(JSON.stringify({ code: 405, data: null, msg: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 查询安全配置
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
function handleSecurityConfig(request, env) {
  // 显式鉴权检查（防御性编程）
  if (!isValidAdminToken(request, env)) {
    return createUnauthorizedResponse();
  }
  
  // 读取 CORS 配置
  const allowedOriginsRaw = env.ALLOWED_ORIGINS || '*';
  const corsMode = allowedOriginsRaw === '*' ? 'wildcard' : 'whitelist';
  const allowedOrigins = corsMode === 'whitelist'
    ? allowedOriginsRaw.split(',').map(o => o.trim()).filter(o => o.length > 0)
    : [];
  
  // 读取限流配置
  const rateLimitConfig = {
    enabled: true,
    windowMs: 60000,          // 60 秒
    maxRequests: 10,          // 10 次/分钟
    adminBypass: true         // 管理员豁免
  };
  
  // Token 是否已配置
  const tokenConfigured = !!env.CLOUDFLARE_API_TOKEN;
  
  return new Response(JSON.stringify({
    corsMode,
    allowedOrigins,
    rateLimit: rateLimitConfig,
    tokenConfigured
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
