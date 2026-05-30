// tests/unit/storage-stats.test.js

import assert from 'node:assert/strict';
import { runSuite } from '../test-runner.js';
import { createMockEnv } from '../support/test-helpers.js';
import { getStats, incrementRequests, recordRateLimitHit, updateStats, getDetailedStats } from '../../src/storage/stats.js';

/**
 * 统计存储模块单元测试
 */
export async function runStorageStatsTests() {
  // ========== Storage Stats - Initialize ==========
  await runSuite('Storage Stats - Initialize', async () => {
    const env = createMockEnv();
    const stats = await getStats(env);
    
    assert(stats.todayRequests === 0, 'Initial requests zero');
    assert(stats.rateLimitHits === 0, 'Initial rate limit hits zero');
    assert(typeof stats.lastReset === 'number', 'lastReset is timestamp');
  });

  // ========== Storage Stats - Increment Requests ==========
  await runSuite('Storage Stats - Increment Requests', async () => {
    const env = createMockEnv();
    
    await incrementRequests(env, 1);
    let stats = await getStats(env);
    assert(stats.todayRequests === 1, 'Requests incremented to 1');
    
    await incrementRequests(env, 5);
    stats = await getStats(env);
    assert(stats.todayRequests === 6, 'Requests incremented to 6');
  });

  // ========== Storage Stats - Record Rate Limit Hit ==========
  await runSuite('Storage Stats - Record Rate Limit Hit', async () => {
    const env = createMockEnv();
    
    await recordRateLimitHit(env);
    await recordRateLimitHit(env);
    await recordRateLimitHit(env);
    
    const stats = await getStats(env);
    assert(stats.rateLimitHits === 3, 'Rate limit hits recorded');
  });

  // ========== Storage Stats - Update Stats ==========
  await runSuite('Storage Stats - Update Stats', async () => {
    const env = createMockEnv();
    
    await incrementRequests(env, 10);
    const updated = await updateStats(env, { rateLimitHits: 5 });
    
    assert(updated.todayRequests === 10, 'Requests preserved');
    assert(updated.rateLimitHits === 5, 'Rate limit hits updated');
  });

  // ========== Storage Stats - Daily Reset ==========
  await runSuite('Storage Stats - Daily Reset', async () => {
    const env = createMockEnv();
    const kv = env.DOMAIN_MONITOR_KV;
    
    // 设置旧的 lastReset（昨天）
    const yesterday = Date.now() - (24 * 60 * 60 * 1000);
    await kv.put('stats', JSON.stringify({
      todayRequests: 100,
      rateLimitHits: 10,
      lastReset: yesterday
    }));
    
    // 再次获取应该触发重置
    const stats = await getStats(env);
    assert(stats.todayRequests === 0, 'Requests reset to 0');
    assert(stats.rateLimitHits === 0, 'Rate limit hits reset to 0');
    assert(stats.lastReset > yesterday, 'lastReset updated');
  });

  // ========== Storage Stats - No Reset Same Day ==========
  await runSuite('Storage Stats - No Reset Same Day', async () => {
    const env = createMockEnv();
    const kv = env.DOMAIN_MONITOR_KV;
    
    // 设置今天的 lastReset
    await kv.put('stats', JSON.stringify({
      todayRequests: 50,
      rateLimitHits: 5,
      lastReset: Date.now()
    }));
    
    // 再次获取不应该重置
    const stats = await getStats(env);
    assert(stats.todayRequests === 50, 'Requests not reset');
    assert(stats.rateLimitHits === 5, 'Rate limit hits not reset');
  });

  // ========== Storage Stats - Get Detailed Stats ==========
  await runSuite('Storage Stats - Get Detailed Stats', async () => {
    const env = createMockEnv();
    
    // Mock domain list
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify(['a.com', 'b.com']));
    await env.DOMAIN_MONITOR_KV.put('default_domains', JSON.stringify(['a.com']));
    await env.DOMAIN_MONITOR_KV.put('history:example.com', JSON.stringify([
      { domain: 'example.com', timestamp: Date.now(), overall: 'ok' },
      { domain: 'example.com', timestamp: Date.now() - 1000, overall: 'ok' }
    ]));
    await env.DOMAIN_MONITOR_KV.put('result:test.com', JSON.stringify({
      domain: 'test.com',
      overall: 'ok'
    }));
    
    const detailedStats = await getDetailedStats(env);
    
    assert(detailedStats.domains.total === 2, 'Total domains correct');
    assert(detailedStats.domains.defaultCount === 1, 'Default domains correct');
    assert(detailedStats.history.domainCount === 1, 'History domain count correct');
    assert(detailedStats.cache.resultCount === 1, 'Cache result count correct');
  });

  // ========== Storage Stats - Get Detailed Stats Empty ==========
  await runSuite('Storage Stats - Get Detailed Stats Empty', async () => {
    const env = createMockEnv();
    
    const detailedStats = await getDetailedStats(env);
    
    assert(detailedStats.domains.total === 0, 'Zero total domains');
    assert(detailedStats.domains.defaultCount === 0, 'Zero default domains');
    assert(detailedStats.history.domainCount === 0, 'Zero history domains');
    assert(detailedStats.cache.resultCount === 0, 'Zero cache results');
  });
}

export { runStorageStatsTests as runUnitTests };
