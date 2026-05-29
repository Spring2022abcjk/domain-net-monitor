import { handleOptionsRequest, getCorsHeaders } from './utils/helper.js';
import { handleRequest } from './routes/index.js';

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
      const response = await handleRequest(request, env, corsHeaders);
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
    console.log(`[Scheduled] Triggered at ${new Date().toISOString()}, cron: ${cronTime}`);
    
    // 每 12 小时执行检测（0 */12 * * *）
    if (cronTime.includes('*/12') || cronTime.includes('0 0') || cronTime.includes('0 12')) {
      const { detectScheduled } = await import('./scheduled/detect.js');
      ctx.waitUntil(detectScheduled(env));
    }
    
    // 每天 3 点清理历史（0 3 * * *）
    if (cronTime.includes('0 3')) {
      const { cleanupScheduled } = await import('./scheduled/detect.js');
      ctx.waitUntil(cleanupScheduled(env));
    }
    
    return new Response('Scheduled task started');
  }
};
