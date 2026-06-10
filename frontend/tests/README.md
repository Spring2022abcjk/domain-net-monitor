# 前端测试指南

## 快速测试

### 运行完整自动化测试套件

```bash
cd frontend
npm run test:auto
```

### 测试覆盖范围

1. **构建产物完整性** - 检查关键文件是否存在
2. **index.html 内容** - 验证 HTML 结构和资源引用
3. **路由配置** - 检查所有路由是否正确配置
4. **组件导出** - 验证所有组件正确导出
5. **API 配置** - 检查环境变量配置
6. **动态 import** - 验证懒加载语法正确性
7. **API 可达性** - 测试后端 API 是否响应（可选）

## 部署前检查清单

运行以下命令确保代码质量：

```bash
# 1. 构建
npm run build

# 2. 运行测试
npm run test:auto

# 3. 部署（如果测试通过）
wrangler pages deploy dist/ --project-name domain-monitor-frontend
```

## 测试输出说明

✅ 通过 - 测试项验证成功
❌ 失败 - 测试项验证失败（需要修复）
⚠️ 跳过 - 可选测试项，不影响部署

## 故障排查

### 构建产物缺失
- 运行 `npm run build` 重新构建
- 检查 `dist/` 目录是否生成

### 路由配置失败
- 检查 `src/router/routes.js` 语法
- 确认所有路由都有 `path` 和 `component`

### 组件导出失败
- 确保组件使用 `export default` 或具名导出
- 检查文件路径是否正确

### API 测试失败
- 确认后端服务是否启动
- 检查 `.env.production` 中的 URL 配置
