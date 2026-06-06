# 任务 21 调试：Admin API 404 问题 - 日志收集任务

**状态**: 🔴 执行中  
**优先级**: P0 (阻塞任务 21)  
**创建日期**: 2026-06-05  
**任务类型**: 信息收集（仅供调试使用）  
**预计工时**: 1 小时  

---

## ⚠️ 任务说明

**本任务仅收集信息和日志，不包含分析和解决步骤。**

收集的信息将用于后续调试 Admin API 404 问题。

### 问题现象

- 所有 `/api/admin/*` 路由返回 404
- Public API (`/api/public/*`) 工作正常
- KV 数据库连通性正常
- 初步调试显示路由匹配成功，handler 执行成功，但最终响应为 404

---

## 📋 收集范围

### 1. 代码文件完整性检查

#### 1.1 路由入口文件

```bash
# 收集目标
- /workspace/src/index.js
- /workspace/src/routes/index.js
- /workspace/src/routes/admin/*.js
- /workspace/src/middleware/auth.js
```

**收集内容**:
- 文件完整内容
- 文件 MD5 校验和
- 文件最后修改时间
- Git 状态（是否已提交/有改动）

#### 1.2 导入导出验证

```bash
# 检查所有 export 语句
grep -rn "^export" /workspace/src/routes/ --include="*.js"

# 检查所有 import 语句  
grep -rn "import.*from" /workspace/src routes/index.js

# 验证循环依赖
node -e "require('module')._resolveFilename('./routes/index.js', {paths: ['./src']})"
```

**收集内容**:
- 所有 export 语句列表
- 所有 import 语句列表
- 循环依赖检测报告

#### 1.3 语法检查

```bash
# 对每个 JS 文件执行
node --check /workspace/src/routes/index.js
node --check /workspace/src/routes/admin/auth.js
# ... 对所有路由文件
```

**收集内容**:
- 语法检查结果（通过/失败 + 错误信息）
- V8 引擎解析结果

---

### 2. Wrangler 配置和环境

#### 2.1 配置文件

```bash
# 收集目标
- /workspace/wrangler.toml
- /workspace/.dev.vars
- /workspace/.wrangler/* (如果存在)
```

**收集内容**:
- 文件完整内容（敏感信息打码）
- 文件权限
- 文件大小

#### 2.2 环境变量验证

```bash
# 验证环境变量是否被正确读取
wrangler whoami 2>&1
wrangler kv namespace list 2>&1
```

**收集内容**:
- Wrangler 版本
- Cloudflare 账户信息
- KV Namespace 列表和 ID

#### 2.3 Binding 验证

```bash
# 检查 binding 配置
grep -A 5 "kv_namespaces" /workspace/wrangler.toml
grep -A 5 "vars" /workspace/wrangler.toml
```

**收集内容**:
- 所有 binding 配置
- binding 名称和使用位置对照

---

### 3. 运行时日志收集

#### 3.1 Wrangler 启动日志

```bash
# 清理所有现有 wrangler/workerd 进程
pkill -9 -f wrangler; pkill -9 -f workerd
sleep 3

# 干净启动
cd /workspace && wrangler dev --port 8787 --log-level=debug 2>&1 | tee /tmp/wrangler-startup.log

# 收集启动后 30 秒内的所有输出
sleep 30
```

**收集内容**:
- 完整启动日志
- Worker 加载时间
- Bundle 构建时间
- Binding 初始化信息

#### 3.2 请求处理日志

```bash
# 发送测试请求
for i in {1..5}; do
  echo "=== Request $i ===" >> /tmp/wrangler-requests.log
  curl -s -X POST http://localhost:8787/api/admin/auth/verify \
    -H "X-API-Token: YOUR_CLOUDFLARE_API_TOKEN" \
    >> /tmp/wrangler-requests.log 2>&1
  sleep 1
done

# 同时测试 public API 作为对照
curl -s http://localhost:8787/api/public/domains >> /tmp/wrangler-requests.log 2>&1
```

**收集内容**:
- 每个请求的完整日志
- 请求处理时间
- 路由匹配信息
- 响应状态码

#### 3.3 Console.log 输出

```bash
# 在 routes/index.js 关键位置添加 console.log
# 收集所有 console 输出
grep "console" /tmp/wrangler-startup.log > /tmp/console-output.log
```

**收集内容**:
- 所有 console.log 输出
- 所有 console.error 输出
- 所有 uncaught exception 信息

---

### 4. 网络请求详情

#### 4.1 请求头信息

```bash
# 使用 curl 详细模式
curl -v -X POST http://localhost:8787/api/admin/auth/verify \
  -H "X-API-Token: test-token" \
  2>&1 | tee /tmp/request-headers.log
```

**收集内容**:
- 请求方法
- 请求路径（精确到每个字符）
- 所有请求头
- 所有响应头

#### 4.2 响应内容

```bash
# 捕获原始响应
curl -s -w "\n\nHTTP_CODE: %{http_code}\nTIME_TOTAL: %{time_total}s\n" \
  -X POST http://localhost:8787/api/admin/auth/verify \
  -H "X-API-Token: test-token" \
  2>&1 | tee /tmp/response-body.log
```

**收集内容**:
- 响应状态码
- 响应 body（原始 JSON）
- 响应时间
- Content-Type

#### 4.3 多端点测试矩阵

```bash
# 测试所有 admin 端点
declare -a endpoints=(
  "POST /api/admin/auth/verify"
  "POST /api/admin/auth/logout"
  "GET /api/admin/config"
  "GET /api/admin/domains"
  "GET /api/admin/stats"
  "GET /api/admin/history"
)

for endpoint in "${endpoints[@]}"; do
  method=$(echo $endpoint | cut -d' ' -f1)
  path=$(echo $endpoint | cut -d' ' -f2)
  echo "Testing: $method $path" >> /tmp/endpoint-tests.log
  curl -s -w "HTTP_CODE: %{http_code}\n" \
    -X $method http://localhost:8787$path \
    -H "X-API-Token: test" >> /tmp/endpoint-tests.log 2>&1
done
```

**收集内容**:
- 每个端点的响应
- HTTP 状态码分布
- 错误信息一致性

---

### 5. 代码执行路径追踪

#### 5.1 添加详细调试日志

在以下位置添加 `console.log`:

```javascript
// /workspace/src/routes/index.js

// 入口函数开始
console.log('[TRACE] handleRequest entry, method=%s, path=%s', method, path);

// 每个路由条件前
console.log('[TRACE] Checking condition: path===%s && method===%s', '/api/admin/auth/verify', 'POST');
console.log('[TRACE] Match result:', path === '/api/admin/auth/verify' && method === 'POST');

// 进入 handler 时
console.log('[TRACE] Entering handler:', 'withAdminAuth(handleAuth)');

// handler 返回时
console.log('[TRACE] Handler returned, response.status=', response.status);

// 最终响应前
console.log('[TRACE] Final response status:', response.status);
console.log('[TRACE] Response body:', await response.clone().text());
```

**收集内容**:
- 代码执行路径
- 每个条件的判断结果
- response 对象状态变化

#### 5.2 中间件追踪

```javascript
// /workspace/src/middleware/auth.js

export function withAdminAuth(handler) {
  console.log('[MIDDLEWARE] withAdminAuth called, handler name:', handler.name);
  return async (request, env) => {
    console.log('[MIDDLEWARE] Inner function called');
    const isValid = isValidAdminToken(request, env);
    console.log('[MIDDLEWARE] Token validation result:', isValid);
    if (!isValid) {
      console.log('[MIDDLEWARE] Returning 401');
      return createUnauthorizedResponse();
    }
    console.log('[MIDDLEWARE] Calling handler');
    const result = await handler(request, env);
    console.log('[MIDDLEWARE] Handler result:', result.status);
    return result;
  };
}
```

**收集内容**:
- 中间件调用栈
- Token 验证结果
- Handler 返回值

---

### 6. Wrangler 内部状态

#### 6.1 Module Bundle 信息

```bash
# 检查 wrangler 构建的 bundle
ls -la /tmp/workerd-* 2>/dev/null
cat /tmp/wrangler-startup.log | grep -i "bundle\|build\|esbuild"
```

**收集内容**:
- Bundle 构建时间戳
- Bundle 大小
- 使用的 esbuild 版本

#### 6.2 热重载状态

```bash
# 修改文件后检查 wrangler 是否重新加载
echo "// test change" >> /workspace/src/routes/index.js
sleep 2
grep "reload\|restart\|change" /tmp/wrangler-startup.log
```

**收集内容**:
- 文件监听到时间
- 重新加载触发时间
- 新 bundle 构建时间

#### 6.3 Worker 实例信息

```bash
# 检查运行的 workerd 进程
ps aux | grep workerd
lsof -i :8787
```

**收集内容**:
- workerd 进程 PID
- 进程启动时间
- 端口占用情况

---

### 7. 对照测试数据

#### 7.1 Public API 基线

```bash
# 收集 public API 的完整日志作为对照
curl -v http://localhost:8787/api/public/domains 2>&1 | tee /tmp/public-api-baseline.log
```

**收集内容**:
- Public API 请求处理全流程日志
- 响应头和响应体
- 处理时间

#### 7.2 简单路由测试

```bash
# 创建一个最简单的测试路由
cat > /tmp/test-simple-route.js << 'EOF'
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    console.log('[SIMPLE] Path:', url.pathname);
    if (url.pathname === '/test-admin' && request.method === 'POST') {
      return new Response(JSON.stringify({ok: true}), {
        status: 200,
        headers: {'Content-Type': 'application/json'}
      });
    }
    return new Response(JSON.stringify({error: 'not found'}), {
      status: 404,
      headers: {'Content-Type': 'application/json'}
    });
  }
}
EOF

# 使用临时 wrangler 配置测试
cd /tmp && wrangler dev test-simple-route.js --port 8788 2>&1 &
sleep 5
curl -s -X POST http://localhost:8788/test-admin
```

**收集内容**:
- 简化路由的工作状态
- 排除复杂代码干扰后的行为

---

### 8. 系统环境信息

#### 8.1 Node.js 环境

```bash
node --version
node -e "console.log(process.version)"
node -e "console.log(process.platform, process.arch)"
```

**收集内容**:
- Node.js 版本
- 操作系统信息
- CPU 架构

#### 8.2 依赖版本

```bash
npm list wrangler --depth=0
npm list esbuild --depth=0
cat /workspace/package.json | grep -A 5 "dependencies"
```

**收集内容**:
- Wrangler 版本
- esbuild 版本
- 其他关键依赖版本

#### 8.3 磁盘和内存

```bash
df -h /workspace
free -h
ulimit -n
```

**收集内容**:
- 磁盘可用空间
- 内存使用情况
- 文件描述符限制

---

## 📁 输出文件清单

收集完成后，应生成以下文件：

| 文件名 | 内容 | 大小估计 |
|--------|------|---------|
| `/tmp/wrangler-startup.log` | Wrangler 启动完整日志 | ~50KB |
| `/tmp/wrangler-requests.log` | 请求处理日志 | ~20KB |
| `/tmp/console-output.log` | 所有 console 输出 | ~10KB |
| `/tmp/request-headers.log` | 请求头详情 | ~5KB |
| `/tmp/response-body.log` | 响应内容 | ~5KB |
| `/tmp/endpoint-tests.log` | 端点测试矩阵 | ~10KB |
| `/tmp/public-api-baseline.log` | Public API 基线 | ~5KB |
| `/tmp/code-files-checksums.txt` | 代码文件 MD5 | ~2KB |
| `/tmp/import-export-map.txt` | 导入导出映射 | ~10KB |
| `/tmp/wrangler-config.txt` | 配置信息汇总 | ~5KB |
| `/tmp/system-info.txt` | 系统环境信息 | ~2KB |

**总计**: ~124KB 调试数据

---

## ✅ 收集完成检查清单

- [ ] 所有代码文件已收集（含 checksum）
- [ ] 导入导出映射已生成
- [ ] 语法检查已完成
- [ ] Wrangler 配置已收集
- [ ] 环境变量已验证
- [ ] 启动日志已捕获（≥30 秒）
- [ ] 请求处理日志已捕获（≥5 次请求）
- [ ] Console 输出已提取
- [ ] 请求头/响应头已记录
- [ ] 端点测试矩阵已完成（≥6 个端点）
- [ ] 代码执行路径日志已添加
- [ ] 中间件追踪日志已添加
- [ ] Bundle 信息已收集
- [ ] Public API 基线已建立
- [ ] 简单路由测试已完成
- [ ] 系统环境信息已记录
- [ ] 所有输出文件已整理

---

## 🔒 注意事项

1. **敏感信息处理**:
   - API Token 在日志中应打码显示
   - Account ID 应部分隐藏
   - 不要上传日志到公开场所

2. **日志清理**:
   - 调试完成后清理 `/tmp/wrangler-*` 文件
   - 移除代码中添加的 `console.log` 调试语句

3. **进程管理**:
   - 收集前清理所有 wrangler/workerd 进程
   - 收集后正常停止服务

4. **时间控制**:
   - 单次收集不超过 1 小时
   - 如超时，优先保证核心日志（1-4 项）

---

## 📤 交付物

收集任务完成后，交付：

1. **完整日志包**: `/tmp/wrangler-debug-collect-YYYYMMDD.tar.gz`
2. **文件清单**: 列出所有收集的文件和大小
3. **收集时间**: 记录收集开始和结束时间
4. **异常记录**: 记录收集过程中的任何错误或异常

---

**下一步**: 将收集的日志交给调试团队进行分析
