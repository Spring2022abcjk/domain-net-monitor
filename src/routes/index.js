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
import { handleDomains } from './admin/domains.js';
import { getDohConfig, updateDohConfig, testDohEndpoint } from './admin/doh.js';
import { detectSingle, detectAll, detectDefault } from './admin/detect.js';
import { getHistoryRoute, deleteHistoryRoute, cleanupHistoryRoute } from './admin/history.js';

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
  // GET /api/admin/config
  else if (path === '/api/admin/config' && method === 'GET') {
    response = await withAdminAuth(handleConfig)(request, env);
  }
  // PUT /api/admin/config
  else if (path === '/api/admin/config' && method === 'PUT') {
    response = await withAdminAuth(handleConfig)(request, env);
  }
  // GET/POST/DELETE /api/admin/domains/*
  else if (path.startsWith('/api/admin/domains')) {
    response = await withAdminAuth(handleDomains)(request, env);
  }
  // GET /api/admin/doh
  else if (path === '/api/admin/doh' && method === 'GET') {
    response = await withAdminAuth(getDohConfig)(request, env);
  }
  // PUT /api/admin/doh
  else if (path === '/api/admin/doh' && method === 'PUT') {
    response = await withAdminAuth(updateDohConfig)(request, env);
  }
  // POST /api/admin/doh/test
  else if (path === '/api/admin/doh/test' && method === 'POST') {
    response = await withAdminAuth(testDohEndpoint)(request, env);
  }
  // POST /api/admin/detect/single
  else if (path === '/api/admin/detect/single' && method === 'POST') {
    response = await withAdminAuth(detectSingle)(request, env);
  }
  // POST /api/admin/detect/all
  else if (path === '/api/admin/detect/all' && method === 'POST') {
    response = await withAdminAuth(detectAll)(request, env);
  }
  // POST /api/admin/detect/default
  else if (path === '/api/admin/detect/default' && method === 'POST') {
    response = await withAdminAuth(detectDefault)(request, env);
  }
  // DELETE /api/admin/history/:domain
  else if (path.startsWith('/api/admin/history/') && method === 'DELETE') {
    const domain = path.replace('/api/admin/history/', '');
    response = await deleteHistoryRoute(request, env, domain);
  }
  // GET /api/admin/history
  else if (path === '/api/admin/history' && method === 'GET') {
    response = await withAdminAuth(getHistoryRoute)(request, env);
  }
  // DELETE /api/admin/history
  else if (path === '/api/admin/history' && method === 'DELETE') {
    response = await withAdminAuth(cleanupHistoryRoute)(request, env);
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
