// tests/integration/config.test.js

import { assert, assertEqual, runSuite } from '../test-runner.js';
import { handleConfig } from '../../src/routes/admin/config.js';
import { isValidAdminToken } from '../../src/middleware/auth.js';

/**
 * 创建 Mock KV 存储
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
    }
  };
}

/**
 * 创建 Mock Env
 */
function createMockEnv(overrides = {}) {
  return {
    DOMAIN_MONITOR_KV: createMockKV(),
    CLOUDFLARE_API_TOKEN: 'test_secret_token_123',
    ALLOWED_ORIGINS: '*',
    ...overrides
  };
}

/**
 * 创建 Mock Request
 */
function createMockRequest(url, method = 'GET', body = null, headers = {}) {
  const options = {
    method,
    headers
  };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers['Content-Type'] = 'application/json';
  }
  return new Request(url, options);
}

// ============================================================
// GET /api/admin/config Tests
// ============================================================

async function runGetConfigTests() {
  await runSuite('GET /api/admin/config - Default Config', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'GET', null, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 200, 'Status is 200');
    
    const body = await response.json();
    assertEqual(body.data.defaultRefreshInterval, 43200, 'Default refresh interval');
    assertEqual(body.data.rateLimit.windowMs, 60000, 'Default windowMs');
    assertEqual(body.data.rateLimit.maxRequests, 10, 'Default maxRequests');
    assertEqual(body.data.historyRetention, 7, 'Default retention');
    assert(Array.isArray(body.data.defaultDomains), 'Default domains is array');
    assert(body.data.doh.primary.startsWith('http'), 'DoH primary is URL');
    assert(body.data.doh.backup.startsWith('http'), 'DoH backup is URL');
  });
  
  await runSuite('GET /api/admin/config - Saved Config', async () => {
    const env = createMockEnv();
    const kv = env.DOMAIN_MONITOR_KV;
    await kv.put('config', JSON.stringify({
      defaultRefreshInterval: 86400,
      rateLimit: {
        windowMs: 120000,
        maxRequests: 20
      },
      historyRetention: 14
    }));
    
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'GET', null, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    const body = await response.json();
    
    assertEqual(body.data.defaultRefreshInterval, 86400, 'Custom refresh interval');
    assertEqual(body.data.rateLimit.windowMs, 120000, 'Custom windowMs');
    assertEqual(body.data.rateLimit.maxRequests, 20, 'Custom maxRequests');
    assertEqual(body.data.historyRetention, 14, 'Custom retention');
  });
  
  await runSuite('GET /api/admin/config - No Token', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'GET');
    
    const valid = isValidAdminToken(request, env);
    assert(valid === false, 'No token returns false');
  });
}

// ============================================================
// PUT /api/admin/config - Full Update Tests
// ============================================================

async function runFullUpdateTests() {
  await runSuite('PUT /api/admin/config - Full Update', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      defaultRefreshInterval: 86400,
      rateLimit: {
        windowMs: 120000,
        maxRequests: 20
      },
      historyRetention: 14,
      defaultDomains: ['cloudflare.com', 'google.com'],
      doh: {
        primary: 'https://new-doh.com',
        backup: 'https://backup-doh.com'
      }
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 200, 'Status is 200');
    
    const body = await response.json();
    assert(body.data.success === true, 'Success is true');
    assertEqual(body.data.config.defaultRefreshInterval, 86400, 'Updated refresh interval');
    assertEqual(body.data.config.rateLimit.windowMs, 120000, 'Updated windowMs');
    assertEqual(body.data.config.rateLimit.maxRequests, 20, 'Updated maxRequests');
    
    // Verify persistence
    const savedData = await env.DOMAIN_MONITOR_KV.get('config');
    const saved = JSON.parse(savedData);
    assertEqual(saved.defaultRefreshInterval, 86400, 'Saved refresh interval');
  });
  
  await runSuite('PUT /api/admin/config - Returns Full Config', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      defaultRefreshInterval: 7200
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    const body = await response.json();
    
    assert(body.data.config !== undefined, 'Returns full config');
    assert(body.data.config.rateLimit !== undefined, 'Includes rateLimit');
    assert(body.data.config.doh !== undefined, 'Includes doh');
  });
  
  await runSuite('PUT /api/admin/config - No Token', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      defaultRefreshInterval: 7200
    });
    
    const valid = isValidAdminToken(request, env);
    assert(valid === false, 'No token returns false');
  });
}

// ============================================================
// PUT /api/admin/config - Partial Update Tests
// ============================================================

async function runPartialUpdateTests() {
  await runSuite('PUT /api/admin/config - Partial Update (refreshInterval only)', async () => {
    const env = createMockEnv();
    // Set initial config
    await env.DOMAIN_MONITOR_KV.put('config', JSON.stringify({
      defaultRefreshInterval: 43200,
      rateLimit: { windowMs: 60000, maxRequests: 10 },
      historyRetention: 7
    }));
    
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      defaultRefreshInterval: 7200
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 200, 'Status is 200');
    
    const body = await response.json();
    assertEqual(body.data.config.defaultRefreshInterval, 7200, 'Updated refresh interval');
    assertEqual(body.data.config.rateLimit.windowMs, 60000, 'Unchanged windowMs');
    assertEqual(body.data.config.historyRetention, 7, 'Unchanged retention');
  });
  
  await runSuite('PUT /api/admin/config - Partial Update (rateLimit only)', async () => {
    const env = createMockEnv();
    await env.DOMAIN_MONITOR_KV.put('config', JSON.stringify({
      defaultRefreshInterval: 43200,
      rateLimit: { windowMs: 60000, maxRequests: 10 },
      historyRetention: 7
    }));
    
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      rateLimit: { windowMs: 120000, maxRequests: 20 }
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    const body = await response.json();
    
    assertEqual(body.data.config.defaultRefreshInterval, 43200, 'Unchanged refresh interval');
    assertEqual(body.data.config.rateLimit.windowMs, 120000, 'Updated windowMs');
    assertEqual(body.data.config.rateLimit.maxRequests, 20, 'Updated maxRequests');
  });
  
  await runSuite('PUT /api/admin/config - Partial Update (doh only)', async () => {
    const env = createMockEnv();
    await env.DOMAIN_MONITOR_KV.put('config', JSON.stringify({
      defaultRefreshInterval: 43200,
      rateLimit: { windowMs: 60000, maxRequests: 10 },
      historyRetention: 7,
      doh: {
        primary: 'https://old-doh.com',
        backup: 'https://old-backup.com'
      }
    }));
    
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      doh: { primary: 'https://new-doh.com' }
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    const body = await response.json();
    
    assertEqual(body.data.config.doh.primary, 'https://new-doh.com', 'Updated primary');
    assertEqual(body.data.config.doh.backup, 'https://old-backup.com', 'Unchanged backup');
  });
}

// ============================================================
// PUT /api/admin/config - Validation Error Tests
// ============================================================

async function runValidationErrorTests() {
  await runSuite('PUT /api/admin/config - Invalid refreshInterval (negative)', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      defaultRefreshInterval: -1
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 400, 'Status is 400');
    
    const body = await response.json();
    assert(body.msg.includes('defaultRefreshInterval'), 'Error mentions field');
  });
  
  await runSuite('PUT /api/admin/config - Invalid windowMs (zero)', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      rateLimit: { windowMs: 0, maxRequests: 10 }
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 400, 'Status is 400');
    
    const body = await response.json();
    assert(body.msg.includes('rateLimit.windowMs'), 'Error mentions field');
  });
  
  await runSuite('PUT /api/admin/config - Invalid maxRequests (non-integer)', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      rateLimit: { windowMs: 60000, maxRequests: 10.5 }
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 400, 'Status is 400');
    
    const body = await response.json();
    assert(body.msg.includes('rateLimit.maxRequests'), 'Error mentions field');
  });
  
  await runSuite('PUT /api/admin/config - Invalid historyRetention (negative)', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      historyRetention: -7
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 400, 'Status is 400');
    
    const body = await response.json();
    assert(body.msg.includes('historyRetention'), 'Error mentions field');
  });
  
  await runSuite('PUT /api/admin/config - Invalid defaultDomains (not array)', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      defaultDomains: 'cloudflare.com'
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 400, 'Status is 400');
    
    const body = await response.json();
    assert(body.msg.includes('defaultDomains'), 'Error mentions field');
  });
  
  await runSuite('PUT /api/admin/config - Invalid doh.primary (not URL)', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      doh: { primary: 'not-a-url' }
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 400, 'Status is 400');
    
    const body = await response.json();
    assert(body.msg.includes('doh.primary'), 'Error mentions field');
  });
  
  await runSuite('PUT /api/admin/config - Invalid doh.backup (not URL)', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      doh: { primary: 'https://valid.com', backup: 'invalid' }
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 400, 'Status is 400');
    
    const body = await response.json();
    assert(body.msg.includes('doh.backup'), 'Error mentions field');
  });
}

// ============================================================
// Edge Cases Tests
// ============================================================

async function runConfigEdgeCasesTests() {
  await runSuite('Edge Cases - Minimum refreshInterval (1 second)', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      defaultRefreshInterval: 1
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 200, 'Status is 200');
    
    const body = await response.json();
    assertEqual(body.data.config.defaultRefreshInterval, 1, 'Minimum value accepted');
  });
  
  await runSuite('Edge Cases - Maximum historyRetention (365 days)', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      historyRetention: 365
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 200, 'Status is 200');
    
    const body = await response.json();
    assertEqual(body.data.config.historyRetention, 365, 'Maximum value accepted');
  });
  
  await runSuite('Edge Cases - Empty defaultDomains array', async () => {
    const env = createMockEnv();
    const request = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      defaultDomains: []
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    
    const response = await handleConfig(request, env);
    assertEqual(response.status, 200, 'Status is 200');
    
    const body = await response.json();
    assert(Array.isArray(body.data.config.defaultDomains), 'Empty array accepted');
    assertEqual(body.data.config.defaultDomains.length, 0, 'Empty array');
  });
}

// ============================================================
// Persistence Tests
// ============================================================

async function runPersistenceTests() {
  await runSuite('Persistence - Config survives round trip', async () => {
    const env = createMockEnv();
    
    // Step 1: Update config
    const updateRequest = createMockRequest('http://localhost:8787/api/admin/config', 'PUT', {
      defaultRefreshInterval: 99999,
      rateLimit: { windowMs: 5000, maxRequests: 5 },
      historyRetention: 30
    }, {
      'X-API-Token': 'test_secret_token_123'
    });
    await handleConfig(updateRequest, env);
    
    // Step 2: Read config
    const getRequest = createMockRequest('http://localhost:8787/api/admin/config', 'GET', null, {
      'X-API-Token': 'test_secret_token_123'
    });
    const getResponse = await handleConfig(getRequest, env);
    const body = await getResponse.json();
    
    // Step 3: Verify values
    assertEqual(body.data.defaultRefreshInterval, 99999, 'Refresh interval persisted');
    assertEqual(body.data.rateLimit.windowMs, 5000, 'WindowMs persisted');
    assertEqual(body.data.rateLimit.maxRequests, 5, 'MaxRequests persisted');
    assertEqual(body.data.historyRetention, 30, 'Retention persisted');
  });
}

// ============================================================
// Main Test Runner
// ============================================================

export async function runConfigIntegrationTests() {
  console.log('\n=== Config API Integration Tests ===\n');
  
  await runGetConfigTests();
  await runFullUpdateTests();
  await runPartialUpdateTests();
  await runValidationErrorTests();
  await runConfigEdgeCasesTests();
  await runPersistenceTests();
  
  console.log('\n=== Config API Tests Complete ===\n');
}
