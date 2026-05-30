# 代码审查清单

**版本**: 1.0.0  
**生效日期**: 2026-05-29  
**适用范围**: 所有代码提交

---

## 📋 API 开发

### 响应格式

- [ ] 所有端点使用 `jsonResponse()` 函数
- [ ] 没有直接使用 `new Response(JSON.stringify(...))`
- [ ] 响应格式符合 `{ code, data, msg }` 结构
- [ ] 错误响应的 status code 与 code 字段一致

### 错误处理

- [ ] 区分错误类型（400/401/404/409/500）
- [ ] JSON 解析错误单独处理
- [ ] 记录详细日志（`console.error`）
- [ ] 错误信息用户友好
- [ ] 不泄露敏感信息（Token、密码等）

### 代码质量

- [ ] JSDoc 注释完整
- [ ] 函数有参数和返回值类型注释
- [ ] 没有 `console.log` 调试代码
- [ ] 文件大小合理（< 500 行）

---

## 🧪 测试开发

### 变量命名

- [ ] 响应体变量统一使用 `body`
- [ ] 访问 data 字段使用 `body.data.xxx`
- [ ] 不使用 `config` 或 `response` 作为变量名

### Mock 对象

- [ ] 使用 `createMockEnv()` 创建环境
- [ ] 使用 `createMockRequest()` 创建请求
- [ ] 从 `tests/support/test-helpers.js` 导入

### 测试覆盖

- [ ] 覆盖正常场景
- [ ] 覆盖边界场景
- [ ] 覆盖错误场景
- [ ] 测试有权验证（无 Token 返回 401）
- [ ] 测试幂等性（重复操作行为一致）

### 测试代码质量

- [ ] 测试代码有 JSDoc 注释
- [ ] 断言信息描述清晰
- [ ] 测试套件命名规范
- [ ] 没有重复的测试代码

---

## 📝 文档

### 代码注释

- [ ] 复杂逻辑有注释说明
- [ ] 函数有清晰的 JSDoc
- [ ] 没有注释掉的代码块

### 提交信息

- [ ] 提交信息清晰描述改动
- [ ] 包含任务编号（如果有）
- [ ] 列出主要变更点

---

## ✅ 预提交检查

### 运行检查

- [ ] 运行 `./scripts/pre-commit-check.sh`
- [ ] 所有检查项通过
- [ ] 单元测试 100% 通过

### 检查项目

```bash
# API 响应格式
grep -rn "new Response(JSON.stringify" src/routes/admin/*.js | grep -v "handleOptionsRequest"
# 应该返回 0 个结果

# 测试代码命名
grep -E "const (config|response) = await.*json\(\)" tests/integration/*.test.js
# 应该返回 0 个结果

# 测试访问模式
grep -E "assert\(.*config\.\(data\.)*" tests/integration/*.test.js
# 应该返回 0 个结果
```

---

## 🔍 快速检查命令

```bash
# 1. 运行预提交检查
./scripts/pre-commit-check.sh

# 2. 检查 API 响应格式
grep -rn "new Response(JSON.stringify" src/routes/admin/*.js

# 3. 检查测试代码命名
grep -E "const (body|config|response) = await" tests/integration/*.test.js

# 4. 检查错误日志
grep -rn "console.error" src/routes/admin/*.js | head -10

# 5. 查看测试覆盖率
npm test
```

---

## 📊 审查优先级

| 问题类型 | 优先级 | 处理方式 |
|---------|--------|---------|
| API 响应格式不一致 | 🔴 高 | 必须修复 |
| 测试命名混乱 | 🔴 高 | 必须修复 |
| 错误处理粗糙 | 🟡 中 | 建议修复 |
| 缺少注释 | 🟢 低 | 可选修复 |

---

## 🚫 常见问题

### Q1: 可以混用 `jsonResponse()` 和 `new Response()` 吗？

**A**: 不可以。必须统一使用 `jsonResponse()`。

### Q2: 测试中可以使用 `const config = await response.json()` 吗？

**A**: 不可以。必须使用 `const body = await response.json()`。

### Q3: 如何访问响应数据？

**A**: 使用 `const body = await response.json()` 然后 `body.data.xxx`。

### Q4: 批量修改后测试失败怎么办？

**A**: 
1. 停止运行测试
2. 使用 `grep` 查看所有需要修改的地方
3. 一次性全部修改
4. 再运行测试

---

## 📝 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-05-29 | 1.0.0 | 初始版本 | AI Assistant |
