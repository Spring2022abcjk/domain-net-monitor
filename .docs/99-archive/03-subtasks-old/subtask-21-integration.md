# 子任务 21：前后端联调

**状态**: 🔴 未启动  
**优先级**: 高  
**预计工时**: 2 小时  
**创建日期**: 2026-06-05  
**更新日期**: 2026-06-05  
**前置依赖**: 任务 20（统计概览页面）✅，任务 1-20（所有前后端功能）✅  
**后续依赖**: 任务 22（部署配置）

---

## 任务目标

完成前后端完整联调测试，验证所有 API 与前端页面的集成，确保数据流正确、错误处理完善、用户体验流畅。

### 核心需求

1. **API 连通性测试**: 验证所有前端 API 调用能正确连接到后端 Worker
2. **数据一致性验证**: 确保前端展示数据与后端返回数据一致
3. **错误处理测试**: 验证网络错误、认证失败、API 错误等场景的用户提示
4. **认证流程测试**: 验证登录、Token 存储、路由守卫、鉴权失败等场景
5. **CRUD 功能测试**: 验证域名管理、配置管理、历史记录等功能的完整流程
6. **性能优化**: 检查加载状态、缓存策略、重复请求等问题

---

## 联调范围

### 公开页面（无需认证）

| 页面 | API | 验证点 |
|------|-----|--------|
| **PublicDashboard** | `GET /api/public/domains` | 默认域名列表展示、状态颜色、状态图标、搜索功能、空状态 |
| **DomainCard** | 无 | DNS 状态图标、到期时间格式化、状态颜色（成功/失败/检测中） |

### 管理后台（需要认证）

#### 认证模块

| 页面/功能 | API | 验证点 |
|-----------|-----|--------|
| **Login** | `POST /api/admin/auth/login` | Token 验证、JWT 解析、exp 检查、localStorage 存储、错误提示 |
| **路由守卫** | 无 | 未登录跳转登录页、Token 过期处理、logout 功能 |
| **Topbar** | 无 | 用户名显示（JWT 解析）、登出功能、Token 过期检测 |

#### 域名管理模块

| 功能 | API | 验证点 |
|------|-----|--------|
| **加载域名列表** | `GET /api/admin/domains` | 列表展示、默认域名标记、状态显示 |
| **添加域名** | `POST /api/admin/domains` | 表单验证、成功提示、列表刷新 |
| **删除域名** | `DELETE /api/admin/domains/:domain` | 确认对话框、成功提示、列表刷新 |
| **切换默认状态** | `POST /api/admin/domains/:domain/default` | Toggle 状态同步、成功提示 |
| **批量删除** | `DELETE /api/admin/domains` | 多选功能、确认对话框、成功提示 |

#### 配置管理模块

| 功能 | API | 验证点 |
|------|-----|--------|
| **加载配置** | `GET /api/admin/config` | 所有配置项正确显示、数值类型转换 |
| **保存检测配置** | `POST /api/admin/config/detection` | 表单验证、成功提示、配置生效 |
| **保存历史配置** | `POST /api/admin/config/history` | 表单验证、成功提示、配置生效 |
| **保存 DoH 配置** | `POST /api/admin/config/doh` | 数组解析、成功提示、配置生效 |
| **保存限流配置** | `POST /api/admin/config/ratelimit` | 数值验证、成功提示、配置生效 |
| **测试 DoH** | `POST /api/admin/doh/test` | 实时返回结果、成功/失败提示 |
| **恢复默认** | 无（前端功能） | 配置重置、确认对话框 |

#### 历史记录模块

| 功能 | API | 验证点 |
|------|-----|--------|
| **加载历史** | `GET /api/admin/history` | 列表展示、时间格式化、状态颜色 |
| **域名筛选** | `GET /api/admin/history?domain=xxx` | 筛选正确、URL 参数同步 |
| **时间筛选** | `GET /api/admin/history?from=xxx&to=xxx` | 日期范围筛选、URL 参数同步 |
| **导出 CSV** | `GET /api/admin/history/export` | CSV 格式正确、文件下载 |
| **清理历史** | `DELETE /api/admin/history` | 确认对话框、成功提示 |

#### 统计概览模块

| 功能 | API | 验证点 |
|------|-----|--------|
| **加载统计** | `GET /api/admin/stats` | 8 个统计卡片正确显示、数据格式化 |
| **刷新数据** | `GET /api/admin/stats` | 数据更新、成功提示、错误处理 |

---

## 测试场景

### 场景 1: 完整登录流程

```
1. 访问 /#/login
2. 输入正确 Token → 验证成功 → 跳转到 /#/admin/dashboard
3. 检查 localStorage 中 token 是否存在
4. 访问 /#/admin/domains → 检查请求头是否携带 Token
5. 点击登出 → 清除 localStorage → 跳转到 /#/login
```

### 场景 2: Token 过期处理

```
1. 登录成功后，手动修改 localStorage 中 token 的 exp 为过期时间
2. 访问任意管理页面 → 自动检测到过期 → 跳转到登录页
3. 显示提示 "Token 已过期，请重新登录"
```

### 场景 3: 域名管理完整流程

```
1. 访问 /#/admin/domains
2. 点击"添加域名" → 输入 example.com → 提交
   - 验证：列表中出现新域名
3. 点击 Toggle 切换默认状态
   - 验证：Toggle 状态更新、默认域名数统计更新
4. 点击"删除" → 确认
   - 验证：列表中域名消失
5. 批量选择多个域名 → 批量删除
   - 验证：所有选中域名被删除
```

### 场景 4: 配置管理完整流程

```
1. 访问 /#/admin/config
2. 修改检测间隔为 6 小时 → 保存
3. 切换到历史配置 Tab → 修改保留天数为 14 天 → 保存
4. 切换到 DoH 配置 Tab → 添加新的 DoH 服务器 → 测试 → 保存
5. 切换到限流配置 Tab → 修改限流参数 → 保存
6. 刷新页面 → 验证所有配置已保存
```

### 场景 5: 历史记录筛选和导出

```
1. 访问 /#/admin/history
2. 选择域名筛选 → 验证筛选结果
3. 选择时间范围 → 验证筛选结果
4. 点击"导出 CSV" → 验证 CSV 文件格式
5. 点击"清理历史" → 确认 → 验证列表清空
```

### 场景 6: 网络错误处理

```
1. 断开网络或修改 API 地址为无效地址
2. 访问任意管理页面 → 显示网络错误提示
3. 点击操作按钮 → 显示"网络连接失败，请检查网络"
```

### 场景 7: API 错误处理

```
1. 使用无效 Token 登录 → 显示 "Token 无效"
2. 添加重复域名 → 显示 "域名已存在"
3. 删除不存在的域名 → 显示 "域名不存在"
4. 保存无效配置（负数、超范围） → 显示验证错误
```

---

## 测试工具

### curl 测试脚本

```bash
#!/bin/bash
# 前后端联调测试脚本

BASE_URL="http://localhost:5173"
API_URL="http://localhost:8787"
TOKEN="your-test-token"

# 测试登录 API
echo "=== 测试登录 API ==="
curl -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}" | jq

# 测试获取域名列表
echo "=== 测试获取域名列表 ==="
curl -X GET "$API_URL/api/admin/domains" \
  -H "X-API-Token: $TOKEN" | jq

# 测试添加域名
echo "=== 测试添加域名 ==="
curl -X POST "$API_URL/api/admin/domains" \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "test.example.com"}' | jq

# 测试获取配置
echo "=== 测试获取配置 ==="
curl -X GET "$API_URL/api/admin/config" \
  -H "X-API-Token: $TOKEN" | jq

# 测试获取统计数据
echo "=== 测试获取统计数据 ==="
curl -X GET "$API_URL/api/admin/stats" \
  -H "X-API-Token: $TOKEN" | jq
```

### 浏览器控制台测试

```javascript
// 检查 Token 存储
console.log('Token:', localStorage.getItem('dm_token'))
console.log('API Endpoint:', localStorage.getItem('dm_api_endpoint'))

// 解析 JWT
const token = localStorage.getItem('dm_token')
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]))
  console.log('JWT Payload:', payload)
  console.log('Token 过期时间:', new Date(payload.exp * 1000))
}

// 测试 API 调用
fetch('http://localhost:8787/api/admin/stats', {
  headers: {
    'X-API-Token': localStorage.getItem('dm_token')
  }
}).then(r => r.json()).then(console.log)
```

---

## 验收标准

### 功能验收

- [ ] 登录功能正常（正确/错误 Token 都能正确处理）
- [ ] Token 过期自动跳转登录页
- [ ] 所有管理页面能正常加载数据
- [ ] 域名 CRUD 功能完整（添加、删除、切换默认、批量删除）
- [ ] 配置管理功能完整（读取、保存、测试 DoH、恢复默认）
- [ ] 历史记录功能完整（列表、筛选、导出、清理）
- [ ] 统计概览功能完整（8 个卡片、刷新数据）
- [ ] 公开 Dashboard 正常展示默认域名

### 错误处理验收

- [ ] 网络错误显示友好提示
- [ ] API 错误（400/401/403/404/500）显示对应提示
- [ ] 表单验证错误显示具体字段错误
- [ ] Token 过期自动清除并跳转登录
- [ ] 删除操作有确认对话框

### 性能验收

- [ ] 页面加载时间 < 2 秒
- [ ] API 响应时间 < 500ms
- [ ] 列表滚动流畅（无卡顿）
- [ ] Loading 状态显示正确
- [ ] 无重复请求（无 console 警告）

### 兼容性验收

- [ ] Chrome 120+ 正常
- [ ] Firefox 120+ 正常
- [ ] Safari 17+ 正常
- [ ] 移动端浏览器正常（响应式）

---

## 测试检查清单

### 公开页面

- [ ] `/#/` - 公开 Dashboard
  - [ ] 域名列表展示
  - [ ] DNS 状态图标（✅/❌/⏳）
  - [ ] 状态颜色（绿/红/灰）
  - [ ] 搜索功能
  - [ ] 空状态展示
  - [ ] 响应式布局

### 管理后台 - 认证

- [ ] `/#/login` - 登录页
  - [ ] Token 输入框
  - [ ] 登录按钮
  - [ ] 错误提示
  - [ ] 成功后跳转
  - [ ] Token 过期检测

### 管理后台 - 仪表盘

- [ ] `/#/admin/dashboard`
  - [ ] 欢迎信息
  - [ ] 快捷入口
  - [ ] 系统状态

### 管理后台 - 域名管理

- [ ] `/#/admin/domains`
  - [ ] 域名列表
  - [ ] 添加域名 Modal
  - [ ] 删除确认
  - [ ] Toggle 切换
  - [ ] 批量操作
  - [ ] 搜索功能

### 管理后台 - 系统配置

- [ ] `/#/admin/config`
  - [ ] 检测配置 Tab
  - [ ] 历史配置 Tab
  - [ ] DoH 配置 Tab
  - [ ] 限流配置 Tab
  - [ ] 保存功能
  - [ ] 测试 DoH
  - [ ] 恢复默认

### 管理后台 - 历史记录

- [ ] `/#/admin/history`
  - [ ] 历史列表
  - [ ] 域名筛选
  - [ ] 时间筛选
  - [ ] CSV 导出
  - [ ] 清理历史

### 管理后台 - 统计概览

- [ ] `/#/admin/stats`
  - [ ] 核心指标卡片（4 个）
  - [ ] 检测统计卡片（2 个）
  - [ ] 系统信息卡片（2 个）
  - [ ] 刷新数据

---

## 依赖关系

### 前置依赖
- ✅ 任务 1-11: 后端 API 全部完成
- ✅ 任务 12-20: 前端全部完成
- ✅ 任务 15: 认证功能
- ✅ 任务 16: 路由守卫

### 后续依赖
- 任务 22: 部署配置
- 任务 23: 测试与优化

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| CORS 配置错误 | 前端无法调用 API | 检查 Worker 环境变量 ALLOWED_ORIGINS |
| Token 格式不一致 | 认证失败 | 确认 JWT 格式和 exp 字段 |
| 数据类型不匹配 | 前端解析错误 | 后端返回统一格式字符串 |
| 网络延迟 | 用户体验差 | 添加 Loading 状态和超时处理 |
| 浏览器缓存 | 配置不生效 | 添加 Cache-Control 头 |

---

## 下一步

1. 启动前端开发服务器 (`npm run dev`)
2. 启动后端 Worker (`wrangler dev`)
3. 配置 CORS 和环境变量
4. 执行登录流程测试
5. 逐个页面验证功能
6. 记录问题并修复
7. 回归测试

---

## 相关文件

### 前端文件
- `frontend/src/pages/Login.js` - 登录页
- `frontend/src/pages/PublicDashboard.js` - 公开 Dashboard
- `frontend/src/pages/admin/AdminLayout.js` - 管理后台布局
- `frontend/src/pages/admin/AdminDashboard.js` - 仪表盘
- `frontend/src/pages/admin/AdminDomains.js` - 域名管理
- `frontend/src/pages/admin/AdminConfig.js` - 系统配置
- `frontend/src/pages/admin/AdminHistory.js` - 历史记录
- `frontend/src/pages/admin/AdminStats.js` - 统计概览
- `frontend/src/utils/api.js` - API 工具
- `frontend/src/utils/auth.js` - 认证工具
- `frontend/src/router/index.js` - 路由

### 后端文件
- `backend/src/routes/admin/auth.js` - 认证 API
- `backend/src/routes/admin/domains.js` - 域名 API
- `backend/src/routes/admin/config.js` - 配置 API
- `backend/src/routes/admin/doh.js` - DoH API
- `backend/src/routes/admin/detect.js` - 检测 API
- `backend/src/routes/admin/history.js` - 历史 API
- `backend/src/routes/admin/stats.js` - 统计 API
- `backend/src/routes/public/domains.js` - 公开 API
- `backend/src/middleware/cors.js` - CORS 中间件
- `backend/src/middleware/auth.js` - 认证中间件

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-06-05 | 1.0 | 初始版本 | AI Assistant |

---

## 联调环境配置

### 本地开发环境

```bash
# 后端环境变量
export CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"
export ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"

# 启动后端
cd /workspace
wrangler dev

# 启动前端
cd /workspace/frontend
npm run dev
```

### 环境变量配置

| 变量 | 后端值 | 前端值 |
|------|--------|--------|
| API 地址 | - | `http://localhost:8787` |
| Token | Cloudflare API Token | 同上（登录时输入） |
| CORS | `ALLOWED_ORIGINS` | - |

---

**任务 21 完成标准**: 所有功能测试通过，无 P0/P1 级别 bug，用户体验流畅
