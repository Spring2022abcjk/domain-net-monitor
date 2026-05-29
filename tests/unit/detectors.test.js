import { detectHttpsRR } from '../../src/detectors/https-rr.js';
import { detectEch } from '../../src/detectors/ech.js';
import { detectIpv6 } from '../../src/detectors/ipv6.js';
import { detectAll } from '../../src/detectors/index.js';
import { STATUS_OK, STATUS_NO, STATUS_ERROR, DNS_TYPE_HTTPS } from '../../src/config.js';
import { assert, assertEqual, runSuite } from '../test-runner.js';

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(mockData) {
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

function mockFetchError(error) {
  globalThis.fetch = async () => {
    throw new Error(error);
  };
}

function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH;
}

async function testDetectHttpsRR() {
  await runSuite('detectHttpsRR()', async () => {
    // 有 HTTPS RR 记录
    mockFetch({
      Status: 0,
      Answer: [{ type: DNS_TYPE_HTTPS, data: 'alpn="h2,h3"' }]
    });
    
    try {
      const result = await detectHttpsRR('example.com');
      assertEqual(result.status, STATUS_OK, 'Status when record exists');
    } finally {
      restoreFetch();
    }
    
    // 无 HTTPS RR 记录
    mockFetch({ Status: 0, Answer: [] });
    
    try {
      const result = await detectHttpsRR('example.com');
      assertEqual(result.status, STATUS_NO, 'Status when no records');
    } finally {
      restoreFetch();
    }
    
    // DoH 查询失败
    mockFetchError('Network error');
    
    try {
      const result = await detectHttpsRR('example.com');
      assertEqual(result.status, STATUS_ERROR, 'Status on network error');
      assert(result.message.includes('DoH query failed'), 'Error message helpful');
    } finally {
      restoreFetch();
    }
  });
}

async function testDetectEch() {
  await runSuite('detectEch()', async () => {
    // 有 ECH 配置
    mockFetch({
      Status: 0,
      Answer: [{ type: DNS_TYPE_HTTPS, data: '{"ech":"config_here"}' }]
    });
    
    try {
      const result = await detectEch('example.com');
      assertEqual(result.status, STATUS_OK, 'Status when ECH found');
    } finally {
      restoreFetch();
    }
    
    // 无 ECH 配置
    mockFetch({
      Status: 0,
      Answer: [{ type: DNS_TYPE_HTTPS, data: 'no-encrypted-config' }]
    });
    
    try {
      const result = await detectEch('example.com');
      assertEqual(result.status, STATUS_NO, 'Status when no ECH');
    } finally {
      restoreFetch();
    }
    
    // DoH 失败
    mockFetchError('Network error');
    
    try {
      const result = await detectEch('example.com');
      assertEqual(result.status, STATUS_ERROR, 'Status on error');
    } finally {
      restoreFetch();
    }
  });
}

async function testDetectIpv6() {
  await runSuite('detectIpv6()', async () => {
    // 有 AAAA 记录
    mockFetch({
      Status: 0,
      Answer: [{ type: 28, data: '2606:2800:220:1:248:1893:25c8:1946' }]
    });
    
    try {
      const result = await detectIpv6('example.com');
      assertEqual(result.status, STATUS_OK, 'Status when IPv6 exists');
      assert(result.ipv6Addresses && result.ipv6Addresses.length > 0, 'Has IPv6 addresses');
    } finally {
      restoreFetch();
    }
    
    // 无 AAAA 记录
    mockFetch({ Status: 0, Answer: [] });
    
    try {
      const result = await detectIpv6('example.com');
      assertEqual(result.status, STATUS_NO, 'Status when no IPv6');
    } finally {
      restoreFetch();
    }
    
    // DoH 失败
    mockFetchError('Network error');
    
    try {
      const result = await detectIpv6('example.com');
      assertEqual(result.status, STATUS_ERROR, 'Status on error');
    } finally {
      restoreFetch();
    }
  });
}

async function testDetectAll() {
  await runSuite('detectAll()', async () => {
    mockFetch({
      Status: 0,
      Answer: [{ type: DNS_TYPE_HTTPS, data: '{"ech":"yes"}' }]
    });
    
    try {
      const result = await detectAll('example.com');
      
      assertEqual(result.domain, 'example.com', 'Domain field');
      assert(typeof result.timestamp === 'number', 'Timestamp field');
      assert(result.https_rr, 'HTTPS RR result');
      assert(result.ech, 'ECH result');
      assert(result.ipv6, 'IPv6 result');
    } finally {
      restoreFetch();
    }
  });
}

export async function runDetectorTests() {
  await testDetectHttpsRR();
  await testDetectEch();
  await testDetectIpv6();
  await testDetectAll();
}
