# 任务 7：部署与验证

## 任务目标

完成 Cloudflare Worker 的线上部署，配置 KV Namespace，验证线上环境功能正常。

---

## 子任务列表

### 7.1 获取 KV Namespace ID

#### 7.1.1 创建 KV Namespace

执行命令：
```bash
wrangler kv:namespace create "DOMAIN_MONITOR_KV"
```

输出示例：
```bash
✍️ Creating namespace with title "DOMAIN_MONITOR_KV"
✨ Success!
  Add the following to your wrangler.toml:

  [[kv_namespaces]]
  binding = "DOMAIN_MONITOR_KV"
  id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

#### 7.1.2 更新 wrangler.toml

将获取到的 `id` 填入配置：

```toml
[[kv_namespaces]]
binding = "DOMAIN_MONITOR_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

#### 7.1.3 （可选）创建 Preview 环境

本地调试使用单独的 KV：
```bash
wrangler kv:namespace create "DOMAIN_MONITOR_KV" --preview
```

---

### 7.2 部署 Worker

#### 7.2.1 执行部署

```bash
wrangler deploy
```

输出示例：
```bash
Your worker has no changes, so there is nothing to deploy.
```

或
```bash
✨ Success! Uploaded worker "domain-monitor"
```

#### 7.2.2 获取线上地址

部署成功后，Worker 访问地址为：
```
https://domain-monitor.<your-subdomain>.workers.dev
```

---

### 7.3 线上接口验证

#### 7.3.1 基础接口测试

使用 curl 或 Postman 测试：

**获取域名列表**：
```bash
curl https://domain-monitor.<subdomain>.workers.dev/api/domains
```

**追加单个域名**：
```bash
curl -X POST https://domain-monitor.<subdomain>.workers.dev/api/domains/add \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'
```

**单域名检测**：
```bash
curl -X POST https://domain-monitor.<subdomain>.workers.dev/api/detect/single \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'
```

**查询结果**：
```bash
curl -X POST https://domain-monitor.<subdomain>.workers.dev/api/result/single \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'
```

#### 7.3.2 验证检测结果准确性

使用已知特性的域名进行测试：

| 域名 | 预期 HTTPS RR | 预期 ECH | 预期 IPv6 |
|------|--------------|----------|----------|
| `cloudflare.com` | ok | ok | ok |
| `google.com` | ok | no | ok |
| 普通域名 | no | no | no |

---

### 7.4 日志排查

#### 7.4.1 查看实时日志

使用 `wrangler tail` 查看线上日志：

```bash
wrangler tail
```

#### 7.4.2 常见错误排查

| 错误现象 | 可能原因 | 排查方法 |
|---------|---------|---------|
| KV 读取失败 | KV 绑定错误 | 检查 `wrangler.toml` 中的 `id` |
| DoH 超时 | 网络问题 | 查看日志中的错误堆栈 |
| 404 错误 | 路由未匹配 | 检查请求路径是否正确 |
| CORS 错误 | 跨域头缺失 | 检查 `helper.js` 中的响应头 |

---

## 验收标准

1. Worker 成功部署至 Cloudflare
2. KV Namespace 正确绑定
3. 所有 API 接口在线上环境正常工作
4. 检测结果准确（与已知域名特性一致）
5. 能正常查看线上日志

---

## 前置依赖

- 任务 6：入口与集成

## 后续依赖

无（最终任务）
