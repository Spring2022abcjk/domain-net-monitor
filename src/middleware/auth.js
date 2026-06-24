// src/middleware/auth.js

/**
 * 从请求头提取 API Token
 * @param {Request} request - 请求对象
 * @returns {string|null} Token 字符串
 */
export function extractToken(request) {
  return request.headers.get('X-API-Token');
}

/**
 * 检查 API Token 是否有效
 * @param {Request} request - 请求对象
 * @param {import('../types.js').Env} env - 环境变量对象
 * @returns {boolean} Token 是否有效
 */
export function isValidAdminToken(request, env) {
  const token = extractToken(request);
  
  if (!token) {
    return false;
  }
  
  // ADMIN_API_TOKEN 优先，CLOUDFLARE_API_TOKEN 向后兼容
  const expectedToken = env.ADMIN_API_TOKEN || env.CLOUDFLARE_API_TOKEN;
  if (!expectedToken) {
    console.warn('ADMIN_API_TOKEN not configured');
    return false;
  }
  
  // 恒定时间比较（防止时序攻击）
  const tokenBytes = new TextEncoder().encode(token);
  const expectedBytes = new TextEncoder().encode(expectedToken);
  
  if (tokenBytes.length !== expectedBytes.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < tokenBytes.length; i++) {
    result |= tokenBytes[i] ^ expectedBytes[i];
  }
  
  return result === 0;
}

/**
 * 创建 401 未授权响应
 * @returns {Response} 401 响应
 */
export function createUnauthorizedResponse() {
  return new Response(JSON.stringify({
    code: 401,
    data: null,
    msg: 'Invalid or missing API Token'
  }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 鉴权中间件包装器
 * @param {Function} handler - 处理函数
 * @returns {Function} 包装后的处理函数
 */
export function withAdminAuth(handler) {
  return async (request, env) => {
    if (!isValidAdminToken(request, env)) {
      return createUnauthorizedResponse();
    }
    
    return handler(request, env);
  };
}
