// tests/integration/scheduled.test.js

import { runSuite } from '../test-runner.js';
import { createMockEnv, assertEqual } from '../support/test-helpers.js';

/**
 * Scheduled Tasks API 集成测试
 */
export async function runFeatureTests() {
  // ========== detectScheduled 函数测试 ==========
  await runSuite('detectScheduled - No default domains', async () => {
    const { detectScheduled } = await import('../../src/scheduled/detect.js');
    const env = createMockEnv();
    
    // 不设置默认域名
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify([]));
    
    const result = await detectScheduled(env);
    
    assertEqual(result.success, true, 'Success is true');
    assertEqual(result.skipped, true, 'Skipped is true');
    assertEqual(result.reason, 'No default domains configured', 'Reason matches');
  });
  
  await runSuite('detectScheduled - Detect default domains', async () => {
    const { detectScheduled } = await import('../../src/scheduled/detect.js');
    const env = createMockEnv();
    
    // 设置默认域名
    await env.DOMAIN_MONITOR_KV.put('default_domains', JSON.stringify([
      'cloudflare.com',
      'google.com'
    ]));
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify([
      'cloudflare.com',
      'google.com'
    ]));
    
    const result = await detectScheduled(env);
    
    assertEqual(result.success, true, 'Success is true');
    assertEqual(result.skipped, false, 'Not skipped');
    assertEqual(result.total, 2, 'Total is 2');
    assertEqual(result.successCount, 2, 'Success count is 2');
    assertEqual(result.results.length, 2, 'Results length is 2');
    assertEqual(typeof result.timestamp, 'string', 'Timestamp is string');
    
    // 验证结果格式
    assertEqual(result.results[0].domain, 'cloudflare.com', 'First domain matches');
    assertEqual(typeof result.results[0].success, 'boolean', 'Success is boolean');
    assertEqual(typeof result.results[0].overall, 'string', 'Overall is string');
  });
  
  await runSuite('detectScheduled - Domain detection results format', async () => {
    const { detectScheduled } = await import('../../src/scheduled/detect.js');
    const env = createMockEnv();
    
    // 设置默认域名
    await env.DOMAIN_MONITOR_KV.put('default_domains', JSON.stringify([
      'cloudflare.com'
    ]));
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify([
      'cloudflare.com'
    ]));
    
    const result = await detectScheduled(env);
    
    // 验证成功检测的域名
    const successResult = result.results.find(r => r.overall !== 'error');
    assertEqual(successResult !== undefined, true, 'Found successful result');
    assertEqual(successResult.domain, 'cloudflare.com', 'Domain matches');
    assertEqual(successResult.success, true, 'Success is true');
    assertEqual(typeof successResult.httpsRR, 'string', 'HTTPS RR is string');
    assertEqual(typeof successResult.ech, 'boolean', 'ECH is boolean');
    assertEqual(typeof successResult.ipv6, 'boolean', 'IPv6 is boolean');
  });
  
  await runSuite('detectScheduled - Domain detection fails gracefully', async () => {
    const { detectScheduled } = await import('../../src/scheduled/detect.js');
    const env = createMockEnv();
    
    // 设置一个无效的默认域名
    await env.DOMAIN_MONITOR_KV.put('default_domains', JSON.stringify([
      'invalid-domain-that-does-not-exist-12345.com'
    ]));
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify([
      'invalid-domain-that-does-not-exist-12345.com'
    ]));
    
    const result = await detectScheduled(env);
    
    assertEqual(result.success, true, 'Overall success is true');
    assertEqual(result.skipped, false, 'Not skipped');
    assertEqual(result.total, 1, 'Total is 1');
    assertEqual(result.successCount, 0, 'Success count is 0');
    assertEqual(result.failedCount, 1, 'Failed count is 1');
    assertEqual(typeof result.timestamp, 'string', 'Timestamp is string');
  });
  
  await runSuite('detectScheduled - Updates statistics', async () => {
    const { detectScheduled } = await import('../../src/scheduled/detect.js');
    const env = createMockEnv();
    
    // 设置默认域名
    await env.DOMAIN_MONITOR_KV.put('default_domains', JSON.stringify([
      'cloudflare.com'
    ]));
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify([
      'cloudflare.com'
    ]));
    
    // 初始化统计
    await env.DOMAIN_MONITOR_KV.put('stats', JSON.stringify({
      todayRequests: 100,
      rateLimitHits: 5,
      lastReset: Date.now()
    }));
    
    const result = await detectScheduled(env);
    
    // 验证统计已更新
    const statsData = await env.DOMAIN_MONITOR_KV.get('stats');
    assertEqual(statsData !== null, true, 'Stats data exists');
    
    const stats = JSON.parse(statsData);
    assertEqual(stats.todayRequests > 100, true, 'Requests count increased');
  });
  
  // ========== cleanupScheduled 函数测试 ==========
  await runSuite('cleanupScheduled - Success with default retention', async () => {
    const { cleanupScheduled } = await import('../../src/scheduled/detect.js');
    const env = createMockEnv();
    
    // 不设置配置，使用默认 retention
    await env.DOMAIN_MONITOR_KV.put('config', JSON.stringify({}));
    
    const result = await cleanupScheduled(env);
    
    assertEqual(result.success, true, 'Success is true');
    assertEqual(result.retentionDays, 7, 'Default retention is 7 days');
    assertEqual(typeof result.domainsWithHistory, 'number', 'Domains count is number');
    assertEqual(typeof result.recordsRemoved, 'number', 'Records removed is number');
    assertEqual(typeof result.timestamp, 'string', 'Timestamp is string');
  });
  
  await runSuite('cleanupScheduled - Custom retention days', async () => {
    const { cleanupScheduled } = await import('../../src/scheduled/detect.js');
    const env = createMockEnv();
    
    // 设置自定义保留天数
    await env.DOMAIN_MONITOR_KV.put('config', JSON.stringify({
      historyRetention: 14
    }));
    
    const result = await cleanupScheduled(env);
    
    assertEqual(result.success, true, 'Success is true');
    assertEqual(result.retentionDays, 14, 'Custom retention is 14 days');
  });
  
  await runSuite('cleanupScheduled - Error handling', async () => {
    const { cleanupScheduled } = await import('../../src/scheduled/detect.js');
    const env = createMockEnv();
    
    const result = await cleanupScheduled(env);
    
    // 即使配置不存在，也应该成功（使用默认值）
    assertEqual(result.success, true, 'Success is true');
    assertEqual(typeof result.retentionDays, 'number', 'Retention days is number');
    assertEqual(typeof result.timestamp, 'string', 'Timestamp is string');
  });
  
  // ========== scheduled 入口函数测试 ==========
  await runSuite('scheduled - Detect task triggered by */12 cron', async () => {
    const worker = await import('../../src/index.js');
    const env = createMockEnv();
    
    // 设置默认域名
    await env.DOMAIN_MONITOR_KV.put('default_domains', JSON.stringify([
      'cloudflare.com'
    ]));
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify([
      'cloudflare.com'
    ]));
    
    // 模拟 cron 触发
    const mockEvent = {
      cron: '0 */12 * * *'
    };
    
    const mockCtx = {
      waitUntil: (promise) => promise
    };
    
    const response = await worker.default.scheduled(mockEvent, env, mockCtx);
    
    assertEqual(response.status, 200, 'Returns 200');
    
    const text = await response.text();
    assertEqual(text, 'Scheduled task started', 'Response text matches');
  });
  
  await runSuite('scheduled - Cleanup task triggered by 3am cron', async () => {
    const worker = await import('../../src/index.js');
    const env = createMockEnv();
    
    // 模拟 cron 触发
    const mockEvent = {
      cron: '0 3 * * *'
    };
    
    const mockCtx = {
      waitUntil: (promise) => promise
    };
    
    const response = await worker.default.scheduled(mockEvent, env, mockCtx);
    
    assertEqual(response.status, 200, 'Returns 200');
    
    const text = await response.text();
    assertEqual(text, 'Scheduled task started', 'Response text matches');
  });
  
  await runSuite('scheduled - Logging format', async () => {
    const worker = await import('../../src/index.js');
    const env = createMockEnv();
    
    const mockEvent = {
      cron: '0 */12 * * *'
    };
    
    const mockCtx = {
      waitUntil: (promise) => promise
    };
    
    // 这个测试主要是验证日志格式，通过目视检查控制台输出
    const response = await worker.default.scheduled(mockEvent, env, mockCtx);
    
    assertEqual(response.status, 200, 'Returns 200');
  });
}

export { runFeatureTests as runScheduledTests };
