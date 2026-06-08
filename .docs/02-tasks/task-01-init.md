# 任务 1：项目初始化与配置

## 任务目标

创建标准 Wrangler 工程目录结构，完成基础配置文件和全局常量定义。

---

## 子任务列表

### 1.1 创建项目目录结构

创建以下目录和文件：

```
{项目仓库名}/
├── wrangler.toml
└── src/
    ├── config.js
    ├── utils/
    │   └── helper.js
    ├── doh/
    │   └── client.js
    ├── detectors/
    │   ├── https-rr.js
    │   ├── ech.js
    │   ├── ipv6.js
    │   └── index.js
    ├── storage/
    │   └── kv.js
    ├── routes/
    │   ├── domains.js
    │   ├── detect.js
    │   ├── result.js
    │   └── index.js
    └── index.js
```

### 1.2 配置 wrangler.toml

必填配置项：

```toml
name = "domain-monitor"
main = "src/index.js"
compatibility_date = "2024-01-01"
port = 8787

[[kv_namespaces]]
binding = "DOMAIN_MONITOR_KV"
id = "<KV_NAMESPACE_ID>"
preview_id = "<KV_PREVIEW_ID>"
```

**说明**：
- `name`：Worker 名称（需全局唯一）
- `main`：入口文件路径
- `compatibility_date`：兼容日期
- `port`：本地调试端口
- `kv_namespaces`：绑定 KV 命名空间

### 1.3 创建 src/config.js

定义以下全局常量：

| 常量类别 | 常量名 | 说明 |
|---------|-------|------|
| DoH 服务 | `DOH_PRIMARY` | `https://cloudflare-dns.com/dns-query` |
| | `DOH_BACKUP` | `https://dns.google/resolve` |
| DNS 类型 | `DNS_TYPE_HTTPS` | `65`（HTTPS RR） |
| | `DNS_TYPE_AAAA` | `28`（IPv6 记录） |
| 超时设置 | `REQUEST_TIMEOUT` | `5000`（毫秒） |
| 状态枚举 | `STATUS_OK` | `"ok"` |
| | `STATUS_PARTIAL` | `"partial"` |
| | `STATUS_NO` | `"no"` |
| | `STATUS_ERROR` | `"error"` |
| KV 键名 | `KV_KEY_DOMAIN_LIST` | `"domain_list"` |
| | `KV_KEY_RESULT_PREFIX` | `"result:"` |
| 响应头 | `CORS_HEADERS` | 跨域请求头对象 |

---

## 验收标准

1. 目录结构完整，所有文件已创建（文件内容可以为空）
2. `wrangler.toml` 配置完整，KV 绑定已填写
3. `src/config.js` 包含所有必需常量
4. 执行 `wrangler dev` 可正常启动本地调试

---

## 前置依赖

无

## 后续依赖

所有其他任务模块
