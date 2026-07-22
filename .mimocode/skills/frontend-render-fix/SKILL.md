---
name: frontend-render-fix
description: "修复前端组件 render 方法返回 undefined 导致页面显示异常的问题。触发于：页面白屏、组件不渲染、console 报 render undefined。"
---

# Frontend Render Fix Skill

修复前端组件 render 方法返回 undefined 导致页面显示异常的问题。

## 适用场景

当出现以下症状时触发本 Skill：

- ✅ 页面显示 "undefined" 文字
- ✅ 控制台日志正常（Router Rendered: xxx）
- ✅ 组件的 render 方法被调用
- ✅ App 元素的 innerHTML 为 "undefined"

## 问题根因

组件的 render 方法**直接设置 innerHTML 但不 return 字符串**：

```javascript
// ❌ 错误模式
render() {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = `<div>...</div>`  // 设置但不 return
  // 隐式返回 undefined
}
```

Router 调用 render 后将返回值赋给 `app.innerHTML`：

```javascript
// Router 代码
if (currentPageInstance.render) {
  app.innerHTML = currentPageInstance.render()  // ← undefined
}
```

## 核心修复步骤

### 步骤 1：识别问题组件

```bash
# 检查哪些页面的 render 返回 undefined
grep -A 5 "render() {" src/pages/*.js
```

**特征**：
- render 方法内有 `app.innerHTML = ...`
- 没有 `return` 语句
- 或 `return` 在条件分支中，可能不执行

### 步骤 2：修复 render 方法

将 "直接操作 DOM" 改为 "返回字符串"：

```javascript
// ✅ 正确模式
render() {
  return `
    <div class="...">
      ${SomeComponent({ prop: value })}
    </div>
  `
}
```

### 步骤 3：验证修复

```javascript
// 测试代码
const instance = new PageComponent()
const html = instance.render()
console.log(typeof html)  // 应该输出 "string"
console.log(html.startsWith('<'))  // 应该输出 true
```

## 常见问题排查

### Q1: 所有页面都显示 undefined

**检查点**：
1. App 挂载点是否存在 (`#app`)
2. 路由是否正确匹配
3. 所有组件的 render 方法是否都 return 字符串

### Q2: 部分页面正常，部分显示 undefined

**检查点**：
1. 问题页面的 render 方法实现
2. 是否 mix 了两种模式（操作 DOM + return）
3. 父组件和子组件的 render 是否一致

### Q3: 修复后仍然显示 undefined

**检查点**：
1. 是否重新构建部署
2. 浏览器是否缓存旧代码
3. 是否有其他组件也返回 undefined

## 验证清单

修复完成后验证：

- [ ] 页面正常渲染（不显示 undefined）
- [ ] 控制台日志正确（Rendered: xxx）
- [ ] App innerHTML 包含 HTML 内容
- [ ] 所有组件的 render 都 return 字符串
- [ ] 无 console.error 关于 innerHTML

## 预防措施

1. **统一组件模式** - 所有组件使用 return 字符串模式
2. **代码审查检查** - PR 检查 render 方法返回值
3. **测试覆盖** - 添加 render 返回值测试

## 参考示例

**错误示例** (Login.js 修复前):
```javascript
render() {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = `<div>...</div>`
}
```

**正确示例** (Login.js 修复后):
```javascript
render() {
  return `
    <div class="min-h-screen flex items-center justify-center">
      ${Card({ content: '...' })}
    </div>
  `
}
```

## 相关 Skills

- [`api-route.md`](./api-route.md) - API 路由调试
- [`test-template.md`](./test-template.md) - 组件测试模板

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-06-08 | 1.0 | 基于 Login.js/AdminLayout.js 修复经验创建 |
