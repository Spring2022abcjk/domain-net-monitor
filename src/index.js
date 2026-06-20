import { handleOptionsRequest, getCorsHeaders } from './utils/helper.js';
import { handleRequest } from './routes/index.js';
import { detectScheduled, cleanupScheduled } from './scheduled/detect.js';

// Cron pattern constants for task routing
const DETECT_CRON_PATTERNS = ['*/12', '0 0', '0 12'];
const CLEANUP_CRON_PATTERN = '0 3';

export default {
  /**
   * Worker 入口函数 - HTTP 请求处理
   * @param {Request} request - 请求对象
   * @param {import('./types.js').Env} env - 环境变量对象
   * @param {ExecutionContext} ctx - 执行上下文
   * @returns {Promise<Response>} 响应对象
   */
  async fetch(request, env, ctx) {
    const method = request.method;
    const corsHeaders = getCorsHeaders(request, env);

    if (method === 'OPTIONS') {
      return handleOptionsRequest(request, env);
    }

    try {
      const response = await handleRequest(request, env, corsHeaders, ctx);
      return response;
    } catch (error) {
      console.error('Unhandled error:', error);
      
      return new Response(JSON.stringify({
        code: 500,
        data: null,
        msg: `Internal Server Error: ${error.message}`
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  },
  
  /**
   * Worker 入口函数 - 定时任务处理
   * @param {ScheduledController} event - 定时任务控制器
   * @param {import('./types.js').Env} env - 环境变量对象
   * @param {ExecutionContext} ctx - 执行上下文
   * @returns {Promise<Response>} 响应对象
   */
  async scheduled(event, env, ctx) {
    const cronTime = event.cron;
    const scheduledTime = new Date().toISOString();
    const startTime = Date.now();
    
    console.log('[Scheduled] ====================================');
    console.log(`[Scheduled] Cron trigger: ${cronTime}`);
    console.log(`[Scheduled] Execution time: ${scheduledTime}`);
    console.log('[Scheduled] ====================================');
    
    // 每 12 小时执行检测（0 */12 * * *）
    const isDetectTask = DETECT_CRON_PATTERNS.some(pattern => cronTime.includes(pattern));
    if (isDetectTask) {
      console.log('[Scheduled] Task: Default domains detection');
      ctx.waitUntil(detectScheduled(env));
    }
    
    // 每天 3 点清理历史（0 3 * * *）
    if (cronTime.includes(CLEANUP_CRON_PATTERN)) {
      console.log('[Scheduled] Task: History cleanup');
      ctx.waitUntil(cleanupScheduled(env));
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Scheduled] Task initiated in ${duration}ms`);
    console.log('[Scheduled] ====================================');
    
    return new Response('Scheduled task started', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
