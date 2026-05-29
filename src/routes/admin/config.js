// src/routes/admin/config.js

import { isValidAdminToken, createUnauthorizedResponse } from '../../middleware/auth.js';
import { getConfig, setConfig } from '../../storage/config.js';
import { jsonResponse } from '../../utils/helper.js';

/**
 * 处理配置相关请求
 * GET /api/admin/config/security - 查询安全配置
 * GET /api/admin/config - 获取完整配置
 * PUT /api/admin/config - 更新配置
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
  
  // GET /api/admin/config
  if (path === '/api/admin/config' && method === 'GET') {
    return handleGetConfig(request, env);
  }
  
  // PUT /api/admin/config
  if (path === '/api/admin/config' && method === 'PUT') {
    return handleUpdateConfig(request, env);
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

/**
 * 获取完整配置
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Promise<Response>} 响应
 */
async function handleGetConfig(request, env) {
  const config = await getConfig(env);
  
  return jsonResponse(config, 200);
}

/**
 * 更新配置
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Promise<Response>} 响应
 */
async function handleUpdateConfig(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error('Failed to parse request body:', error.message);
    return jsonResponse(null, 400, 'Invalid JSON format');
  }
  
  // 验证配置
  const errors = validateConfig(body);
  if (errors.length > 0) {
    return jsonResponse(null, 400, errors.join('; '));
  }
  
  // 部分更新：先获取现有配置，再合并
  const currentConfig = await getConfig(env);
  const newConfig = {
    ...currentConfig,
    ...body,
    rateLimit: {
      ...currentConfig.rateLimit,
      ...(body.rateLimit || {})
    },
    doh: {
      ...currentConfig.doh,
      ...(body.doh || {})
    }
  };
  
  await setConfig(env, newConfig);
  
  return jsonResponse({
    success: true,
    message: 'Config updated successfully',
    config: newConfig
  }, 200);
}

/**
 * 配置验证函数
 * @param {Object} config - 待验证的配置对象
 * @returns {string[]} 错误信息数组
 */
function validateConfig(config) {
  const errors = [];
  
  // defaultRefreshInterval: 正整数（秒）
  if (config.defaultRefreshInterval !== undefined) {
    if (typeof config.defaultRefreshInterval !== 'number' || config.defaultRefreshInterval <= 0) {
      errors.push('defaultRefreshInterval must be a positive number');
    }
  }
  
  // rateLimit.windowMs: 正整数（毫秒）
  if (config.rateLimit?.windowMs !== undefined) {
    if (typeof config.rateLimit.windowMs !== 'number' || config.rateLimit.windowMs <= 0) {
      errors.push('rateLimit.windowMs must be a positive number');
    }
  }
  
  // rateLimit.maxRequests: 正整数
  if (config.rateLimit?.maxRequests !== undefined) {
    if (typeof config.rateLimit.maxRequests !== 'number' || config.rateLimit.maxRequests <= 0 || !Number.isInteger(config.rateLimit.maxRequests)) {
      errors.push('rateLimit.maxRequests must be a positive integer');
    }
  }
  
  // historyRetention: 正整数（天）
  if (config.historyRetention !== undefined) {
    if (typeof config.historyRetention !== 'number' || config.historyRetention <= 0) {
      errors.push('historyRetention must be a positive number');
    }
  }
  
  // defaultDomains: 数组
  if (config.defaultDomains !== undefined) {
    if (!Array.isArray(config.defaultDomains)) {
      errors.push('defaultDomains must be an array');
    }
  }
  
  // doh.primary: URL 字符串
  if (config.doh?.primary !== undefined) {
    if (typeof config.doh.primary !== 'string' || !config.doh.primary.startsWith('http')) {
      errors.push('doh.primary must be a valid URL');
    }
  }
  
  // doh.backup: URL 字符串
  if (config.doh?.backup !== undefined) {
    if (typeof config.doh.backup !== 'string' || !config.doh.backup.startsWith('http')) {
      errors.push('doh.backup must be a valid URL');
    }
  }
  
  return errors;
}
