// src/routes/admin/auth.js

import { extractToken, isValidAdminToken } from '../../middleware/auth.js';
import { jsonResponse } from '../../utils/helper.js';

/**
 * 处理认证相关请求
 * POST /api/admin/auth/verify - 验证 Token
 * POST /api/admin/auth/logout - 注销登录
 * 
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Promise<Response>} 响应对象
 */
export async function handleAuth(request, env) {
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // POST /api/admin/auth/verify
  if (path === '/api/admin/auth/verify' && method === 'POST') {
    return handleVerify(request, env);
  }
  
  // POST /api/admin/auth/logout
  if (path === '/api/admin/auth/logout' && method === 'POST') {
    return handleLogout(request, env);
  }
  
  // 方法不允许
  return jsonResponse({ code: 405, data: null, msg: 'Method not allowed' }, 405);
}

/**
 * 验证 Token
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
function handleVerify(request, env) {
  const valid = isValidAdminToken(request, env);
  
  if (valid) {
    return new Response(JSON.stringify({
      valid: true,
      message: 'Token is valid'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    return new Response(JSON.stringify({
      code: 401,
      data: null,
      msg: 'Invalid or missing API Token'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 注销登录
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Response} 响应
 */
function handleLogout(request, env) {
  // 验证 Token 存在（但不要求有效，允许强制登出）
  const token = extractToken(request);
  if (!token) {
    return new Response(JSON.stringify({
      code: 401,
      data: null,
      msg: 'API Token required for logout'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 无状态登出，仅提示前端清除凭据
  return new Response(JSON.stringify({
    message: 'Logout successful. Please clear stored credentials on client side.'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
