# 子任务 23：测试与优化

**状态**: 🔴 未启动  
**优先级**: P1 (中)  
**预计工时**: 4-6 小时  
**创建日期**: 2026-06-06  
**更新日期**: 2026-06-06  
**前置依赖**: 任务 22（部署配置）✅  

---

## 任务目标

进行全面测试和性能优化，确保生产环境稳定运行，发现并修复潜在问题。

### 核心需求

1. **端到端测试**: 验证完整用户流程
2. **性能优化**: 优化 API 响应时间和前端加载速度
3. **安全审计**: 检查安全漏洞和防护机制
4. **错误处理**: 完善错误处理和用户提示
5. **文档完善**: 编写 API 文档和用户手册

---

## 子步骤

### 23.1 端到端测试

**目标**: 验证完整用户流程和关键场景

#### 测试场景 1: 公开 Dashboard

```bash
# 1. 访问首页
curl -s https://your-single.your-domain.pages.dev/ | grep -E "<title>|域名"

# 2. 检查域名列表
curl -s https://your-single.your-domain.pages.dev/api/public/domains | jq .

# 3. 搜索域名
curl -s "https://your-single.your-domain.pages.dev/api/public/domains?q=cloudflare" | jq .
```

**验收标准**:
- [ ] 首页正常加载
- [ ] 域名列表显示正确
- [ ] 搜索功能正常
- [ ] 状态图标显示正确

#### 测试场景 2: 管理后台登录

```bash
# 1. 访问登录页
curl -s -I https://your-single.your-domain.pages.dev/#/login | head -5

# 2. 验证 Token（有效）
curl -s -X POST https://domain-monitor.varhub.workers.dev/api/admin/auth/verify \
  -H "X-API-Token: YOUR_CLOUDFLARE_API_TOKEN" | jq .

# 3. 验证 Token（无效）
curl -s -X POST https://domain-monitor.varhub.workers.dev/api/admin/auth/verify \
  -H "X-API-Token: wrong-token" | jq .
```

**验收标准**:
- [ ] 登录页正常加载
- [ ] 有效 Token 返回 200
- [ ] 无效 Token 返回 401
- [ ] JWT 正确保存到 localStorage

#### 测试场景 3: 域名管理 CRUD

```bash
TOKEN="YOUR_CLOUDFLARE_API_TOKEN"
BASE="https://domain-monitor.varhub.workers.dev"

# 1. 获取域名列表
curl -s "$BASE/api/admin/domains" -H "X-API-Token: $TOKEN" | jq .data

# 2. 添加域名
curl -s -X POST "$BASE/api/admin/domains" \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}' | jq .

# 3. 删除域名
curl -s -X DELETE "$BASE/api/admin/domains/example.com" \
  -H "X-API-Token: $TOKEN" | jq .
```

**验收标准**:
- [ ] 列表查询正常
- [ ] 添加域名成功
- [ ] 删除域名成功
- [ ] 域名验证逻辑正确

#### 测试场景 4: 系统配置

```bash
# 1. 获取配置
curl -s "$BASE/api/admin/config" -H "X-API-Token: $TOKEN" | jq .data

# 2. 更新配置
curl -s -X PUT "$BASE/api/admin/config" \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"detectionInterval":24,"historyRetention":14}' | jq .

# 3. DoH 测试
curl -s -X POST "$BASE/api/admin/doh/test" \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://cloudflare-dns.com/dns-query"}' | jq .
```

**验收标准**:
- [ ] 配置读取正常
- [ ] 配置保存成功
- [ ] DoH 测试返回延迟

#### 测试场景 5: 历史记录

```bash
# 1. 获取历史记录
curl -s "$BASE/api/admin/history" -H "X-API-Token: $TOKEN" | jq .data

# 2. CSV 导出
curl -s "$BASE/api/admin/history/export" -H "X-API-Token: $TOKEN" | head -10

# 3. 清理历史
curl -s -X DELETE "$BASE/api/admin/history" -H "X-API-Token: $TOKEN" | jq .
```

**验收标准**:
- [ ] 历史记录查询正常
- [ ] CSV 导出格式正确
- [ ] 清理功能正常

#### 测试场景 6: 统计概览

```bash
# 获取统计
curl -s "$BASE/api/admin/stats" -H "X-API-Token: $TOKEN" | jq .data
```

**验收标准**:
- [ ] 统计数据完整
- [ ] 各项指标计算正确
- [ ] 手动刷新正常

---

### 23.2 性能优化

**目标**: 优化 API 响应时间和前端加载速度

#### 后端性能优化

1. **KV 查询优化**

```javascript
// 优化前：多次 KV 读取
const domains = await env.DOMAIN_MONITOR_KV.get('domain_list', 'json');
const config = await env.DOMAIN_MONITOR_KV.get('config', 'json');
const stats = await env.DOMAIN_MONITOR_KV.get('stats', 'json');

// 优化后：批量读取（如适用）
// 或使用缓存减少 KV 读取频率
```

2. **响应时间测试**

```bash
# 测试各 API 响应时间
BASE="https://domain-monitor.varhub.workers.dev"
TOKEN="YOUR_CLOUDFLARE_API_TOKEN"

echo "=== API Response Time Test ==="
echo "Public Domains:"
curl -s -o /dev/null -w "Time: %{time_total}s\n" "$BASE/api/public/domains"

echo "Admin Config:"
curl -s -o /dev/null -w "Time: %{time_total}s\n" "$BASE/api/admin/config" \
  -H "X-API-Token: $TOKEN"

echo "Admin Stats:"
curl -s -o /dev/null -w "Time: %{time_total}s\n" "$BASE/api/admin/stats" \
  -H "X-API-Token: $TOKEN"
```

**验收标准**:
- [ ] 所有 API 响应时间 < 500ms
- [ ] KV 读取次数优化
- [ ] 缓存策略合理

#### 前端性能优化

1. **构建优化**

```bash
cd frontend

# 分析构建产物
npm run build -- --analyze

# 检查文件大小
ls -lh dist/assets/
```

2. **加载优化**

- [ ] 路由懒加载（已实现）
- [ ] 组件按需加载
- [ ] 图片压缩
- [ ] CSS 压缩

3. **缓存策略**

```javascript
// Vite 配置优化
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router'],
          'utils': ['./utils/api.js', './utils/storage.js']
        }
      }
    }
  }
}
```

**验收标准**:
- [ ] 首屏加载 < 2s
- [ ] 构建产物 < 500KB
- [ ] 路由懒加载 100%
- [ ] 缓存策略生效

---

### 23.3 安全审计

**目标**: 检查安全漏洞和防护机制

#### 安全检查清单

1. **认证安全**

```bash
# 1. 无 Token 访问 Admin API
curl -s "$BASE/api/admin/config" | jq .
# 预期：401 Unauthorized

# 2. 错误 Token
curl -s "$BASE/api/admin/config" -H "X-API-Token: wrong" | jq .
# 预期：401 Unauthorized

# 3. Token 过期处理
# 检查 JWT exp 字段验证
```

**验收标准**:
- [ ] 无 Token 返回 401
- [ ] 错误 Token 返回 401
- [ ] Token 过期自动失效
- [ ] Token 不在日志中暴露

2. **XSS 防护**

```bash
# 检查前端是否转义用户输入
# 测试脚本注入
curl -s -X POST "$BASE/api/admin/domains" \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"<script>alert(1)</script>"}' | jq .
# 预期：域名验证失败
```

**验收标准**:
- [ ] 用户输入转义
- [ ] 脚本注入被拒绝
- [ ] onclick 事件委托（已实现）
- [ ] 无 eval 使用

3. **CSRF 防护**

**检查项**:
- [ ] CORS 白名单配置
- [ ] 验证 Origin 头
- [ ] Token 认证（已实现）

4. **限流防护**

```bash
# 快速连续请求测试
for i in {1..15}; do
  curl -s -o /dev/null -w "$i: %{http_code}\n" "$BASE/api/public/domains"
done
```

**验收标准**:
- [ ] 超过限流返回 429
- [ ] 限流计数器工作
- [ ] 限流日志记录

5. **敏感信息检查**

```bash
# 检查 git 历史是否有敏感信息
git log --all --full-history -p -- '**/*.toml' | grep -E "token|secret|key" || echo "✅ 无敏感信息"

# 检查代码中是否有硬编码
grep -r "YOUR_CLOUDFLARE_API_TOKEN" src/ frontend/ || echo "✅ 无硬编码 Token"
```

**验收标准**:
- [ ] 无 KV ID 泄露
- [ ] 无 API Token 硬编码
- [ ] 无密码明文
- [ ] .gitignore 正确配置

---

### 23.4 错误处理优化

**目标**: 完善错误处理和用户提示

#### 后端错误处理

1. **统一错误格式**

```javascript
// 确保所有错误返回统一格式
{
  "code": 400,
  "data": null,
  "msg": "Invalid domain format"
}
```

2. **错误类型检查**

```bash
# 测试各类错误响应
echo "=== Error Handling Test ==="

# 400 Bad Request
curl -s -X POST "$BASE/api/admin/domains" \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"invalid domain"}' | jq .

# 404 Not Found
curl -s "$BASE/api/admin/nonexistent" \
  -H "X-API-Token: $TOKEN" | jq .

# 500 Internal Error
# 模拟错误场景测试
```

**验收标准**:
- [ ] 所有错误返回统一格式
- [ ] 错误码正确（400/401/404/500）
- [ ] 错误信息友好
- [ ] 错误日志记录

#### 前端错误处理

1. **API 错误处理**

```javascript
// 检查 api.js 错误处理
async function request(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new APIError(response.status, response.statusText);
    }
    return await response.json();
  } catch (error) {
    // 错误分类处理
    if (error.status === 401) {
      // 跳转登录
    } else if (error.status === 403) {
      // 权限不足
    } else if (error.status === 404) {
      // 资源不存在
    } else {
      // 网络错误
    }
  }
}
```

2. **用户提示**

**检查项**:
- [ ] 401 → 跳转登录
- [ ] 403 → 权限提示
- [ ] 404 → 资源不存在提示
- [ ] 网络错误 → 重试提示
- [ ] 加载状态显示
- [ ] 成功提示显示

**验收标准**:
- [ ] 错误分类处理
- [ ] 用户提示友好
- [ ] 加载状态正确
- [ ] 无控制台错误

---

### 23.5 文档完善

**目标**: 编写完整的 API 文档和用户手册

#### API 文档

创建 `.monkeycode/docs/api.md`:

```markdown
# API 文档

## 认证

所有 Admin API 需要在请求头中携带 Token:
```
X-API-Token: <your-token>
```

## Public API

### GET /api/public/domains

获取公开域名列表

**响应**:
```json
{
  "code": 200,
  "data": {
    "domains": [
      {
        "domain": "cloudflare.com",
        "status": "online",
        "lastChecked": "2026-06-06T10:00:00.000Z"
      }
    ],
    "count": 1
  },
  "msg": "success"
}
```

## Admin API

### POST /api/admin/auth/verify

验证 Token

**请求**:
```
X-API-Token: <your-token>
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "valid": true,
    "message": "Token is valid"
  },
  "msg": "success"
}
```

...（所有端点文档）
```

#### 用户手册

创建 `.monkeycode/docs/user-guide.md`:

```markdown
# 用户手册

## 快速开始

### 公开 Dashboard

1. 访问 https://your-single.your-domain.pages.dev/
2. 查看域名列表和状态
3. 使用搜索框查询域名

### 管理后台

1. 点击右上角"管理登录"
2. 输入 API Token
3. 进入管理后台

## 功能说明

### 域名管理
- 添加域名
- 删除域名
- 批量操作
- 默认展示设置

### 系统配置
- 检测间隔设置
- 历史保留设置
- DoH 服务器配置

...（所有功能说明）
```

#### 运维手册

创建 `.monkeycode/docs/operations.md`:

```markdown
# 运维手册

## 部署流程

1. 部署 Worker
```bash
npx wrangler deploy --env production
```

2. 部署 Pages
```bash
cd frontend && npm run build
npx wrangler pages deploy dist/
```

## 监控告警

- Worker 请求数：Cloudflare Dashboard
- KV 使用量：Cloudflare Dashboard
- 错误率：自定义监控

## 备份恢复

### KV 备份
```bash
# 导出域名列表
curl -s $API_URL/api/admin/domains \
  -H "X-API-Token: $TOKEN" | jq .data.domains > domains-backup.json
```

## 故障排查

### 问题：API 返回 401
解决：检查 Token 是否正确

### 问题：定时任务未执行
解决：检查 Cron 配置
```

**验收标准**:
- [ ] API 文档完整（所有端点）
- [ ] 用户手册完整（所有功能）
- [ ] 运维手册完整（部署/监控/故障排查）
- [ ] 示例代码正确
- [ ] 错误码说明完整

---

## 验收标准

### 端到端测试

- [ ] 6 个测试场景全部通过
- [ ] 关键流程无阻塞
- [ ] 边缘场景处理正确

### 性能优化

- [ ] API 响应时间 < 500ms
- [ ] 首屏加载 < 2s
- [ ] 构建产物 < 500KB
- [ ] 缓存策略生效

### 安全审计

- [ ] 无高危漏洞
- [ ] 认证机制完善
- [ ] XSS 防护生效
- [ ] 限流防护生效
- [ ] 敏感信息无泄露

### 错误处理

- [ ] 统一错误格式
- [ ] 错误分类正确
- [ ] 用户提示友好
- [ ] 日志记录完整

### 文档完善

- [ ] API 文档完整
- [ ] 用户手册完整
- [ ] 运维手册完整
- [ ] 示例代码正确

---

## 交付物

### 测试报告

| 文档 | 说明 |
|------|------|
| `tests/e2e-report.md` | 端到端测试报告 |
| `tests/performance-report.md` | 性能测试报告 |
| `tests/security-audit.md` | 安全审计报告 |

### 优化代码

| 文件 | 说明 |
|------|------|
| `src/utils/cache.js` | 缓存优化（如新增） |
| `frontend/src/utils/api.js` | 错误处理优化 |
| `frontend/vite.config.js` | 构建优化 |

### 文档

| 文档 | 说明 |
|------|------|
| `.monkeycode/docs/api.md` | API 文档 |
| `.monkeycode/docs/user-guide.md` | 用户手册 |
| `.monkeycode/docs/operations.md` | 运维手册 |

---

## 测试脚本

### e2e-test.sh

```bash
#!/bin/bash
# 端到端测试脚本

BASE="https://domain-monitor.varhub.workers.dev"
TOKEN="YOUR_CLOUDFLARE_API_TOKEN"

echo "=== E2E Test Suite ==="

# Test 1: Public API
echo "Test 1: Public API..."
curl -s "$BASE/api/public/domains" | jq -e '.code == 200' && echo "✅ PASS" || echo "❌ FAIL"

# Test 2: Admin Auth
echo "Test 2: Admin Auth..."
curl -s -X POST "$BASE/api/admin/auth/verify" -H "X-API-Token: $TOKEN" | jq -e '.data.valid == true' && echo "✅ PASS" || echo "❌ FAIL"

# Test 3: Admin Config
echo "Test 3: Admin Config..."
curl -s "$BASE/api/admin/config" -H "X-API-Token: $TOKEN" | jq -e '.code == 200' && echo "✅ PASS" || echo "❌ FAIL"

# ... 更多测试
```

---

## 相关文档

- [测试规范](test-coding-standards.md)
- [错误处理规范](error-handling-standards.md)
- [代码审查清单](code-review-checklist.md)

---

**创建时间**: 2026-06-06  
**预计完成**: 2026-06-06  
**状态**: 🔴 待开始
