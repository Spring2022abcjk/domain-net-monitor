# 配置文件详解 - 公开模板 + 个人配置分离

**创建日期**: 2026-06-12  
**安全原则**: KV ID、域名、Account ID 都是敏感信息

---

## 📁 配置文件结构

```
workspace/
├── wrangler.toml              # Worker 公开模板（占位符）✅ 提交
├── wrangler.local.toml        # Worker 个人配置（真实值）❌ 不提交
│
├── .dev.vars.example          # 开发 env 模板（占位符）✅ 提交
├── .dev.vars                  # 开发 env 真实值 ❌ 不提交
│
├── frontend/
│   ├── wrangler.toml          # Pages 公开模板（占位符）✅ 提交
│   ├── wrangler.local.toml    # Pages 个人配置（真实值）❌ 不提交
│   ├── .env.example           # Vite 模板（占位符）✅ 提交
│   └── .env                   # Vite 真实值 ❌ 不提交
│
└── .gitignore                 # Git 排除规则 ✅ 提交
```

---

## 🔐 敏感信息分类

| 信息类型 | 示例 | 敏感级别 | 处理方式 |
|---------|------|---------|---------|
| KV ID | `abc123def456...` | 🔴 高 | `.local.toml` |
| Account ID | `xyz789uvw012...` | 🔴 高 | `.dev.vars` |
| API Token | `glpat-...` | 🔴 高 | `.dev.vars` |
| 自定义域名 | `your-worker.your-domain.workers.dev` | 🟡 中 | `.local.toml` |
| API 端点 URL | `https://...` | 🟡 中 | `.env` |

---

## 📝 文件说明

### wrangler.toml（公开模板）

```toml
# 占位符，可安全提交
[[kv_namespaces]]
id = "YOUR_KV_ID_HERE"
```

### wrangler.local.toml（个人配置）

```toml
# 真实值，不提交
kv_id = "YOUR_KV_ID_HERE"
account_id = "YOUR_ACCOUNT_ID_HERE"
worker_domain = "your-worker.your-domain.workers.dev"
```

---

## 🚀 使用流程

### 新开发者第一次使用

```bash
# 1. 克隆项目
git clone <repo>

# 2. 复制个人配置模板
cp wrangler.local.toml.example wrangler.local.toml
cp .dev.vars.example .dev.vars
cp frontend/wrangler.local.toml.example frontend/wrangler.local.toml
cp frontend/.env.example frontend/.env

# 3. 编辑真实值
# 编辑上述 .local 和 .env 文件

# 4. 启动开发
wrangler dev
cd frontend && npm run dev
```

