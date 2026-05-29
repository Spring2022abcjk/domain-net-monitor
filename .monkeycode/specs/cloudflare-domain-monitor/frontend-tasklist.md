# Cloudflare Worker 域名监控平台 - 前端开发主任务清单

## 项目概述

在现有 Worker API 基础上，开发前后端分离的完整 Platform。

**访问地址**: 
- 前端 Pages: https://your-single.your-domain.pages.dev/
- 后端 Worker: https://domain-monitor.varhub.workers.dev/

**部署方式**: Cloudflare Pages（前端） + Cloudflare Worker（后端 API）

---

## 主要任务模块

### 任务 1：Worker 环境变量配置
- 配置 `CLOUDFLARE_API_TOKEN`（管理员认证 Token）
- 配置 `ALLOWED_ORIGINS`（CORS 白名单）
- 更新 wrangler.toml
- 编写环境变量注入说明文档

### 任务 2：KV 存储结构扩展
- 新增 `default_domains` 默认展示域名列表
- 新增 `history:{domain}` 历史记录存储
- 新增 `config` 配置存储
- 新增 `stats` 统计数据存储
- 更新现有 API 配置常量

### 任务 3：CORS 中间件实现
- 动态 CORS 头生成（基于 `ALLOWED_ORIGINS`）
- OPTIONS 预检请求处理
- Vary 头添加（CDN 缓存优化）
- 跨域请求日志记录

### 任务 4：管理员认证 API
- `POST /api/admin/auth/verify` - Token 验证
- `POST /api/admin/auth/logout` - 注销登录（可选）
- `GET /api/admin/config/security` - 查看安全配置
- 鉴权中间件实现（检查 `X-API-Token`）
- 管理员限流豁免逻辑

### 任务 5：域名管理 API
- `GET /api/admin/domains` - 获取所有域名
- `POST /api/admin/domains` - 添加域名
- `DELETE /api/admin/domains/:domain` - 删除域名
- `POST /api/admin/domains/:domain/default` - 设为默认展示
- `DELETE /api/admin/domains/:domain/default` - 取消默认展示

### 任务 6：检测配置 API
- `GET /api/admin/config` - 获取配置
- `PUT /api/admin/config` - 更新配置
- 配置项：刷新频率、限流、历史保留天数、默认域名列表

### 任务 7：DoH 配置 API
- `GET /api/admin/doh` - 获取 DoH 端点
- `PUT /api/admin/doh` - 更新 DoH 端点
- `POST /api/admin/doh/test` - 测试 DoH 端点可用性

### 任务 8：检测操作 API
- `POST /api/admin/detect/single` - 单域名检测
- `POST /api/admin/detect/all` - 批量检测所有域名
- `POST /api/admin/detect/default` - 检测默认域名列表

### 任务 9：历史记录 API
- `GET /api/admin/history` - 查询历史记录
- `DELETE /api/admin/history/:domain` - 删除单域名历史
- `DELETE /api/admin/history` - 清理过期记录
- 历史数据压缩优化（可选）

### 任务 10：统计概览 API
- `GET /api/admin/stats` - 统计数据
- 统计项：总域名数、默认域名数、今日请求数、限流命中次数等
- 统计更新逻辑

### 任务 11：定时检测任务（Cron）
- Worker Cron Trigger 配置
- 定时检测默认域名（12 小时）
- 自动清理过期历史记录
- `wrangler.toml` Cron 配置更新

### 任务 12：前端项目初始化
- 创建 Pages 项目结构
- 配置 Vite（或其他构建工具）
- 配置 Tailwind CSS（CDN 或本地）
- 基础 HTML 模板
- 开发服务器配置

### 任务 13：前端基础组件
- API 请求封装（自动携带 token）
- localStorage 凭据管理
- 路由系统（hash 路由）
- 通用 UI 组件（按钮、输入框、卡片、表格）
- 错误处理与通知

### 任务 14：公开页面 - Dashboard
- Header（Logo、导航、管理登录入口）
- 默认域名卡片列表（网格布局）
- 状态可视化（✅/❌/⚠️）
- 搜索框（单域名查询）
- Footer
- 加载状态与骨架屏

### 任务 15：管理后台 - 登录页
- API 端点输入
- API Token 输入
- 登录表单验证
- Token 验证调用
- 凭据保存与跳转

### 任务 16：管理后台 - 主布局
- Sidebar 导航
- Topbar（用户信息、退出登录）
- 内容区域
- 响应式布局
- 路由守卫（未登录跳转）

### 任务 17：管理后台 - 域名管理页
- 域名列表表格
- 添加域名表单
- 删除确认对话框
- 设为默认展示开关
- 批量操作（可选）

### 任务 18：管理后台 - 检测配置页
- 刷新频率配置（输入框）
- 限流配置（窗口时间、最大请求数）
- 历史保留天数配置
- 默认域名列表管理
- 配置保存与验证

### 任务 19：管理后台 - DoH 配置页
- 主 DoH 端点输入
- 备用 DoH 端点输入
- 端点测试功能
- 测试结果显示（延迟、成功/失败）
- 保存与回滚

### 任务 20：管理后台 - 历史记录页
- 历史记录查询界面
- 域名筛选下拉框
- 时间范围选择器
- 历史记录列表
- 删除功能

### 任务 21：管理后台 - 统计概览页
- 统计数据卡片展示
- 限流命中统计图表（简单）
- 请求量趋势（简单）
- 刷新按钮

### 任务 22：前后端联调
- Pages 配置 API 端点
- Worker CORS 配置验证
- Token 认证流程测试
- 所有 API 端点联调
- 错误场景处理

### 任务 23：部署配置
- Pages 部署配置（`wrangler.toml` 或 Pages Dashboard）
- Worker 环境变量配置
- 自定义域名绑定
- Workers Routes 配置
- 部署脚本编写

### 任务 24：测试与优化
- 公开页面功能测试
- 管理后台功能测试
- API 鉴权测试
- 限流测试
- CORS 测试
- 性能优化（缓存、压缩）
- 移动端适配

---

## 依赖关系

```
阶段 1: 后端基础（任务 1-4）
    ↓
阶段 2: 管理 API（任务 5-11）
    ↓
阶段 3: 前端基础（任务 12-13）
    ↓
阶段 4: 公开页面（任务 14）
    ↓
阶段 5: 管理后台（任务 15-21）
    ↓
阶段 6: 联调部署（任务 22-23）
    ↓
阶段 7: 测试优化（任务 24）
```

---

## 开发优先级

**Phase 1（后端基础，预计 2 天）**：
- 任务 1：Worker 环境变量配置
- 任务 2：KV 存储结构扩展
- 任务 3：CORS 中间件实现
- 任务 4：管理员认证 API

**Phase 2（管理 API，预计 3 天）**：
- 任务 5-11：所有管理 API 端点

**Phase 3（前端基础 + 公开页面，预计 2 天）**：
- 任务 12-13：前端项目初始化 + 基础组件
- 任务 14：公开页面 Dashboard

**Phase 4（管理后台，预计 3 天）**：
- 任务 15-21：管理后台所有页面

**Phase 5（联调部署，预计 1 天）**：
- 任务 22-23：前后端联调 + 部署

**Phase 6（测试优化，预计 1 天）**：
- 任务 24：测试与优化

---

## 验收标准

1. ✅ 公开页面可正常访问，显示默认域名检测结果
2. ✅ 单域名查询功能正常，限流生效
3. ✅ 管理员可通过输入端点 + Token 登录管理后台
4. ✅ 所有管理 API 端点正常工作
5. ✅ DoH 端点可配置并测试
6. ✅ 定时检测自动执行
7. ✅ 历史记录正常存储与清理
8. ✅ 前端界面现代美观，响应式布局
9. ✅ CORS 白名单生效，安全性高
10. ✅ Token 通过环境变量注入，不硬编码

---

## 参考文档

- 需求文档：`.monkeycode/specs/cloudflare-domain-monitor/frontend-requirements.md`
- 现有 API：`src/routes/*.js`
- 现有存储：`src/storage/kv.js`
