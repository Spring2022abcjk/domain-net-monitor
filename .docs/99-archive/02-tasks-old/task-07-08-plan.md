# 任务 7 和 8 实施计划

**创建时间**: 2026-05-30  
**状态**: 📋 已规划  
**优先级**: 高  

---

## 任务概览

### 任务 7：DoH 配置 API 🟡

**目标**: 实现管理员对 DoH（DNS over HTTPS）端点的配置和测试功能

**API 端点**:
- `GET /api/admin/doh` - 获取 DoH 端点配置
- `PUT /api/admin/doh` - 更新 DoH 端点
- `POST /api/admin/doh/test` - 测试 DoH 端点可用性

**预计工时**: 2 小时

**验收标准**:
- [ ] 3 个端点全部实现
- [ ] URL 验证逻辑正确
- [ ] 测试返回延迟（毫秒）
- [ ] 超时处理正确
- [ ] 测试覆盖率 100%

**关键文件**:
- `src/routes/admin/doh.js` - DoH 配置路由（新建）
- `tests/integration/doh.test.js` - DoH 测试（新建）

---

### 任务 8：检测操作 API 🔴

**目标**: 实现管理员手动触发域名检测的功能

**API 端点**:
- `POST /api/admin/detect/single` - 单域名即时检测
- `POST /api/admin/detect/all` - 批量检测所有域名
- `POST /api/admin/detect/default` - 检测默认域名列表

**预计工时**: 4 小时

**验收标准**:
- [ ] 检测服务 `detectDomain()` 实现
- [ ] 3 个端点全部实现
- [ ] 结果保存到 KV
- [ ] 历史记录保存
- [ ] 测试覆盖率 100%

**关键文件**:
- `src/services/detector.js` - 检测服务（新建）
- `src/routes/admin/detect.js` - 检测操作路由（新建）
- `tests/integration/detect.test.js` - 检测测试（新建）

---

## 实施步骤

### 任务 7 实施流程

#### Step 1: 创建 DoH 路由文件

```bash
# 创建文件
touch src/routes/admin/doh.js
```

**实现内容**:
- `getDohConfig(request, env)` - GET 端点
- `updateDohConfig(request, env)` - PUT 端点
- `testDohEndpoint(request, env)` - POST 测试端点
- `isValidDohUrl(url)` - URL 验证函数

#### Step 2: 实现 GET 端点

**功能**: 读取当前 DoH 配置

**代码要点**:
```javascript
const config = await getConfig(env);
return jsonResponse({
  primary: config.doh.primary,
  backup: config.doh.backup
}, 200);
```

#### Step 3: 实现 PUT 端点

**功能**: 更新 DoH 配置

**代码要点**:
1. 验证请求体 JSON
2. 验证 URL 格式（HTTPS 协议）
3. 合并配置（支持部分更新）
4. 保存到 KV

**错误处理**:
- 400: 无效 URL 格式
- 400: 无效请求体

#### Step 4: 实现 POST 测试端点

**功能**: 测试 DoH 端点连通性

**代码要点**:
1. 记录开始时间
2. 使用 `fetchWithTimeout` 请求
3. 计算延迟（latency）
4. 区分 HTTP 错误和网络错误

**响应字段**:
- `url`: 测试的 URL
- `success`: true/false
- `latency`: 毫秒数
- `status`: HTTP 状态码
- `message`: 说明信息

#### Step 5: 注册路由

**文件**: `src/routes/admin/index.js`

添加路由映射：
```javascript
import { router as dohRouter } from './doh.js';

const adminRoutes = {
  // ...
  '/api/admin/doh': {
    GET: dohRouter.getDohConfig,
    PUT: dohRouter.updateDohConfig
  },
  '/api/admin/doh/test': {
    POST: dohRouter.testDohEndpoint
  }
};
```

#### Step 6: 编写测试

**文件**: `tests/integration/doh.test.js`

**测试覆盖**:
- GET 成功返回配置
- PUT 成功更新
- PUT 验证 URL 格式
- POST 测试成功
- POST 测试超时

#### Step 7: 运行验证

```bash
# 运行测试
npm test

# 预提交检查
./scripts/pre-commit-check.sh

# 手动测试（curl）
export TOKEN="your_token"
curl -X GET http://localhost:8787/api/admin/doh -H "X-API-Token: $TOKEN" | jq
```

---

### 任务 8 实施流程

#### Step 1: 创建检测服务文件

```bash
# 创建文件
mkdir -p src/services
touch src/services/detector.js
```

**实现内容**:
- `queryDoh(domain, recordType, dohUrl, timeout)` - DoH 查询封装
- `detectDomain(domain, env)` - 单域名检测主函数
- `saveResult(env, result)` - 保存最新结果
- `addToHistory(env, result)` - 添加到历史记录

#### Step 2: 实现检测逻辑

**检测指标**:
1. **HTTPS RR**（RFC 9460）: 查询 TYPE 65 记录
2. **ECH**（Encrypted Client Hello）: 检查 HTTPS 记录中的 ech 字段
3. **IPv6**（AAAA 记录）: 查询 AAAA 记录

**状态计算**:
- OK: 全部检测通过
- PARTIAL: HTTPS RR OK，但 ECH/IPv6 不 OK
- NO: 检测不通过
- ERROR: 检测出错

#### Step 3: 创建检测路由文件

```bash
# 创建文件
touch src/routes/admin/detect.js
```

**实现内容**:
- `detectSingle(request, env)` - 单域名检测
- `detectAll(request, env)` - 批量检测
- `detectDefault(request, env)` - 默认列表检测

#### Step 4: 实现单域名检测

**请求体**:
```json
{
  "domain": "cloudflare.com"
}
```

**处理流程**:
1. 验证域名格式
2. 调用 `detectDomain()`
3. 保存结果到 KV
4. 添加到历史记录
5. 返回检测结果

#### Step 5: 实现批量检测

**处理流程**:
1. 读取所有域名
2. 循环检测（失败隔离）
3. 统计成功/失败数量
4. 返回汇总结果

**错误处理**:
- 单个域名失败不影响其他
- 记录错误日志

#### Step 6: 实现默认列表检测

**处理流程**:
1. 读取默认域名列表
2. 循环检测
3. 统计汇总
4. 返回结果

#### Step 7: 注册路由

**文件**: `src/routes/admin/index.js`

添加路由映射：
```javascript
import { router as detectRouter } from './detect.js';

const adminRoutes = {
  // ...
  '/api/admin/detect/single': {
    POST: detectRouter.detectSingle
  },
  '/api/admin/detect/all': {
    POST: detectRouter.detectAll
  },
  '/api/admin/detect/default': {
    POST: detectRouter.detectDefault
  }
};
```

#### Step 8: 编写测试

**文件**: `tests/integration/detect.test.js`

**测试覆盖**:
- 单域名检测成功
- 单域名检测无效域名
- 批量检测空列表
- 批量检测多个域名
- 默认列表检测

#### Step 9: 运行验证

```bash
# 运行测试
npm test

# 预提交检查
./scripts/pre-commit-check.sh

# 手动测试
curl -X POST http://localhost:8787/api/admin/detect/single \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $TOKEN" \
  -d '{"domain": "cloudflare.com"}' | jq
```

---

## 依赖关系

### 任务 7 依赖

**前置依赖**:
- ✅ 任务 1: `fetchWithTimeout` 函数
- ✅ 任务 4: 鉴权中间件
- ✅ 任务 6: 配置存储

**后续依赖**:
- 任务 8: 检测服务使用 `config.doh.primary`
- 任务 11: 定时检测使用 DoH

### 任务 8 依赖

**前置依赖**:
- ✅ 任务 1: helper 函数
- ✅ 任务 4: 鉴权中间件
- ✅ 任务 5: `getAllDomains()`
- ✅ 任务 6: `getConfig()`
- 🟡 任务 7: DoH 配置

**后续依赖**:
- 任务 9: 历史记录 API
- 任务 10: 统计概览 API
- 任务 11: 定时检测

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| DoH 端点不可用 | 测试失败 | 支持备用端点，错误清晰 |
| 批量检测超时 | Worker 终止 | 失败隔离，记录日志 |
| URL 验证不当 | 请求失败 | 严格验证 HTTPS 协议 |
| KV 写入失败 | 结果丢失 | 捕获错误，记录日志 |

---

## 时间估算

| 任务 | 工时 | 复杂度 |
|------|------|--------|
| 任务 7 | 2 小时 | ⭐⭐ 中等 |
| 任务 8 | 4 小时 | ⭐⭐⭐ 较高 |

**总计**: 6 小时

---

## 验收清单

### 任务 7 验收

- [ ] GET `/api/admin/doh` 返回配置
- [ ] PUT `/api/admin/doh` 验证 URL
- [ ] PUT `/api/admin/doh` 支持部分更新
- [ ] POST `/api/admin/doh/test` 测试连通性
- [ ] 测试返回延迟（毫秒）
- [ ] 超时处理正确
- [ ] 单元测试 100% 覆盖
- [ ] 预提交检查通过

### 任务 8 验收

- [ ] `detectDomain()` 检测三项指标
- [ ] POST `/api/admin/detect/single` 成功
- [ ] POST `/api/admin/detect/all` 批量检测
- [ ] POST `/api/admin/detect/default` 检测默认列表
- [ ] 结果保存到 KV
- [ ] 历史记录保存
- [ ] 失败隔离正确
- [ ] 单元测试 100% 覆盖
- [ ] 预提交检查通过

---

## 下一步

1. 执行任务 7 Step 1 - 创建 DoH 路由文件
2. 依次完成任务 7 的所有步骤
3. 验证任务 7 测试通过
4. 执行任务 8 Step 1 - 创建检测服务文件
5. 依次完成任务 8 的所有步骤
6. 验证任务 8 测试通过
7. 更新项目文档和进度
