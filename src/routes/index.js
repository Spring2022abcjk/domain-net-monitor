import {
  handleGetDomains,
  handleUpdateDomains,
  handleAddDomain,
  handleDeleteDomain
} from './domains.js';

import {
  handleDetectAll,
  handleDetectSingle
} from './detect.js';

import {
  handleResultAll,
  handleResultSingle
} from './result.js';

import { handleAuth } from './admin/auth.js';
import { handleConfig } from './admin/config.js';

import { withAdminAuth } from '../middleware/auth.js';
import { rateLimiter, rateLimitHeaders, rateLimitExceededResponse, jsonResponse } from '../utils/helper.js';

/**
 * 路由分发处理函数
 * @param {Request} request - 请求对象
 * @param {import('../types.js').Env} env - 环境变量对象
 * @param {import('../types.js').CorsHeaders} corsHeaders - CORS 响应头
 * @returns {Promise<Response>} 响应对象
 */
export async function handleRequest(request, env, corsHeaders = {}) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // 限流检查
  const rateLimitResult = rateLimiter(request);
  const limitHeaders = rateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    const response = rateLimitExceededResponse();
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(limitHeaders)) {
      headers.set(key, value);
    }
    for (const [key, value] of Object.entries(corsHeaders)) {
      headers.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      headers
    });
  }

  let response;

  // === Admin Routes (需要鉴权) ===
  
  // POST /api/admin/auth/verify
  if (path === '/api/admin/auth/verify' && method === 'POST') {
    response = await withAdminAuth(handleAuth)(request, env);
  }
  // POST /api/admin/auth/logout
  else if (path === '/api/admin/auth/logout' && method === 'POST') {
    response = await handleAuth(request, env);
  }
  // GET /api/admin/config/security
  else if (path === '/api/admin/config/security' && method === 'GET') {
    response = await withAdminAuth(handleConfig)(request, env);
  }
  
  // === Public Routes (限流) ===

  // GET /api/domains
  if (path === '/api/domains' && method === 'GET') {
    response = await handleGetDomains(request, env);
  }
  // POST /api/domains
  else if (path === '/api/domains' && method === 'POST') {
    response = await handleUpdateDomains(request, env);
  }
  // POST /api/domains/add
  else if (path === '/api/domains/add' && method === 'POST') {
    response = await handleAddDomain(request, env);
  }
  // POST /api/domains/delete
  else if (path === '/api/domains/delete' && method === 'POST') {
    response = await handleDeleteDomain(request, env);
  }
  // GET/POST /api/detect/all
  else if (path === '/api/detect/all' && (method === 'GET' || method === 'POST')) {
    response = await handleDetectAll(request, env);
  }
  // POST /api/detect/single
  else if (path === '/api/detect/single' && method === 'POST') {
    response = await handleDetectSingle(request, env);
  }
  // GET /api/result/all
  else if (path === '/api/result/all' && method === 'GET') {
    response = await handleResultAll(request, env);
  }
  // POST /api/result/single
  else if (path === '/api/result/single' && method === 'POST') {
    response = await handleResultSingle(request, env);
  }
  // 404
  else {
    response = jsonResponse(null, 404, 'Route not found');
  }

  // 添加限流响应头和 CORS 头
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(limitHeaders)) {
    headers.set(key, value);
  }
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    headers
  });
}
