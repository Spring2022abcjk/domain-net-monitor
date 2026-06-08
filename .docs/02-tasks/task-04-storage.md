# 任务 4：存储层实现

## 任务目标

实现 KV 数据读写封装，提供域名列表和检测结果的持久化存储能力。

---

## 子任务列表

### 4.1 实现 storage/kv.js

#### 4.1.1 KV 绑定引入

从环境变量获取 KV 绑定：
```javascript
// 在 Worker 中通过 global 或 module 注入
const kv = DOMAIN_MONITOR_KV;
```

#### 4.1.2 域名列表操作

**读取域名列表** `getDomainList()`

功能：
- 从 KV 读取 `domain_list` 键
- 解析 JSON 字符串为数组

返回值：
- 成功：字符串数组 `["a.com", "b.com"]`
- 列表不存在：返回空数组 `[]`
- 解析失败：抛出错误

**写入域名列表** `setDomainList(domains)`

功能：
- 接收字符串数组
- 序列化为 JSON 字符串
- 写入 KV 的 `domain_list` 键

参数：
- `domains`：域名数组，如 `["a.com", "b.com"]`

#### 4.1.3 单域名追加 `addDomain(domain)`

功能：
- 读取现有域名列表
- 检查域名是否已存在（去重）
- 追加新域名并写回 KV

参数：
- `domain`：单个域名（字符串）

返回值：
- `true`：成功追加（原不存在）
- `false`：域名已存在，无需追加

#### 4.1.4 单域名删除 `removeDomain(domain)`

功能：
- 读取现有域名列表
- 移除指定域名
- 写回 KV

参数：
- `domain`：单个域名（字符串）

返回值：
- `true`：成功删除
- `false`：域名不存在，无需删除

#### 4.1.5 检测结果操作

**读取单域名结果** `getResult(domain)`

功能：
- 构造键名：`result:{域名}`
- 从 KV 读取并解析 JSON

返回值：
- 成功：检测结果对象
- 不存在：返回 `null`

**写入单域名结果** `setResult(domain, result)`

功能：
- 构造键名：`result:{域名}`
- 将检测结果写入 KV

参数：
- `domain`：域名（字符串）
- `result`：检测结果对象（含 `domain`、`timestamp`、`https_rr`、`ech`、`ipv6`）

**批量读取结果** `getAllResults()`

功能：
- 读取 `domain_list` 获取所有域名
- 遍历读取每个域名的检测结果
- 返回结果数组

返回值：
- 结果对象数组，每个对象包含域名和最新检测结果

---

## 验收标准

1. `getDomainList()` 和 `setDomainList()` 能正确读写域名列表
2. `addDomain()` 具备去重功能
3. `removeDomain()` 能正确删除域名
4. `getResult()` 和 `setResult()` 能正确读写单域名结果
5. `getAllResults()` 能批量读取所有结果
6. 所有 KV 操作都有适当的错误处理

---

## 前置依赖

- 任务 1：项目初始化与配置
- 任务 2：工具层实现

## 后续依赖

- 任务 5：路由层实现
- 任务 6：入口与集成
