# 环境变量配置指南

本文档说明如何配置 Cloudflare Worker 域名监控平台的环境变量。

## 环境变量列表

| 变量名 | 类型 | 环境 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|------|
| `ALLOWED_ORIGINS` | Var | 开发 | ⚠️ | CORS 白名单（开发环境允许所有） | `*` |
| `ALLOWED_ORIGINS` | Secret | 生产 | ✅ | CORS 白名单（逗号分隔） | `https://your-single.your-domain.pages.dev` |
| `ADMIN_API_TOKEN` | Secret | 生产 | ✅ | 管理员登录 Token（用户登录后台时填写） | `adm_xxx` |
| `CLOUDFLARE_API_TOKEN` | 环境变量 | 本机 | ✅ | wrangler CLI 部署凭证（cfat_xxx 格式） | `cfat_xxx` |

## 生成 Token

### Cloudflare API Token（部署用）

1. 访问 https://dash.cloudflare.com/profile/api-tokens
2. 创建自定义 Token，权限：Workers Scripts: Edit + KV Storage: Edit + Cloudflare Pages: Edit
3. 复制 `cfat_xxx` 格式的 Token，设为本机环境变量 `CLOUDFLARE_API_TOKEN`

### 管理员登录 Token（用户填写的密码）

管理员 Token 可以是任意字符串，供用户登录后台时在 Token 字段填写。生成方式：

```bash
openssl rand -hex 32
```

## 注入环境变量

### 开发环境

开发环境只需配置 `ALLOWED_ORIGINS=*`（已写入 `wrangler.toml`），无需注入 secrets。

```bash
# 启动开发服务器
npm run dev
```

### 生产环境

#### 步骤 1：注入 CORS 白名单

```bash
wrangler secret put ALLOWED_ORIGINS --env production
```

输入允许的域名（逗号分隔）：
```
https://your-single.your-domain.pages.dev
```

#### 步骤 2：注入管理员登录 Token

```bash
wrangler secret put ADMIN_API_TOKEN --env production
```

输入管理员 Token（用户登录后台时填写）：
```
adm_89277b034e74e28002bce3b35916cb066cd1f364469d9324
```

#### 步骤 3：部署到生产环境

```bash
wrangler deploy -c wrangler.local.toml
```

## 验证配置

### 检查环境变量是否生效

部署后，访问 Worker 日志查看环境变量：

```bash
wrangler tail --env production
```

应该看到：
```
CLOUDFLARE_API_TOKEN configured: true
ALLOWED_ORIGINS configured: https://your-single.your-domain.pages.dev
```

### 测试 CORS 配置

```bash
# 测试允许的 Origin
curl -v -X OPTIONS https://domain-monitor.varhub.workers.dev/api/admin/config \
  -H "Origin: https://your-single.your-domain.pages.dev" \
  2>&1 | grep -i "access-control"

# 应该看到：
# Access-Control-Allow-Origin: https://your-single.your-domain.pages.dev
```

```bash
# 测试不允许的 Origin
curl -v -X OPTIONS https://domain-monitor.varhub.workers.dev/api/admin/config \
  -H "Origin: https://evil.com" \
  2>&1 | grep -i "access-control"

# 应该看不到 Access-Control-Allow-Origin 头
```

## 安全建议

1. **定期更换 Token**：建议每 3-6 个月更换一次
2. **不要提交到 Git**：Token 只通过 `wrangler secret` 注入，不要写入代码
3. **限制 CORS 白名单**：生产环境不要使用 `*`，只允许特定域名
4. **使用环境变量**：所有敏感配置都通过环境变量注入

## 故障排查

### 问题 1：CORS 错误

**症状**：前端收到 CORS 错误，无法访问 API

**解决**：
1. 检查 `ALLOWED_ORIGINS` 是否正确配置
2. 确认前端域名与白名单完全匹配（包括 `https://`）
3. 检查 Worker 是否重新部署

### 问题 2：Token 验证失败

**症状**：管理 API 返回 401 Unauthorized

**解决**：
1. 检查 `CLOUDFLARE_API_TOKEN` 是否正确注入
2. 确认前端请求头 `X-API-Token` 与 Token 一致
3. 检查 Token 是否有空格或换行

### 问题 3：开发环境无法访问

**症状**：`npm run dev` 启动后无法访问

**解决**：
1. 确认 `ALLOWED_ORIGINS=*` 已配置
2. 检查端口 8787 是否被占用
3. 尝试重启开发服务器

## 相关文件

- `wrangler.toml` - Wrangler 配置
- `src/index.js` - Worker 入口（环境变量验证）
