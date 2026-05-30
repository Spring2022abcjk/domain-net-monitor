// tests/unit/storage-extensions.test.js

import { assert, assertEqual, runSuite } from '../test-runner.js';
import {
  getConfig,
  setConfig
} from '../../src/storage/config.js';
import {
  getDefaultDomains,
  setDefaultDomains
} from '../../src/storage/default-domains.js';
import {
  addHistory,
  getHistory,
  getAllHistory,
  cleanupHistory
} from '../../src/storage/history.js';
import {
  getStats,
  incrementStats,
  recordRateLimitHit
} from '../../src/storage/stats.js';

/**
 * 创建 Mock KV 存储
 * @returns {Object} Mock KV
 */
function createMockKV() {
  const store = {};
  return {
    async get(key) {
      return store[key] || null;
    },
    async put(key, value) {
      store[key] = value;
    },
    async delete(key) {
      delete store[key];
    },
    async list({ prefix }) {
      const keys = Object.keys(store)
        .filter(key => key.startsWith(prefix))
        .map(key => ({ name: key }));
      return { keys };
    },
    _getStore() {
      return store;
    }
  };
}

/**
 * 创建 Mock Env
 * @returns {import('../../src/types.js').Env}
 */
function createMockEnv() {
  return {
    DOMAIN_MONITOR_KV: createMockKV()
  };
}

/**
 * 运行配置存储测试
 */
async function runConfigStorageTests() {
  await runSuite('Config Storage - Default Config', async () => {
    const env = createMockEnv();
    const config = await getConfig(env);
    
    assertEqual(config.defaultRefreshInterval, 43200, 'Default refresh interval');
    assertEqual(config.rateLimit.windowMs, 60000, 'Default rate limit window');
    assertEqual(config.rateLimit.maxRequests, 10, 'Default rate limit max requests');
    assertEqual(config.historyRetention, 7, 'Default history retention');
    assert(config.defaultDomains.length === 0, 'Default domains empty array');
    assertEqual(config.doh.primary, 'https://cloudflare-dns.com/dns-query', 'Default primary DoH');
    assertEqual(config.doh.backup, 'https://dns.google/resolve', 'Default backup DoH');
  });
  
  await runSuite('Config Storage - Custom Config', async () => {
    const env = createMockEnv();
    const customConfig = {
      defaultRefreshInterval: 86400,
      rateLimit: {
        windowMs: 120000,
        maxRequests: 20
      },
      historyRetention: 14,
      defaultDomains: ['example.com', 'test.com'],
      doh: {
        primary: 'https://custom-doh.com',
        backup: 'https://backup-doh.com'
      }
    };
    
    await setConfig(env, customConfig);
    const retrieved = await getConfig(env);
    
    assertEqual(retrieved.defaultRefreshInterval, 86400, 'Custom refresh interval');
    assertEqual(retrieved.rateLimit.windowMs, 120000, 'Custom rate limit window');
    assertEqual(retrieved.rateLimit.maxRequests, 20, 'Custom rate limit max');
    assertEqual(retrieved.historyRetention, 14, 'Custom history retention');
    assertEqual(retrieved.defaultDomains.length, 2, 'Custom domains count');
    assertEqual(retrieved.doh.primary, 'https://custom-doh.com', 'Custom primary DoH');
  });
  
  await runSuite('Config Storage - Merge Behavior', async () => {
    const env = createMockEnv();
    const partialConfig = {
      defaultRefreshInterval: 7200
    };
    
    await setConfig(env, partialConfig);
    const merged = await getConfig(env);
    
    assertEqual(merged.defaultRefreshInterval, 7200, 'Partial config update');
    assertEqual(merged.rateLimit.windowMs, 60000, 'Unchanged fields preserved');
    assertEqual(merged.doh.backup, 'https://dns.google/resolve', 'Nested defaults preserved');
  });
}

/**
 * 运行默认域名存储测试
 */
async function runDefaultDomainsTests() {
  await runSuite('Default Domains - Empty', async () => {
    const env = createMockEnv();
    const domains = await getDefaultDomains(env);
    
    assert(Array.isArray(domains), 'Returns array');
    assertEqual(domains.length, 0, 'Empty domains returns empty array');
  });
  
  await runSuite('Default Domains - Set and Get', async () => {
    const env = createMockEnv();
    const testDomains = ['google.com', 'cloudflare.com', 'example.com'];
    
    await setDefaultDomains(env, testDomains);
    const retrieved = await getDefaultDomains(env);
    
    assertEqual(retrieved.length, 3, 'Domain count correct');
    assertEqual(retrieved[0], 'google.com', 'First domain correct');
    assertEqual(retrieved[1], 'cloudflare.com', 'Second domain correct');
    assertEqual(retrieved[2], 'example.com', 'Third domain correct');
  });
  
  await runSuite('Default Domains - Update', async () => {
    const env = createMockEnv();
    
    await setDefaultDomains(env, ['old.com']);
    await setDefaultDomains(env, ['new.com', 'updated.com']);
    const updated = await getDefaultDomains(env);
    
    assertEqual(updated.length, 2, 'Domain update count');
    assertEqual(updated[0], 'new.com', 'Domain update value');
  });
}

/**
 * 运行历史记录存储测试
 */
async function runHistoryStorageTests() {
  await runSuite('History Storage - Add Entry', async () => {
    const env = createMockEnv();
    const testResult = {
      domain: 'example.com',
      https_rr: true,
      ech: false,
      ipv6: true
    };
    
    await addHistory(env, 'example.com', testResult);
    const history = await getHistory(env, 'example.com');
    
    assertEqual(history.length, 1, 'History entry added');
    assertEqual(history[0].domain, 'example.com', 'Domain preserved');
    assertEqual(history[0].https_rr, true, 'Result data preserved');
    assert(typeof history[0].timestamp === 'number', 'Timestamp added');
  });
  
  await runSuite('History Storage - Multiple Entries', async () => {
    const env = createMockEnv();
    
    await addHistory(env, 'test.com', { domain: 'test.com', https_rr: true });
    await addHistory(env, 'test.com', { domain: 'test.com', https_rr: false });
    await addHistory(env, 'test.com', { domain: 'test.com', https_rr: true });
    
    const history = await getHistory(env, 'test.com');
    
    assertEqual(history.length, 3, 'Multiple entries added');
    assertEqual(history[0].https_rr, true, 'Newest first');
    assertEqual(history[1].https_rr, false, 'Second entry');
    assertEqual(history[2].https_rr, true, 'Third entry');
  });
  
  await runSuite('History Storage - Limit 100', async () => {
    const env = createMockEnv();
    
    for (let i = 0; i < 150; i++) {
      await addHistory(env, 'limit.com', { domain: 'limit.com', https_rr: i % 2 === 0, index: i });
    }
    
    const history = await getHistory(env, 'limit.com');
    
    assertEqual(history.length, 100, 'Limited to 100 entries');
    assertEqual(history[0].index, 149, 'Newest entry first');
  });
  
  await runSuite('History Storage - Filter by Days', async () => {
    const env = createMockEnv();
    const kv = env.DOMAIN_MONITOR_KV;
    const now = Date.now();
    
    const mockHistory = [
      { domain: 'old.com', https_rr: true, timestamp: now - (10 * 24 * 60 * 60 * 1000) },
      { domain: 'recent.com', https_rr: true, timestamp: now - (2 * 24 * 60 * 60 * 1000) },
      { domain: 'today.com', https_rr: true, timestamp: now - (1 * 60 * 60 * 1000) }
    ];
    
    await kv.put('history:filter.com', JSON.stringify(mockHistory));
    
    const history7days = await getHistory(env, 'filter.com', 7);
    assertEqual(history7days.length, 2, '7-day filter works');
    
    const history1day = await getHistory(env, 'filter.com', 1);
    assertEqual(history1day.length, 1, '1-day filter works');
  });
  
  await runSuite('History Storage - All Domains', async () => {
    const env = createMockEnv();
    
    await addHistory(env, 'domain1.com', { domain: 'domain1.com', https_rr: true });
    await addHistory(env, 'domain2.com', { domain: 'domain2.com', https_rr: false });
    
    const allHistory = await getAllHistory(env, ['domain1.com', 'domain2.com'], 7, 10);
    
    assert(allHistory['domain1.com'], 'Returns domain1.com history');
    assert(allHistory['domain2.com'], 'Returns domain2.com history');
    assertEqual(allHistory['domain1.com'][0].https_rr, true, 'Domain1 data correct');
    assertEqual(allHistory['domain2.com'][0].https_rr, false, 'Domain2 data correct');
  });
  
  await runSuite('History Storage - Cleanup', async () => {
    const env = createMockEnv();
    const kv = env.DOMAIN_MONITOR_KV;
    const now = Date.now();
    
    const mixedHistory = [
      { domain: 'keep.com', https_rr: true, timestamp: now - (5 * 24 * 60 * 60 * 1000) },
      { domain: 'remove.com', https_rr: false, timestamp: now - (50 * 24 * 60 * 60 * 1000) },
      { domain: 'keep.com', https_rr: true, timestamp: now - (1 * 24 * 60 * 60 * 1000) }
    ];
    
    await kv.put('history:cleanup.com', JSON.stringify(mixedHistory));
    await cleanupHistory(env, 30);
    
    const cleaned = await kv.get('history:cleanup.com');
    const parsed = JSON.parse(cleaned);
    
    assertEqual(parsed.length, 2, 'Old entries removed');
  });
}

/**
 * 运行统计数据存储测试
 */
async function runStatsStorageTests() {
  await runSuite('Stats Storage - Default Stats', async () => {
    const env = createMockEnv();
    const stats = await getStats(env);
    
    assertEqual(stats.todayRequests, 0, 'Default todayRequests');
    assertEqual(stats.rateLimitHits, 0, 'Default rateLimitHits');
    assert(typeof stats.lastReset === 'number', 'lastReset is timestamp');
  });
  
  await runSuite('Stats Storage - Increment', async () => {
    const env = createMockEnv();
    
    await incrementStats(env, 'todayRequests', 1);
    await incrementStats(env, 'todayRequests', 1);
    await incrementStats(env, 'todayRequests', 1);
    
    const stats = await getStats(env);
    
    assertEqual(stats.todayRequests, 3, 'Increment works');
  });
  
  await runSuite('Stats Storage - Rate Limit Hit', async () => {
    const env = createMockEnv();
    
    await recordRateLimitHit(env);
    await recordRateLimitHit(env);
    
    const stats = await getStats(env);
    
    assertEqual(stats.rateLimitHits, 2, 'Rate limit hits recorded');
  });
  
  await runSuite('Stats Storage - Daily Reset', async () => {
    const env = createMockEnv();
    const kv = env.DOMAIN_MONITOR_KV;
    
    const oldStats = {
      todayRequests: 100,
      rateLimitHits: 5,
      lastReset: Date.now() - (2 * 24 * 60 * 60 * 1000)
    };
    
    await kv.put('stats', JSON.stringify(oldStats));
    
    const resetStats = await getStats(env);
    
    assertEqual(resetStats.todayRequests, 0, 'Stats reset on new day');
    assertEqual(resetStats.rateLimitHits, 0, 'Rate limit hits reset');
  });
  
  await runSuite('Stats Storage - Same Day No Reset', async () => {
    const env = createMockEnv();
    
    await incrementStats(env, 'todayRequests', 5);
    const stats = await getStats(env);
    
    assertEqual(stats.todayRequests, 5, 'Stats preserved on same day');
  });
}

/**
 * 导出所有测试运行函数
 */
export async function runStorageExtensionsTests() {
  await runConfigStorageTests();
  await runDefaultDomainsTests();
  await runHistoryStorageTests();
  await runStatsStorageTests();
}
