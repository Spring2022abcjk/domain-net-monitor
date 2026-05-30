// tests/integration/history.test.js

import assert from 'node:assert/strict';
import { runSuite } from '../test-runner.js';
import { createMockRequest, createMockEnv, assertEqual } from '../support/test-helpers.js';

/**
 * History API 集成测试
 */
export async function runHistoryTests() {
  // ========== GET /api/admin/history?domain=example.com - Success ==========
  await runSuite('GET /api/admin/history?domain=example.com - Success', async () => {
    const { getHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    await env.DOMAIN_MONITOR_KV.put('history:example.com', JSON.stringify([
      { domain: 'example.com', timestamp: Date.now(), overall: 'ok' },
      { domain: 'example.com', timestamp: Date.now() - 86400000, overall: 'ok' }
    ]));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history?domain=example.com&days=7&limit=50',
      'GET',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await getHistoryRoute(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.domain, 'example.com', 'Domain matches');
    assert(body.data.history, 'History exists');
    assertEqual(body.data.count, 2, 'Two records');
  });

  // ========== GET /api/admin/history?domain=example.com - No Token ==========
  await runSuite('GET /api/admin/history?domain=example.com - No Token', async () => {
    const { getHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history?domain=example.com',
      'GET',
      null,
      {}
    );

    const response = await getHistoryRoute(request, env);

    assertEqual(response.status, 401, 'Returns 401');
  });

  // ========== GET /api/admin/history?domain=invalid-domain - Invalid Domain ==========
  await runSuite('GET /api/admin/history?domain=-invalid - Invalid Domain', async () => {
    const { getHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history?domain=-invalid',
      'GET',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await getHistoryRoute(request, env);

    assertEqual(response.status, 400, 'Returns 400');
  });

  // ========== GET /api/admin/history - All Domains ==========
  await runSuite('GET /api/admin/history - All Domains', async () => {
    const { getHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify(['example.com', 'test.com']));
    await env.DOMAIN_MONITOR_KV.put('history:example.com', JSON.stringify([
      { domain: 'example.com', timestamp: Date.now(), overall: 'ok' }
    ]));
    await env.DOMAIN_MONITOR_KV.put('history:test.com', JSON.stringify([
      { domain: 'test.com', timestamp: Date.now(), overall: 'ok' }
    ]));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history',
      'GET',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await getHistoryRoute(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.totalDomains, 2, 'Two domains');
    assert(body.data.history, 'History exists');
    assertEqual(body.data.totalCount, 2, 'Total count matches');
    assertEqual(body.data.totalCount, 2, 'Total count matches');
  });

  // ========== GET /api/admin/history - Empty History ==========
  await runSuite('GET /api/admin/history - Empty History', async () => {
    const { getHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    await env.DOMAIN_MONITOR_KV.put('domain_list', JSON.stringify(['example.com']));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history',
      'GET',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await getHistoryRoute(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.totalCount, 0, 'Zero count');
  });

  // ========== DELETE /api/admin/history/:domain - Success ==========
  await runSuite('DELETE /api/admin/history/:domain - Success', async () => {
    const { deleteHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    await env.DOMAIN_MONITOR_KV.put('history:example.com', JSON.stringify([
      { domain: 'example.com', timestamp: Date.now(), overall: 'ok' }
    ]));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history/example.com',
      'DELETE',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await deleteHistoryRoute(request, env, 'example.com');
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.deleted, true, 'Deleted');
    
    const remaining = await env.DOMAIN_MONITOR_KV.get('history:example.com');
    assertEqual(remaining, null, 'History deleted from KV');
  });

  // ========== DELETE /api/admin/history/:domain - No Token ==========
  await runSuite('DELETE /api/admin/history/:domain - No Token', async () => {
    const { deleteHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history/example.com',
      'DELETE',
      null,
      {}
    );

    const response = await deleteHistoryRoute(request, env, 'example.com');

    assertEqual(response.status, 401, 'Returns 401');
  });

  // ========== DELETE /api/admin/history/:domain - Invalid Domain ==========
  await runSuite('DELETE /api/admin/history/:domain - Invalid Domain', async () => {
    const { deleteHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history/-invalid',
      'DELETE',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await deleteHistoryRoute(request, env, '-invalid');

    assertEqual(response.status, 400, 'Returns 400');
  });

  // ========== DELETE /api/admin/history/:domain - Non-existent ==========
  await runSuite('DELETE /api/admin/history/:domain - Non-existent', async () => {
    const { deleteHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history/nonexistent.com',
      'DELETE',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await deleteHistoryRoute(request, env, 'nonexistent.com');
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.deleted, true, 'Deleted flag set');
  });

  // ========== DELETE /api/admin/history - Cleanup ==========
  await runSuite('DELETE /api/admin/history - Cleanup', async () => {
    const { cleanupHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    await env.DOMAIN_MONITOR_KV.put('history:example.com', JSON.stringify([
      { domain: 'example.com', timestamp: Date.now(), overall: 'ok' },
      { domain: 'example.com', timestamp: Date.now() - (40 * 86400000), overall: 'fail' }
    ]));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history?retentionDays=30',
      'DELETE',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await cleanupHistoryRoute(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.recordsRemoved, 1, 'One old record removed');
    assertEqual(body.data.retentionDays, 30, 'Retention days matches');
  });

  // ========== DELETE /api/admin/history - Cleanup No Token ==========
  await runSuite('DELETE /api/admin/history - Cleanup No Token', async () => {
    const { cleanupHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history?retentionDays=30',
      'DELETE',
      null,
      {}
    );

    const response = await cleanupHistoryRoute(request, env);

    assertEqual(response.status, 401, 'Returns 401');
  });

  // ========== DELETE /api/admin/history - Cleanup Empty ==========
  await runSuite('DELETE /api/admin/history - Cleanup Empty', async () => {
    const { cleanupHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history',
      'DELETE',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await cleanupHistoryRoute(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.domainsWithHistory, 0, 'No domains');
    assertEqual(body.data.recordsRemoved, 0, 'No records removed');
  });

  // ========== GET /api/admin/history - Days Filter ==========
  await runSuite('GET /api/admin/history - Days Filter', async () => {
    const { getHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const tenDaysAgo = now - (10 * 86400000);
    
    await env.DOMAIN_MONITOR_KV.put('history:example.com', JSON.stringify([
      { domain: 'example.com', timestamp: now, overall: 'ok' },
      { domain: 'example.com', timestamp: oneDayAgo, overall: 'ok' },
      { domain: 'example.com', timestamp: tenDaysAgo, overall: 'fail' }
    ]));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history?domain=example.com&days=7',
      'GET',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await getHistoryRoute(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.count, 2, 'Two records within 7 days');
  });

  // ========== GET /api/admin/history - Limit ==========
  await runSuite('GET /api/admin/history - Limit', async () => {
    const { getHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    const history = [];
    for (let i = 0; i < 100; i++) {
      history.push({
        domain: 'example.com',
        timestamp: Date.now() - (i * 3600000),
        overall: 'ok'
      });
    }
    await env.DOMAIN_MONITOR_KV.put('history:example.com', JSON.stringify(history));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history?domain=example.com&limit=10',
      'GET',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await getHistoryRoute(request, env);
    const body = await response.json();

    assertEqual(response.status, 200, 'Returns 200');
    assertEqual(body.data.count, 10, 'Limited to 10 records');
    assertEqual(body.data.history.length, 10, 'History length matches');
  });

  // ========== GET /api/admin/history - KV Error Handling ==========
  await runSuite('GET /api/admin/history - KV Error', async () => {
    const { getHistoryRoute } = await import('../../src/routes/admin/history.js');
    const env = createMockEnv();
    
    // Mock KV that throws error
    env.DOMAIN_MONITOR_KV.get = async () => {
      throw new Error('KV operation failed');
    };
    
    await env.DOMAIN_MONITOR_KV.put('history:example.com', JSON.stringify([
      { domain: 'example.com', timestamp: Date.now(), overall: 'ok' }
    ]));
    
    const request = createMockRequest(
      'http://localhost:8787/api/admin/history?domain=example.com',
      'GET',
      null,
      { 'X-API-Token': 'test_secret_token_123' }
    );

    const response = await getHistoryRoute(request, env);
    const body = await response.json();

    assertEqual(response.status, 500, 'Returns 500 on error');
    assert(body.data === null, 'Data is null');
    assert(body.msg.includes('failed'), 'Error message contains failure info');
  });
}

export { runHistoryTests as runIntegrationTests };
