# 任务 6：入口与集成

## 任务目标

实现 Worker 入口文件，整合所有模块，完成整体联调测试。

---

## 子任务列表

### 6.1 实现 src/index.js（Worker 入口）

#### 6.1.1 引入所有依赖模块

```javascript
import { handleOptionsRequest, jsonResponse } from './utils/helper.js';
import { handleRequest } from './routes/index.js';
```

#### 6.1.2 导出 Worker 处理器 `export default { fetch }`

标准 ES Module 语法：
```javascript
export default {
  async fetch(request, env, ctx) {
    // 1. 获取请求信息
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // 2. 处理 OPTIONS 跨域预检
    if (method === 'OPTIONS') {
      return handleOptionsRequest();
    }
    
    // 3. 分发至路由处理
    try {
      return await handleRequest(request, env);
    } catch (error) {
      // 4. 全局异常捕获
      return jsonResponse(
        { error: error.message },
        500,
        'Internal Server Error'
      );
    }
  }
};
```

#### 6.1.3 环境变量传递

确保 KV 绑定等环境变量能传递到路由层：
```javascript
// 在 handleRequest 中传入 env
return await handleRequest(request, env);
```

---

### 6.2 整体联调测试

#### 6.2.1 本地启动

执行命令：
```bash
wrangler dev
```

验证：
- Worker 正常启动在 `http://localhost:8787`
- 无启动报错

#### 6.2.2 接口测试清单

逐项测试所有 API 接口：

**域名管理接口**：
- [ ] `GET /api/domains` — 获取空列表
- [ ] `POST /api/domains` — 全量更新列表
- [ ] `GET /api/domains` — 获取更新后的列表
- [ ] `POST /api/domains/add` — 追加单个域名
- [ ] `POST /api/domains/delete` — 删除单个域名

**检测接口**：
- [ ] `POST /api/detect/single` — 单域名检测
- [ ] `GET /api/detect/all` — 批量检测（使用少量域名）

**结果查询接口**：
- [ ] `GET /api/result/all` — 查询全部结果
- [ ] `POST /api/result/single` — 查询单域名结果

#### 6.2.3 跨域测试

使用浏览器或 Postman 测试：
- [ ] 发送 OPTIONS 预检请求，验证响应头
- [ ] 发送实际请求，验证 CORS 头存在

#### 6.2.4 异常场景测试

- [ ] 请求体非 JSON → 返回 400
- [ ] 域名参数为空 → 返回 400
- [ ] 访问不存在的路由 → 返回 404
- [ ] 模拟 DoH 失败 → 返回 error 状态

---

## 验收标准

1. Worker 能正常启动（`wrangler dev`）
2. 所有 API 接口能正常响应
3. 检测结果符合预期（可通过已知域名验证）
4. 全局异常处理正常，500 错误能正确捕获
5. 跨域请求正常，支持浏览器调用

---

## 前置依赖

- 任务 1：项目初始化与配置
- 任务 2：工具层实现
- 任务 3：检测模块实现
- 任务 4：存储层实现
- 任务 5：路由层实现

## 后续依赖

- 任务 7：部署与验证
