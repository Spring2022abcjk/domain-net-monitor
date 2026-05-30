# Cloudflare Domain Monitor

Cloudflare Worker 域名网络特性监控系统

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 运行测试
npm test

# 部署到 Cloudflare
npm run deploy
```

## 开发规范

本项目遵循以下开发规范：

### API 响应格式

所有 API 端点必须使用 `jsonResponse()` 函数，返回统一格式：

```json
{
  "code": 200,
  "data": { ... },
  "msg": "success"
}
```

### 测试代码

- 响应体变量统一使用 `body`
- 访问 data 字段：`body.data.xxx`
- Mock 对象使用 `createMockEnv()` 和 `createMockRequest()`

### 错误处理

- 区分错误类型（400/401/404/409/500）
- 记录详细日志
- 返回用户友好的错误信息

## 预提交检查

提交前运行：

```bash
./scripts/pre-commit-check.sh
```

检查项目：
- API 响应格式
- 测试变量命名
- 单元测试

## 项目结构

```
/workspace
├── src/
│   ├── routes/          # API 路由
│   ├── middleware/      # 中间件（鉴权、限流）
│   ├── storage/         # KV 存储操作
│   ├── utils/           # 工具函数
│   └── types.js         # JSDoc 类型定义
├── tests/
│   ├── unit/            # 单元测试
│   ├── integration/     # 集成测试
│   └── support/         # 测试辅助函数
├── docs/                # 项目文档
├── scripts/             # 工具脚本
└── .monkeycode/         # 项目 specs 和任务文档
```

## 相关文档

- [API 响应规范](docs/api-response-standards.md)
- [测试代码规范](docs/test-coding-standards.md)
- [错误处理规范](docs/error-handling-standards.md)
- [代码审查清单](docs/code-review-checklist.md)
- [新开发者指南](docs/onboarding-guide.md)

## 许可证

MIT
