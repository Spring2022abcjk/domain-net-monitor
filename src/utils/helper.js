import { REQUEST_TIMEOUT } from '../config.js';

// 限流配置
const RATE_LIMIT = {
  windowMs: 60000, // 1 分钟窗口
  maxRequests: 10  // 每个 IP 最多 10 次请求
};

/**
 * 内存存储（Worker 重启后重置）
 * @type {Map<string, {windowStart: number, count: number}>}
 */
const requestCounts = new Map();

/**
 * 简单的基于 IP 的限流器
 * 注意：Cloudflare Worker 无状态，限流数据存储在内存，重启后重置
 * @param {Request} request - 请求对象
 * @returns {import('../types.js').RateLimitResult} 限流结果
 */
export function rateLimiter(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rate:${ip}`;
  const now = Date.now();
  
  const record = requestCounts.get(key);
  
  if (!record || now - record.windowStart > RATE_LIMIT.windowMs) {
    // 新窗口
    requestCounts.set(key, {
      windowStart: now,
      count: 1
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT.maxRequests - 1
    };
  }
  
  if (record.count >= RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      remaining: 0
    };
  }
  
  record.count++;
  requestCounts.set(key, record);
  
  return {
    allowed: true,
    remaining: RATE_LIMIT.maxRequests - record.count
  };
}

/**
 * 构造限流响应头
 * @param {import('../types.js').RateLimitResult} rateLimitResult - 限流结果
 * @returns {import('../types.js').ExtraHeaders} 响应头对象
 */
export function rateLimitHeaders(rateLimitResult) {
  return {
    'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Window': (RATE_LIMIT.windowMs / 1000).toString() + 's'
  };
}

/**
 * 域名清洗函数
 * 移除协议前缀、端口号、URL 路径，返回纯域名
 * @param {string} domain - 原始域名输入
 * @returns {string|null} 清洗后的域名，非法输入返回 null
 */
export function cleanDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return null;
  }

  let result = domain.trim();

  if (result.length === 0) {
    return null;
  }

  result = result.replace(/^https?:\/\//i, '');
  result = result.replace(/\/.*$/, '');
  result = result.replace(/:\d+$/, '');

  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*$/;
  if (!domainRegex.test(result)) {
    return null;
  }

  return result.toLowerCase();
}

/**
 * 带超时的 fetch 封装
 * @param {string} url - 请求 URL
 * @param {RequestInit} [options] - fetch 选项
 * @param {number} [timeout] - 超时时间（毫秒），默认使用 REQUEST_TIMEOUT
 * @returns {Promise<Response>} fetch Response 对象
 * @throws {Error} 超时或网络错误时抛出异常
 */
export async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  options.signal = controller.signal;

  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 统一 JSON 响应构造
 * @param {*} data - 响应数据
 * @param {number} [status] - HTTP 状态码或业务状态码
 * @param {string} [message] - 描述信息
 * @param {import('../types.js').ExtraHeaders} [extraHeaders] - 额外的响应头
 * @returns {Response} JSON Response 对象
 */
export function jsonResponse(data, status = 200, message = 'success', extraHeaders = {}) {
  const body = {
    code: status,
    data: data,
    msg: message
  };

  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders
    }
  });
}

/**
 * 限流超限响应
 * @param {import('../types.js').ExtraHeaders} [extraHeaders] - 额外的响应头
 * @returns {Response} 429 Too Many Requests 响应
 */
export function rateLimitExceededResponse(extraHeaders = {}) {
  return new Response(JSON.stringify({
    code: 429,
    data: null,
    msg: 'Too many requests. Please try again later.'
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
      'Retry-After': '60'
    }
  });
}

/**
 * 动态生成 CORS 头
 * 从环境变量读取允许的来源
 * @param {Request} request - 请求对象
 * @param {import('../types.js').Env} env - 环境变量对象
 * @returns {import('../types.js').CorsHeaders} CORS 响应头对象
 */
export function getCorsHeaders(request, env) {
  const allowedOrigins = env.ALLOWED_ORIGINS || '*';
  const origin = request.headers.get('Origin') || '';
  
  if (allowedOrigins === '*') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Token',
      'Access-Control-Max-Age': '86400'
    };
  }
  
  const origins = allowedOrigins.split(',').map(o => o.trim());
  
  if (origins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Token',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
  }
  
  return {};
}

/**
 * OPTIONS 跨域预检处理
 * @param {Request} request - 请求对象
 * @param {import('../types.js').Env} env - 环境变量对象
 * @returns {Response} CORS 预检响应
 */
export function handleOptionsRequest(request, env) {
  const corsHeaders = getCorsHeaders(request, env);
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

/**
 * 域名格式验证
 * @param {string} domain - 域名
 * @returns {boolean} 是否有效
 */
export function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') return false
  // 基本域名格式验证
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/
  return domainRegex.test(domain)
}
