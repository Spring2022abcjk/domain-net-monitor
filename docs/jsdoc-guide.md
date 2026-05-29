# JSDoc 类型注释指南

## 项目已配置

- ✅ **类型定义文件**: `src/types.js`
- ✅ **TypeScript 配置**: `tsconfig.json`（用于类型检查）
- ✅ **类型包**: `@cloudflare/workers-types`

## 快速开始

### 1. 导入类型

```javascript
/**
 * @param {import('./types.js').Env} env - 环境变量
 * @param {import('./types.js').DomainResult} result - 检测结果
 */
```

### 2. 使用预定义类型

```javascript
/**
 * @returns {Promise<import('./types.js').APIResponse<import('./types.js').DomainResult>>}
 */
```

### 3. 内联类型注释

```javascript
/**
 * @param {{domain: string, timeout?: number}} options - 选项
 */
```

## 常用类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `Env` | 环境变量 | `@param {Env} env` |
| `DomainResult` | 域名检测结果 | `@returns {DomainResult}` |
| `RecordStatus` | DNS 记录状态 | `@property {RecordStatus} https_rr` |
| `Status` | 状态枚举 | `'ok'\|'partial'\|'no'\|'error'` |
| `APIResponse<T>` | API 响应（泛型） | `APIResponse<DomainResult>` |
| `RateLimitResult` | 限流结果 | `@returns {RateLimitResult}` |
| `Config` | 配置对象 | `@returns {Config}` |
| `Stats` | 统计数据 | `@property {Stats} stats` |
| `CorsHeaders` | CORS 响应头 | `@returns {CorsHeaders}` |

## 运行类型检查

```bash
# 开发模式（不生成文件）
npx tsc --noEmit

# 添加到 npm 脚本
npm run typecheck
```

## VSCode 配置

VSCode 会自动识别 JSDoc 类型注释，提供：
- ✅ 智能提示
- ✅ 参数提示
- ✅ 类型错误下划线

## 示例模板

```javascript
// src/services/example.js

/**
 * 示例服务函数
 * @param {Request} request - 请求对象
 * @param {import('../types.js').Env} env - 环境变量
 * @returns {Promise<import('../types.js').APIResponse<import('../types.js').DomainResult>>}
 */
export async function exampleService(request, env) {
  // 实现...
}
```

## 注意事项

1. **类型定义优先**：新代码先查看 `src/types.js` 是否有定义
2. **泛型响应**：API 响应统一使用 `APIResponse<T>`
3. **可选参数**：使用 `[paramName]` 表示可选
4. **默认值**：使用 `[paramName = defaultValue]`

## 后续计划

- [ ] 任务 2-11：补充所有后端 API 的 JSDoc
- [ ] 任务 12+：前端代码使用 JSDoc
- [ ] 配置 ESLint + `jsdoc` 插件验证注释完整性
