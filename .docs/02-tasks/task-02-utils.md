# 任务 2：工具层实现

## 任务目标

实现通用工具函数和 DoH 客户端封装，为上层模块提供基础能力。

---

## 子任务列表

### 2.1 实现 utils/helper.js

#### 2.1.1 域名清洗函数 `cleanDomain(domain)`

功能：
- 移除 `http://` 或 `https://` 协议前缀
- 移除端口号（如 `:443`、`:80`）
- 移除 URL 路径部分
- 去除首尾空白字符
- 返回纯域名（如 `https://www.example.com:443/path` → `www.example.com`）

异常处理：
- 输入为空或清洗后为空 → 返回 `null`
- 域名格式非法 → 返回 `null`

#### 2.1.2 带超时的 fetch 封装 `fetchWithTimeout(url, options, timeout)`

功能：
- 封装原生 `fetch`，添加超时控制
- 默认超时时间使用 `config.REQUEST_TIMEOUT`
- 超时后自动中断请求，返回错误

返回值：
- 成功：返回 `fetch Response` 对象
- 失败：抛出错误（包含错误原因）

#### 2.1.3 统一 JSON 响应构造 `jsonResponse(data, status, message)`

功能：
- 构造标准 API 响应对象
- 设置 `Content-Type: application/json`
- 支持自定义 HTTP 状态码

格式：
```javascript
{
  code: status,    // HTTP 状态码或业务状态码
  data: data,      // 响应数据
  msg: message     // 描述信息
}
```

#### 2.1.4 OPTIONS 跨域预检处理 `handleOptionsRequest()`

功能：
- 处理 CORS 预检请求（OPTIONS 方法）
- 返回必要的跨域响应头

响应头：
```javascript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}
```

### 2.2 实现 doh/client.js

#### 2.2.1 DoH 查询函数 `queryDoH(domain, dnsType)`

功能：
- 接收域名和 DNS 类型码
- 优先使用主节点 `cloudflare-dns.com` 查询
- 主节点失败时自动切换备用节点 `dns.google`
- 返回 DoH 原始 JSON 响应

请求参数：
- `domain`：目标域名（已清洗）
- `dnsType`：DNS 记录类型（65 或 28）

返回值：
- 成功：DoH JSON 响应对象（包含 Answer 数组）
- 失败：抛出错误

重试逻辑：
1. 尝试主节点，成功则返回
2. 主节点超时/异常 → 尝试备用节点
3. 双节点均失败 → 抛出错误

---

## 验收标准

1. `cleanDomain()` 能正确处理各种带协议、端口的域名输入
2. `fetchWithTimeout()` 在超时后能正确中断请求
3. `jsonResponse()` 返回的响应符合 API 规范
4. `queryDoH()` 能成功查询 DoH 并处理主备切换
5. 所有工具函数均经过单元测试验证

---

## 前置依赖

- 任务 1：项目初始化与配置

## 后续依赖

- 任务 3：检测模块实现
- 任务 4：存储层实现
- 任务 5：路由层实现
