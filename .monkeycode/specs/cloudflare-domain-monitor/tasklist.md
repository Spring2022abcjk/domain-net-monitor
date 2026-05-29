# Cloudflare Worker 域名网络特性监控项目 - 主任务清单

## 项目概述

基于 Cloudflare Worker + Wrangler 工程化开发，实现域名网络特性自动化监控。

---

## 主要任务模块

### 1. 项目初始化与配置
- 创建 Wrangler 工程目录结构
- 配置 `wrangler.toml`（Worker 名称、KV 绑定、运行参数）
- 创建 `src/config.js` 全局常量配置

### 2. 工具层实现
- `utils/helper.js`：域名清洗、fetch 封装、JSON 响应构造、跨域处理
- `doh/client.js`：主备双节点 DoH 查询封装

### 3. 检测模块实现
- `detectors/https-rr.js`：HTTPS RR 记录检测（TYPE 65）
- `detectors/ech.js`：ECH 能力检测（DNS + TLS 握手）
- `detectors/ipv6.js`：IPv6 服务检测（AAAA 记录 + 连通性）
- `detectors/index.js`：检测方法聚合导出

### 4. 存储层实现
- `storage/kv.js`：KV 数据读写封装（域名列表 + 检测结果）

### 5. 路由层实现
- `routes/domains.js`：域名管理接口（4 个 API）
- `routes/detect.js`：检测任务接口（2 个 API）
- `routes/result.js`：结果查询接口（2 个 API）
- `routes/index.js`：路由聚合分发

### 6. 入口与集成
- `src/index.js`：Worker 入口文件，请求分发与异常处理
- 整体联调测试

### 7. 部署与验证
- 配置 KV Namespace ID
- 部署至 Cloudflare Worker
- 线上接口验证与日志排查

---

## 参考文档

- 需求文档：`/workspace/demand.md`
