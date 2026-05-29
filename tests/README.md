# 单元测试文档

## 测试架构

```
tests/
├── test-runner.js          # 简易测试框架（assert、runSuite、printSummary）
├── index.js                # 测试入口，运行所有测试
└── unit/
    ├── helper.test.js      # 工具函数测试
    ├── doh-client.test.js  # DoH 客户端测试
    ├── detectors.test.js   # 检测器测试
    ├── storage.test.js     # KV 存储测试
    └── routes.test.js      # 路由层测试
```

## 运行测试

```bash
# 运行所有测试
npm test

# 或直接用 node 运行
node tests/index.js
```

## 测试覆盖范围

| 测试文件 | 测试对象 | 测试用例数 |
|---------|---------|-----------|
| `helper.test.js` | 域名清洗、JSON 响应、CORS 预检 | 35 |
| `doh-client.test.js` | DoH 查询、主备切换 | 8 |
| `detectors.test.js` | HTTPS RR、ECH、IPv6、全量检测 | 16 |
| `storage.test.js` | KV 读写、域名列表管理 | 19 |
| `routes.test.js` | 8 个 API 路由接口 | 21 |
| **总计** | | **99** |

## 测试用例详情

### helper.test.js

**cleanDomain()**
- ✓ Pure domain
- ✓ Domain with www
- ✓ HTTP/HTTPS protocol
- ✓ Port number
- ✓ URL path
- ✓ Full URL
- ✓ Trimmed whitespace
- ✓ Uppercase to lowercase
- ✓ Empty/Null/Undefined
- ✓ Invalid characters

**jsonResponse()**
- ✓ Returns Response object
- ✓ Content-Type header
- ✓ CORS header
- ✓ Status code
- ✓ Data
- ✓ Message

**handleOptionsRequest()**
- ✓ 204 No Content
- ✓ CORS headers

### doh-client.test.js

**queryDoH()**
- ✓ Success case
- ✓ Backup failover
- ✓ Both endpoints failed
- ✓ AAAA query
- ✓ Empty Answer

### detectors.test.js

**detectHttpsRR()**
- ✓ Status when record exists
- ✓ Status when no records
- ✓ Status on network error

**detectEch()**
- ✓ Status when ECH found
- ✓ Status when no ECH
- ✓ Status on error

**detectIpv6()**
- ✓ Status when IPv6 exists
- ✓ Status when no IPv6
- ✓ Status on error

**detectAll()**
- ✓ Domain field
- ✓ Timestamp field
- ✓ All three detectors run

### storage.test.js

**Domain List Operations**
- ✓ Initial list is empty
- ✓ Set domain list
- ✓ Add new domain
- ✓ Add existing domain (dedup)
- ✓ Remove existing domain
- ✓ Remove non-existent domain

**Result Operations**
- ✓ Non-existent result is null
- ✓ Write result
- ✓ Read result
- ✓ Batch read (empty)
- ✓ Batch read (with data)
- ✓ Batch read (partial)

**KV Binding Error**
- ✓ Error when KV not bound

### routes.test.js

**Domains Routes**
- ✓ GET /api/domains (empty)
- ✓ POST /api/domains (update)
- ✓ POST /api/domains/add
- ✓ POST /api/domains/add (invalid)
- ✓ POST /api/domains/delete

**Detect Routes**
- ✓ Content-Type check

**Result Routes**
- ✓ GET single result
- ✓ GET non-existent result

**404 Route**
- ✓ Unknown route handling

## Mock 策略

### Fetch Mock
DoH 客户端和检测器测试使用 `globalThis.fetch` 覆盖来模拟网络请求：

```javascript
const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(mockData) {
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(mockData));
  };
}

function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH;
}
```

### KV Mock
存储层测试使用 `MockKV` 类模拟 KV 存储：

```javascript
class MockKV {
  constructor() {
    this.store = new Map();
  }
  
  async get(key) {
    return this.store.get(key) || null;
  }
  
  async put(key, value) {
    this.store.set(key, value);
  }
}
```

## 扩展测试

如需添加新测试，参考以下步骤：

1. 在 `tests/unit/` 创建新的 `.test.js` 文件
2. 导入 `assert`、`assertEqual`、`runSuite`
3. 创建 `async function testXxx()` 函数
4. 在 `tests/index.js` 中导入并调用

## 预期输出

```
╔══════════════════════════════════════════════════════════╗
║     Cloudflare Domain Monitor - Unit Tests              ║
╚══════════════════════════════════════════════════════════╝

==================================================
Running: cleanDomain()
==================================================
  ✓ Pure domain
  ✓ Domain with www
  ...

==================================================
TEST SUMMARY
==================================================
Total: 99
Passed: 99
Failed: 0
==================================================

✅ All tests passed!
```
