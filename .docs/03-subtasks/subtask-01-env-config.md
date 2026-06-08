# 子任务 1：Worker 环境变量配置

## 任务目标

通过 `wrangler secret` 将 Token 和 CORS 白名单注入到 Worker 运行时环境。

---

## 子任务步骤

### 1.1 更新 wrangler.toml

添加开发环境配置：

```toml
name = "domain-monitor"
main = "src/index.js"
compatibility_date = "2024-01-01"

# 开发环境变量
[vars]
ALLOWED_ORIGINS = "*"

# KV 绑定
[[kv_namespaces]]
binding = "DOMAIN_MONITOR_KV"
id = "YOUR_KV_NAMESPACE_ID"
# 注意：不要用真实 ID 提交，部署时请替换为实际 KV ID

# 生产环境配置
[env.production]
# ALLOWED_ORIGINS 和 CLOUDFLARE_API_TOKEN 通过 wrangler secret 注入

[env.production.kv_namespaces]
binding = "DOMAIN_MONITOR_KV"
id = "YOUR_PRODUCTION_KV_NAMESPACE_ID"
# 注意：不要用真实 ID 提交，部署时请替换为实际 KV ID
```

**文件**: `/workspace/wrangler.toml`

### 1.2 生成随机 Token

使用以下命令生成随机 Token：

```bash
openssl rand -hex 32
# 输出示例：a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### 1.3 注入环境变量

执行以下命令注入 Token 和 CORS 白名单：

```bash
# 注入 API Token（生产环境）
wrangler secret put CLOUDFLARE_API_TOKEN
# 粘贴生成的 token

# 注入 CORS 白名单（生产环境）
wrangler secret put ALLOWED_ORIGINS
# 输入：https://your-single.your-domain.pages.dev

# 开发环境注入（可选）
wrangler secret put CLOUDFLARE_API_TOKEN --env dev
wrangler secret put ALLOWED_ORIGINS --env dev
# 输入：* （允许所有）
```

### 1.4 验证环境变量

在 Worker 代码中添加验证：

```javascript
// src/index.js
export default {
  async fetch(request, env) {
    // 检查环境变量是否配置
    if (!env.CLOUDFLARE_API_TOKEN) {
      console.warn('CLOUDFLARE_API_TOKEN not configured');
    }
    if (!env.ALLOWED_ORIGINS) {
      console.warn('ALLOWED_ORIGINS not configured');
    }
    
    // ...其他逻辑
  }
};
```

### 1.5 编写配置文档

创建配置说明文档：

**文件**: `/workspace/docs/environment-setup.md`

内容应包括：
- 需要的环境变量列表
- 生成 Token 的命令
- 注入命令
- 开发环境 vs 生产环境配置差异

---

## 环境变量说明

| 变量名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `CLOUDFLARE_API_TOKEN` | Secret | ✅ | 管理员认证 Token | `YOUR_CLOUDFLARE_API_TOKEN...` |
| `ALLOWED_ORIGINS` | Secret | ✅ | CORS 白名单（逗号分隔） | `https://a.com,https://b.com` |
| `ALLOWED_ORIGINS` | Var | ⚠️ | 开发环境可设为 `*` | `*` |

**安全建议**：
- 生产环境务必设置具体的域名，不要使用 `*`
- Token 定期更换（3-6 个月）
- 不要将 Token 提交到 Git

---

## 验收标准

1. ✅ `wrangler dev` 启动无报错
2. ✅ `wrangler deploy` 部署成功
3. ✅ 环境变量在 Worker 中可访问
4. ✅ 开发环境 `ALLOWED_ORIGINS=*`
5. ✅ 生产环境 `ALLOWED_ORIGINS=https://your-single.your-domain.pages.dev`

---

## 相关文件

- `wrangler.toml` - Wrangler 配置
- `src/index.js` - Worker 入口（验证逻辑）
- `docs/environment-setup.md` - 配置说明文档

---

## 后续依赖

- 任务 3：CORS 中间件实现（需要使用 `ALLOWED_ORIGINS`）
- 任务 4：管理员认证 API（需要使用 `CLOUDFLARE_API_TOKEN`）
