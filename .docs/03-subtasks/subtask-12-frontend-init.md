# 子任务 12：前端项目初始化

**状态**: 🔴 未启动  
**优先级**: 高  
**预计工时**: 3-4 小时  
**创建日期**: 2026-05-31  
**更新日期**: 2026-05-31  

---

## 任务目标

创建前端项目基础结构，配置构建工具和样式框架，为后续页面开发奠定基础。

### 核心需求

1. **项目结构**：创建清晰的前端目录结构
2. **构建工具**：配置 Vite 开发服务器和构建流程
3. **样式框架**：集成 Tailwind CSS
4. **基础模板**：创建 HTML 模板和布局组件
5. **开发配置**：配置开发服务器和热更新

---

## 技术选型

### 构建工具：Vite

**选择理由**:
- ⚡ 极速启动和热更新（HMR）
- 📦 开箱即用的 ES 模块支持
- 🎯 零配置支持常见框架
- 🔧 丰富的插件生态
- 📊 生产构建优化

### 样式框架：Tailwind CSS

**选择理由**:
- 🎨 Utility-first CSS 框架
- 📱 响应式设计友好
- 🚀 快速原型开发
- 📦 生产环境自动 Purge CSS
- 🎯 与 Vite 集成简单

### 路由方案：Hash 路由

**选择理由**:
- 🔒 无需服务器配置
- 📄 单 HTML 文件即可部署
- 🌐 兼容 Cloudflare Pages
- 🎯 轻量级，无需额外依赖

---

## 实现步骤

### 12.1 创建项目目录结构

**目录**: `frontend/`（新建）

```
frontend/
├── index.html              # 入口 HTML
├── package.json            # 项目配置
├── vite.config.js          # Vite 配置
├── tailwind.config.js      # Tailwind 配置
├── postcss.config.js       # PostCSS 配置
├── .gitignore              # Git 忽略文件
└── src/
    ├── main.js             # 应用入口
    ├── App.js              # 根组件
    ├── styles/
    │   └── index.css       # 全局样式
    ├── components/         # 通用组件
    │   ├── Header.js
    │   ├── Footer.js
    │   ├── Button.js
    │   ├── Card.js
    │   └── Input.js
    ├── layouts/            # 布局组件
    │   └── DashboardLayout.js
    ├── pages/              # 页面组件
    │   ├── Home.js         # 公开首页
    │   └── Login.js        # 登录页
    ├── router/             # 路由系统
    │   └── index.js
    ├── utils/              # 工具函数
    │   ├── api.js          # API 请求封装
    │   └── storage.js      # localStorage 管理
    └── config/             # 配置文件
        └── index.js        # 应用配置
```

**验收要点**:
- [ ] 目录结构清晰，符合约定
- [ ] 所有必要文件已创建
- [ ] `.gitignore` 包含 `node_modules/` 和 `dist/`

---

### 12.2 初始化项目配置

**文件**: `frontend/package.json`（新建）

```json
{
  "name": "domain-monitor-frontend",
  "version": "1.0.0",
  "description": "Cloudflare Domain Monitor Frontend Dashboard",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

**验收要点**:
- [ ] `"type": "module"` 启用 ES 模块
- [ ] 脚本命令完整（dev/build/preview）
- [ ] 依赖版本兼容

---

### 12.3 配置 Vite

**文件**: `frontend/vite.config.js`（新建）

```javascript
import { defineConfig } from 'vite'

/**
 * Vite 配置
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  plugins: [],
  server: {
    port: 3000,
    open: false,
    // 反向代理配置（用于本地开发联调后端）
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
```

**验收要点**:
- [ ] 开发服务器端口为 3000
- [ ] `/api` 反向代理指向本地 Worker（8787）
- [ ] 构建输出目录为 `dist/`
- [ ] 启用了代码压缩

---

### 12.4 配置 Tailwind CSS

**文件**: `frontend/tailwind.config.js`（新建）

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,html}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
```

**文件**: `frontend/postcss.config.js`（新建）

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

**验收要点**:
- [ ] `content` 包含所有需要扫描的文件
- [ ] 自定义主题颜色（primary/success/warning/danger）
- [ ] PostCSS 配置正确

---

### 12.5 创建入口 HTML

**文件**: `frontend/index.html`（新建）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Cloudflare 域名网络特性监控平台" />
    <title>域名监控 Dashboard</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌐</text></svg>" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

**验收要点**:
- [ ] 包含必要的 meta 标签
- [ ] 设置正确的 language
- [ ] 应用挂载点 `#app`
- [ ] 模块类型加载入口脚本

---

### 12.6 创建应用入口

**文件**: `frontend/src/main.js`（新建）

```javascript
import './styles/index.css'
import App from './App.js'

/**
 * 应用初始化
 */
function init() {
  const app = document.getElementById('app')
  if (!app) {
    console.error('App mount point #app not found')
    return
  }
  
  // 渲染根组件
  app.innerHTML = App.render()
  
  // 初始化路由
  if (App.init) {
    App.init()
  }
  
  console.log('[App] Initialized')
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
```

**验收要点**:
- [ ] 导入全局样式
- [ ] 挂载根组件
- [ ] 处理 DOM 加载时机
- [ ] 错误处理

---

### 12.7 创建全局样式

**文件**: `frontend/src/styles/index.css`（新建）

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 全局重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 基础样式 */
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: #f8fafc;
  color: #1e293b;
  line-height: 1.6;
}

/* 自定义组件类 */
@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-all duration-200;
  }
  
  .btn-primary {
    @apply bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800;
  }
  
  .btn-secondary {
    @apply bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400;
  }
  
  .card {
    @apply bg-white rounded-xl shadow-sm border border-gray-100 p-6;
  }
  
  .input {
    @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none;
  }
}

/* 工具类扩展 */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

**验收要点**:
- [ ] 引入 Tailwind 指令
- [ ] 全局重置样式
- [ ] 自定义组件类（btn/card/input）
- [ ] 响应式友好

---

### 12.8 创建根组件

**文件**: `frontend/src/App.js`（新建）

```javascript
import Header from './components/Header.js'
import Footer from './components/Footer.js'
import { getCurrentPage } from './router/index.js'

/**
 * 根组件
 */
export default {
  /**
   * 渲染应用
   * @returns {string} HTML 字符串
   */
  render() {
    const currentPage = getCurrentPage()
    
    return `
      <div class="min-h-screen flex flex-col">
        ${Header.render()}
        <main class="flex-1 container mx-auto px-4 py-8">
          ${currentPage.render()}
        </main>
        ${Footer.render()}
      </div>
    `
  },
  
  /**
   * 初始化应用
   */
  init() {
    console.log('[App] Root component initialized')
  }
}
```

**验收要点**:
- [ ] 包含 Header/Footer 布局
- [ ] 路由页面渲染
- [ ] 模块化结构

---

### 12.9 创建基础组件

**文件**: `frontend/src/components/Header.js`（新建）

```javascript
/**
 * 页面头部组件
 */
export default {
  render() {
    return `
      <header class="bg-white border-b border-gray-200">
        <div class="container mx-auto px-4">
          <div class="flex items-center justify-between h-16">
            <a href="#/" class="text-xl font-bold text-primary-600">
              🌐 域名监控
            </a>
            <nav class="flex items-center gap-4">
              <a href="#/" class="text-gray-600 hover:text-gray-900">首页</a>
              <a href="#/login" class="btn btn-primary">管理登录</a>
            </nav>
          </div>
        </div>
      </header>
    `
  }
}
```

**文件**: `frontend/src/components/Footer.js`（新建）

```javascript
/**
 * 页面底部组件
 */
export default {
  render() {
    return `
      <footer class="bg-white border-t border-gray-200 mt-auto">
        <div class="container mx-auto px-4 py-6">
          <div class="text-center text-gray-600 text-sm">
            <p>&copy; ${new Date().getFullYear()} 域名监控平台 · Powered by Cloudflare Workers</p>
          </div>
        </div>
      </footer>
    `
  }
}
```

**验收要点**:
- [ ] Header 包含 Logo 和导航
- [ ] Footer 包含版权信息
- [ ] 响应式布局
- [ ] 模块化导出

---

### 12.10 配置 Git 忽略

**文件**: `frontend/.gitignore`（新建）

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Environment files
.env
.env.local
.env.*.local

# Editor
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Cache
.cache/
.parcel-cache/
```

**验收要点**:
- [ ] 包含 `node_modules/`
- [ ] 包含 `dist/`
- [ ] 包含环境文件

---

## 开发服务器配置

### 本地开发

**启动命令**:
```bash
cd frontend
npm install
npm run dev
```

**预期输出**:
```
  VITE v5.0.0  ready in 123 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### 反向代理后端

**开发环境联调**:
- 前端运行在 `http://localhost:3000`
- 后端 Worker 运行在 `http://localhost:8787`
- Vite 配置自动代理 `/api` 请求到后端

**测试方法**:
```bash
# 终端 1: 启动后端
cd /workspace
wrangler dev

# 终端 2: 启动前端
cd frontend
npm run dev
```

---

## 生产构建

### 构建命令

```bash
cd frontend
npm run build
```

### 构建输出

```
frontend/dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── manifest.json
```

### 部署到 Cloudflare Pages

**方式 1: CLI 部署**
```bash
cd frontend
npm run build
wrangler pages deploy dist --project-name=domain-monitor
```

**方式 2: GitHub 自动部署**
1. 推送 code 到 GitHub
2. 在 Cloudflare Dashboard 连接仓库
3. 配置 Build Settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Install command: `npm install`

---

## 验收标准

### 功能验收

- [ ] `npm run dev` 成功启动开发服务器
- [ ] 访问 `http://localhost:3000` 显示页面
- [ ] 热更新（HMR）工作正常
- [ ] Tailwind CSS 样式生效
- [ ] 反向代理 `/api` 请求到后端
- [ ] `npm run build` 成功构建
- [ ] 构建产物可正常预览

### 代码质量验收

- [ ] 使用 ES 模块语法
- [ ] 组件模块化组织
- [ ] 目录结构清晰
- [ ] 有基本注释
- [ ] 通过预提交检查（如配置）

### 配置验收

- [ ] `wrangler.toml` 无敏感信息
- [ ] `.gitignore` 配置完整
- [ ] `vite.config.js` 包含反向代理
- [ ] `tailwind.config.js` 自定义主题

---

## 测试计划

### 手动测试步骤

**步骤 1: 安装依赖**
```bash
cd frontend
npm install
```

**步骤 2: 启动开发服务器**
```bash
npm run dev
```

**步骤 3: 访问页面**
- 浏览器打开 `http://localhost:3000`
- 验证页面正常显示
- 验证样式生效

**步骤 4: 测试热更新**
- 修改 `src/App.js`
- 观察页面自动刷新

**步骤 5: 测试反向代理**
```bash
curl http://localhost:3000/api/admin/stats
# 应该转发到 http://localhost:8787/api/admin/stats
```

**步骤 6: 构建测试**
```bash
npm run build
npm run preview
```

---

## 依赖关系

### 前置依赖
- ✅ 任务 1-11：后端 API 完成
- ✅ 任务 1：CORS 配置允许前端访问

### 后续依赖
- 任务 13：前端基础组件（路由、API 封装等）
- 任务 14：公开 Dashboard 页面开发

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Vite 与现有工具链冲突 | 中 | 独立 frontend 目录，避免依赖冲突 |
| Tailwind CSS 体积过大 | 低 | 生产构建自动 Purge |
| 反向代理配置复杂 | 低 | 使用 Vite 内置 proxy |
| 路由与 Pages 不兼容 | 低 | 使用 Hash 路由，无需服务器配置 |
| 跨域问题 | 中 | 已在后端配置 CORS，开发时使用代理 |

---

## 注意事项

### 1. 目录隔离

前端项目完全独立在后端工作区外：
```
/workspace/
├── src/              # 后端 Worker
├── tests/            # 后端测试
├── wrangler.toml     # 后端配置
└── frontend/         # 前端项目（新建）
    ├── src/
    ├── package.json
    └── vite.config.js
```

### 2. 端口规划

| 服务 | 端口 | 说明 |
|------|------|------|
| Vite Dev Server | 3000 | 前端开发服务器 |
| Wrangler Dev | 8787 | 后端 Worker |
| Pages Preview | 自动分配 | 生产预览 |

### 3. 环境变量

**开发环境**:
- API 端点：通过 Vite proxy 转发到 `localhost:8787`
- 无需 `.env` 文件

**生产环境**:
- API 端点：硬编码或通过构建参数注入
- 建议使用 `import.meta.env` 管理

### 4. 部署流程

前端使用 Cloudflare Pages 托管：
- 自动 HTTPS
- 全球 CDN
- 自动构建部署
- 预览部署（Preview Deployments）

---

## 相关文件

### 新建文件
- `frontend/index.html` - 入口 HTML
- `frontend/package.json` - 项目配置
- `frontend/vite.config.js` - Vite 配置
- `frontend/tailwind.config.js` - Tailwind 配置
- `frontend/postcss.config.js` - PostCSS 配置
- `frontend/.gitignore` - Git 忽略
- `frontend/src/main.js` - 应用入口
- `frontend/src/App.js` - 根组件
- `frontend/src/styles/index.css` - 全局样式
- `frontend/src/components/Header.js` - Header 组件
- `frontend/src/components/Footer.js` - Footer 组件

### 相关文档
- `frontend-tasklist.md` - 前端任务总览
- `frontend-requirements.md` - 前端需求文档
- `subtask-13-frontend-base.md` - 基础组件任务

---

## 常见问题排查

**Q: Vite 启动失败？**
- 检查 Node.js 版本（建议 18+）
- 删除 `node_modules/` 重新安装
- 检查端口是否被占用

**Q: Tailwind 样式不生效？**
- 确认 `tailwind.config.js` 的 `content` 路径正确
- 确认 CSS 文件中包含 `@tailwind` 指令
- 重启开发服务器

**Q: 反向代理不工作？**
- 确认 Vite 配置中 `proxy` 路径正确
- 确认后端服务已启动
- 检查 CORS 配置

**Q: 构建后页面空白？**
- 检查浏览器控制台错误
- 确认 `index.html` 中的脚本路径
- 检查路由配置

**Q: Pages 部署失败？**
- 确认构建命令正确
- 确认输出目录为 `dist/`
- 查看部署日志

---

## 下一步

1. 创建项目目录和文件结构
2. 初始化 `package.json`
3. 安装依赖
4. 配置 Vite 和 Tailwind
5. 创建基础组件和页面
6. 启动开发服务器测试
7. 构建并预览

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-31 | 1.0 | 初始版本，基于项目需求创建 |
