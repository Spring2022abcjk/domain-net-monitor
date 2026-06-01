# Worker HTML Injection Skill

在 Cloudflare Workers 等单文件部署的 Serverless 项目中，安全、可靠地将前端 HTML/JS 注入到 Worker 代码中。

## 适用场景

当同时满足以下条件时，使用本 Skill：

1. **部署目标**：Cloudflare Workers 或其他要求单文件 JS 产物的 Serverless 平台
2. **项目结构**：前后端分离（`worker.js` + `index.html` + `app.js`）
3. **注入需求**：需要在 Worker 中返回完整的 HTML 页面，且 HTML 中包含动态内容（如 CSS、JS、中文字符）

## 核心方案

**Base64 编码 + TextDecoder 解码**

### 为什么不用字符串转义？

| 方案 | 问题 | 结果 |
|---|---|---|
| `JSON.stringify()` | 无法处理 HTML 中的引号、反斜杠 | 语法错误 |
| 正则转义 (`escapeForJsString`) | 无法正确处理 UTF-8 多字节字符 | 中文乱码 (`å·²å¤å¶`) |
| 模板字符串 | 遇到 `${}` 会执行插值 | 变量污染 |
| **Base64 编码** | 无 | ✅ 100% 安全 |

---

## 实施步骤

### 步骤 1：创建构建脚本 (`build.js`)

```javascript
/**
 * Worker 构建脚本
 * 将前端 HTML/JS 进行 Base64 编码并注入到 Worker 中
 */
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = __dirname;
const WORKER_SOURCE = path.join(PROJECT_ROOT, "src", "worker.js");
const HTML_SOURCE = path.join(PROJECT_ROOT, "src", "pages", "index.html");
const JS_SOURCE = path.join(PROJECT_ROOT, "src", "pages", "app.js");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "_worker.js");

function main() {
  console.log("[1/4] 检查源文件...");
  const sources = [WORKER_SOURCE, HTML_SOURCE, JS_SOURCE];
  for (const file of sources) {
    if (!fs.existsSync(file)) {
      console.error(`源文件不存在：${file}`);
      process.exit(1);
    }
  }

  console.log("[2/4] 读取前端文件...");
  const htmlContent = fs.readFileSync(HTML_SOURCE, "utf8");
  const jsContent = fs.readFileSync(JS_SOURCE, "utf8");

  // 合并 HTML 和 JS（将 app.js 内联到 index.html 的 </body> 前）
  const mergedHtml = htmlContent.replace(
    "</body>",
    `<script>${jsContent}</script>\n</body>`,
  );

  console.log("[3/4] Base64 编码...");
  // 关键：使用 Base64 编码，避免转义问题
  const base64Html = Buffer.from(mergedHtml).toString('base64');
  console.log(`  原始大小：${(mergedHtml.length / 1024).toFixed(1)} KB`);
  console.log(`  Base64 后：${(base64Html.length / 1024).toFixed(1)} KB`);

  console.log("[4/4] 生成 _worker.js...");
  let workerContent = fs.readFileSync(WORKER_SOURCE, "utf8");

  // 注入 Base64 字符串
  const injectCode = `const HTML_CONTENT_B64 = "${base64Html}";`;

  // 查找注入点标记
  const markerPattern = /\/\/ const HTML_CONTENT_B64 = [^;]+;/;
  if (markerPattern.test(workerContent)) {
    workerContent = workerContent.replace(markerPattern, injectCode);
  } else {
    const fallbackPattern = "// HTML_CONTENT_B64 由构建脚本注入";
    if (workerContent.includes(fallbackPattern)) {
      workerContent = workerContent.replace(fallbackPattern, injectCode);
    } else {
      console.warn("未找到注入标记，尝试在文件头部注入");
      workerContent = injectCode + "\n" + workerContent;
    }
  }

  fs.writeFileSync(OUTPUT_PATH, workerContent, "utf8");
  const fileSizeKB = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`\n构建完成! 输出：${OUTPUT_PATH} 大小：${fileSizeKB} KB`);
}

main();
```

### 步骤 2：在 Worker 中添加注入点标记

在 `src/worker.js` 文件顶部添加：

```javascript
// HTML_CONTENT_B64 由构建脚本注入 (Base64 编码方案)
// const HTML_CONTENT_B64 = "...";
```

### 步骤 3：实现 UTF-8 解码函数

**关键修复**：不能直接使用 `atob()`，必须通过 `TextDecoder` 还原 UTF-8 编码。

```javascript
/**
 * 渲染 HTML 页面
 * @param {string} dohPath - DoH 路径
 * @param {string} doh - 上游 DoH 服务器
 * @returns {Promise<Response>}
 */
async function renderHtml(dohPath, doh) {
  // 1. 使用 atob 将 Base64 解码为 binary string
  const binaryString = atob(HTML_CONTENT_B64);
  
  // 2. 将 binary string 转换为 Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // 3. 使用 TextDecoder 将 UTF-8 字节正确解码为字符串
  const html = new TextDecoder('utf-8').decode(bytes)
    .replace(/__DOH_PATH__/g, dohPath)
    .replace(/__UPSTREAM_DOH__/g, doh);

  return new Response(html, {
    headers: { "content-type": "text/html;charset=UTF-8" }
  });
}
```

### 步骤 4：在 HTML 中使用占位符

在 `src/pages/index.html` 中，使用 `__DOH_PATH__` 等占位符，构建时会被替换：

```html
<script>
  const INJECTED_DOH_PATH = '__DOH_PATH__';
  const INJECTED_UPSTREAM_DOH = '__UPSTREAM_DOH__';
</script>
```

---

## 验证清单

构建完成后，执行以下验证：

```bash
# 1. 运行构建
node build.js

# 2. 检查注入是否成功
grep "HTML_CONTENT_B64" _worker.js

# 3. 验证 Base64 可解码性（Node.js）
node -e "
const fs = require('fs');
const code = fs.readFileSync('_worker.js', 'utf8');
const match = code.match(/const HTML_CONTENT_B64 = \"([A-Za-z0-9+/=]+)\";/);
if (match) {
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  console.log('✓ Base64 解码成功');
  console.log('✓ 包含中文字符:', decoded.includes('已复制'));
  console.log('✓ 包含占位符:', decoded.includes('__DOH_PATH__'));
} else {
  console.log('✗ 未找到 Base64 注入');
  process.exit(1);
}
"

# 4. 部署测试
wrangler deploy
# 访问页面，确认中文显示正常（非乱码）
```

---

## 常见问题排查

### 问题 1：中文显示为乱码（如 `å·²å¤å¶`）

**根因**：`atob()` 返回的是 Latin1 编码的 binary string，不会自动解码多字节 UTF-8 字符。

**解决**：必须使用 `TextDecoder('utf-8')` 进行解码。

```javascript
// ❌ 错误写法
const html = atob(HTML_CONTENT_B64);

// ✅ 正确写法
const binaryString = atob(HTML_CONTENT_B64);
const bytes = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++) {
  bytes[i] = binaryString.charCodeAt(i);
}
const html = new TextDecoder('utf-8').decode(bytes);
```

### 问题 2：构建后文件体积过大

**优化建议**：
1. 压缩 HTML/CSS/JS（使用 `html-minifier`、`terser` 等工具）
2. 移除未使用的 CSS 和 JS 库
3. 使用 CDN 引用大型库（如 Bootstrap）而非内联

```javascript
// 在 build.js 中添加压缩步骤
const minifiedHtml = htmlContent.replace(/\s+/g, ' ').trim();
const base64Html = Buffer.from(minifiedHtml).toString('base64');
```

### 问题 3：占位符未被替换

**检查**：
1. Worker 中 `renderHtml` 函数是否正确调用 `.replace()`
2. 占位符格式是否一致（如 `__DOH_PATH__` vs `{{DOH_PATH}}`）
3. 替换顺序是否正确（先解码，后替换）

### 问题 4：特殊字符导致语法错误

**场景**：HTML 中包含 `` ` ``、`${` 等 JavaScript 特殊字符。

**解决**：Base64 方案已天然免疫此问题，无需额外处理。

---

## 扩展示例

### 多语言支持

通过占位符注入语言包：

```javascript
// build.js
const langData = JSON.stringify(langBundle);
const base64Lang = Buffer.from(langData).toString('base64');
injectCode += `\nconst LANG_B64 = "${base64Lang}";`;

// worker.js
const lang = JSON.parse(
  new TextDecoder('utf-8').decode(
    Uint8Array.from(atob(LANG_B64), c => c.charCodeAt(0))
  )
);
```

### 动态配置注入

```javascript
// build.js
const config = {
  API_ENDPOINT: process.env.API_ENDPOINT,
  VERSION: require('./package.json').version
};
const configJson = JSON.stringify(config);
injectCode += `\nconst CONFIG_B64 = "${Buffer.from(configJson).toString('base64')}";`;
```

---

## 相关资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [TextDecoder MDN](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder)
- [Base64 编码原理](https://en.wikipedia.org/wiki/Base64)

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|---|---|---|
| 2026-05-27 | 1.0 | 初始版本，基于 CF-Workers-DoH 重构实践 |
