# 任务 5：路由层实现

## 任务目标

实现 HTTP API 路由模块，提供域名管理、检测任务、结果查询三大类接口。

---

## 子任务列表

### 5.1 实现 routes/domains.js（域名管理接口）

#### 5.1.1 GET /api/domains — 获取域名列表

功能：
- 调用 `getDomainList()` 读取域名列表
- 返回 JSON 响应

响应示例：
```json
{
  "code": 200,
  "data": ["a.com", "b.com"],
  "msg": "success"
}
```

#### 5.1.2 POST /api/domains — 全量更新域名列表

功能：
- 解析请求体 JSON
- 验证 `domains` 字段为数组
- 调用 `setDomainList()` 覆盖写入

请求体：
```json
{
  "domains": ["域名1", "域名2"]
}
```

错误处理：
- 请求体非 JSON → 400 错误
- `domains` 非数组 → 400 错误

#### 5.1.3 POST /api/domains/add — 追加单个域名

功能：
- 解析请求体 JSON
- 验证 `domain` 字段
- 域名清洗（调用 `cleanDomain()`）
- 调用 `addDomain()` 追加

请求体：
```json
{
  "domain": "目标域名"
}
```

错误处理：
- 域名为空或非法 → 400 错误
- 域名已存在 → 返回提示（非错误）

#### 5.1.4 POST /api/domains/delete — 删除单个域名

功能：
- 解析请求体 JSON
- 验证 `domain` 字段
- 域名清洗
- 调用 `removeDomain()` 删除

请求体：
```json
{
  "domain": "目标域名"
}
```

错误处理：
- 域名为空或非法 → 400 错误
- 域名不存在 → 返回提示（非错误）

---

### 5.2 实现 routes/detect.js（检测接口）

#### 5.2.1 GET/POST /api/detect/all — 批量检测全部域名

功能：
- 读取域名列表
- 串行遍历每个域名，执行 `detectAll()`
- 将每个域名的检测结果写入 KV
- 返回全部结果汇总

响应示例：
```json
{
  "code": 200,
  "data": [
    { "domain": "a.com", "timestamp": 123, "https_rr": {...}, "ech": {...}, "ipv6": {...} },
    { "domain": "b.com", "timestamp": 123, "https_rr": {...}, "ech": {...}, "ipv6": {...} }
  ],
  "msg": "检测完成"
}
```

注意：
- 受 Worker CPU 时长限制，批量检测可能超时
- 建议每次批量检测的域名数量适度

#### 5.2.2 POST /api/detect/single — 单域名检测

功能：
- 解析请求体 JSON
- 验证 `domain` 字段
- 域名清洗
- 执行 `detectAll()` 检测
- 将结果写入 KV

请求体：
```json
{
  "domain": "目标域名"
}
```

响应示例：
```json
{
  "code": 200,
  "data": {
    "domain": "example.com",
    "timestamp": 1234567890,
    "https_rr": { "status": "ok", "message": "..." },
    "ech": { "status": "ok", "message": "..." },
    "ipv6": { "status": "ok", "message": "..." }
  },
  "msg": "检测成功"
}
```

---

### 5.3 实现 routes/result.js（结果查询接口）

#### 5.3.1 GET /api/result/all — 查询全部域名最新结果

功能：
- 调用 `getAllResults()` 批量读取
- 返回所有域名的最新检测结果

响应示例：
```json
{
  "code": 200,
  "data": [
    { "domain": "a.com", "timestamp": 123, ... },
    { "domain": "b.com", "timestamp": 123, ... }
  ],
  "msg": "success"
}
```

#### 5.3.2 POST /api/result/single — 查询单域名最新结果

功能：
- 解析请求体 JSON
- 验证 `domain` 字段
- 域名清洗
- 调用 `getResult()` 读取

请求体：
```json
{
  "domain": "目标域名"
}
```

响应示例：
```json
{
  "code": 200,
  "data": {
    "domain": "example.com",
    "timestamp": 1234567890,
    "https_rr": { "status": "ok", "message": "..." },
    "ech": { "status": "ok", "message": "..." },
    "ipv6": { "status": "ok", "message": "..." }
  },
  "msg": "success"
}
```

错误处理：
- 结果不存在 → 404 错误

---

### 5.4 实现 routes/index.js（路由聚合）

#### 5.4.1 分发函数 `handleRequest(request)`

功能：
- 解析请求路径和方法
- 匹配路由，分发至对应处理函数
- 所有路由未匹配 → 404 错误

路由表：
| 路径 | 方法 | 处理模块 |
|------|------|---------|
| `/api/domains` | GET | `domains.js` (list) |
| `/api/domains` | POST | `domains.js` (update) |
| `/api/domains/add` | POST | `domains.js` (add) |
| `/api/domains/delete` | POST | `domains.js` (delete) |
| `/api/detect/all` | GET/POST | `detect.js` (all) |
| `/api/detect/single` | POST | `detect.js` (single) |
| `/api/result/all` | GET | `result.js` (all) |
| `/api/result/single` | POST | `result.js` (single) |

返回值：
- 返回对应路由处理函数的响应

---

## 验收标准

1. 所有 API 接口符合需求文档定义的规范
2. 所有接口返回统一的 JSON 格式（code/data/msg）
3. 支持跨域请求（CORS 响应头）
4. 正确处理 OPTIONS 预检请求
5. 所有输入都经过域名清洗和合法性验证
6. 错误情况返回合适的状态码和错误信息

---

## 前置依赖

- 任务 1：项目初始化与配置
- 任务 2：工具层实现
- 任务 3：检测模块实现
- 任务 4：存储层实现

## 后续依赖

- 任务 6：入口与集成
