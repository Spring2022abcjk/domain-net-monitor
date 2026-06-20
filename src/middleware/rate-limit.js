// src/middleware/rate-limit.js

import { rateLimiterKV, rateLimitHeaders, rateLimitExceededResponse, RATE_LIMIT } from '../utils/helper.js';
import { isValidAdminToken } from './auth.js';
import { recordRateLimitHit } from '../storage/stats.js';

/**
 * 检查是否应该豁免限流（管理员 Token）
 * @param {Request} request - 请求对象
 * @param {import('../types.js').Env} env - 环境变量对象
 * @returns {boolean} 是否应该豁免
 */
export function shouldBypassRateLimit(request, env) {
  return isValidAdminToken(request, env);
}

/**
 * 限流中间件包装器
 * 管理员 Token 豁免限流，普通用户正常限流
 * 
 * @param {Function} handler - 处理函数
 * @returns {Function} 包装后的处理函数
 */
export function rateLimitMiddleware(handler) {
  return async (request, env) => {
    // 管理员 Token 豁免限流
    if (shouldBypassRateLimit(request, env)) {
      const response = await handler(request, env);
      // 安全地添加限流头（克隆 headers）
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-RateLimit-Limit', 'unlimited');
      newHeaders.set('X-RateLimit-Remaining', 'unlimited');
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });
    }
    
    // 普通用户走限流逻辑（KV 分布式，跨边缘节点生效）
    const { allowed, remaining } = await rateLimiterKV(env.DOMAIN_MONITOR_KV, request);
    
    if (!allowed) {
      await recordRateLimitHit(env);
      
      const response = rateLimitExceededResponse();
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-RateLimit-Limit', RATE_LIMIT.maxRequests.toString());
      newHeaders.set('X-RateLimit-Remaining', '0');
      newHeaders.set('X-RateLimit-Window', (RATE_LIMIT.windowMs / 1000).toString() + 's');
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });
    }
    
    // 正常处理请求
    const response = await handler(request, env);
    
    // 添加限流头（克隆 headers）
    const headers = rateLimitHeaders({ remaining });
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(headers)) {
      newHeaders.set(key, value);
    }
    
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });
  };
}
