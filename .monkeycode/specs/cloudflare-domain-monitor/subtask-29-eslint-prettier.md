# 子任务 29：ESLint + Prettier 代码规范基础设施

**状态**: ✅ 已完成
**优先级**: 中
**预计工时**: 2 小时
**创建日期**: 2026-07-02
**更新日期**: 2026-07-03

---

## 任务目标

为项目（根目录 Worker + `frontend/`）建立统一的代码规范自动化基础设施：ESLint 负责代码质量规则，Prettier 负责格式化一致性，二者通过 `eslint-config-prettier` 协同，零冲突。

### 核心需求

1. **需求 1**：根目录和 `frontend/` 各自配置 ESLint（flat config），覆盖率 100%
2. **需求 2**：根目录和 `frontend/` 各自配置 Prettier，规则统一（printWidth: 120, singleQuote: true, trailingComma: 'all' 等）
3. **需求 3**：ESLint 与 Prettier 不冲突，通过 `eslint-config-prettier` 关闭 ESLint 中与 Prettier 重叠的格式化规则
4. **需求 4**：`package.json` 添加 `lint` / `lint:fix` / `format` / `format:check` scripts，均可一键执行
5. **需求 5**：现有全部代码通过 lint + format 检查（或一次性 `--fix` 修正后纳入规范）

---

## 实现步骤

### 29.1 根目录 ESLint 配置

**文件**: `eslint.config.js`（根目录，新建）
**依赖**: `eslint`, `@eslint/js`, `globals`, `eslint-config-prettier`（devDependencies）

Worker 运行环境为 Service Worker global scope，需配置对应 globals。

```javascript
import js from '@eslint/js'
import globals from 'globals'
import prettierConfig from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    ignores: ['node_modules/', '.wrangler/', 'dist/', 'frontend/'],
  },
]
```

**验收要点**:
- [ ] `npx eslint .` 在根目录运行不报配置错误
- [ ] Service Worker 全局变量（`fetch`, `Request`, `Response`, `URL`, `crypto`）被识别
- [ ] 排除目录 `frontend/`, `node_modules/`, `.wrangler/`, `dist/` 不在检查范围内

---

### 29.2 根目录 Prettier 配置

**文件**: `prettier.config.js`（根目录，新建）+ `.prettierignore`（根目录，新建）

```javascript
export default {
  printWidth: 120,
  singleQuote: true,
  trailingComma: 'all',
  semi: false,
  tabWidth: 2,
  arrowParens: 'always',
  endOfLine: 'lf',
}
```

`.prettierignore`:
```
node_modules
.wrangler
dist
frontend
```

**验收要点**:
- [ ] `npx prettier --check "src/**/*.js" "tests/**/*.js"` 返回格式化差异列表
- [ ] `npx prettier --write "src/**/*.js" "tests/**/*.js"` 自动修正成功

---

### 29.3 前端 ESLint 配置

**文件**: `frontend/eslint.config.js`（新建）
**依赖**: `eslint`, `@eslint/js`, `globals`, `eslint-config-prettier`（devDependencies）

前端运行在浏览器环境，globals 设为 browser。

```javascript
import js from '@eslint/js'
import globals from 'globals'
import prettierConfig from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    ignores: ['node_modules/', 'dist/'],
  },
]
```

**验收要点**:
- [ ] `npx eslint .` 在前端目录运行不报配置错误
- [ ] 浏览器全局变量（`document`, `window`, `fetch`, `URLSearchParams`, `history`）被识别
- [ ] 排除目录 `node_modules/`, `dist/` 不在检查范围内

---

### 29.4 前端 Prettier 配置

**文件**: `frontend/prettier.config.js`（新建）+ `frontend/.prettierignore`（新建）

```javascript
export default {
  printWidth: 120,
  singleQuote: true,
  trailingComma: 'all',
  semi: false,
  tabWidth: 2,
  arrowParens: 'always',
  endOfLine: 'lf',
}
```

`.prettierignore`:
```
node_modules
dist
```

**验收要点**:
- [ ] `npx prettier --check "src/**/*.js" "tests/**/*.js"` 返回格式化差异列表
- [ ] `npx prettier --write "src/**/*.js" "tests/**/*.js"` 自动修正成功

---

### 29.5 添加 npm scripts

**文件**: `package.json`（根目录，修改） + `frontend/package.json`（修改）

分别在两个 `package.json` 中添加：

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint --fix .",
    "format": "prettier --write \"src/**/*.js\" \"tests/**/*.js\"",
    "format:check": "prettier --check \"src/**/*.js\" \"tests/**/*.js\""
  }
}
```

**验收要点**:
- [ ] 根目录 `npm run lint` 运行 ESLint
- [ ] 根目录 `npm run format:check` 检查格式
- [ ] 前端 `npm run lint` 运行 ESLint
- [ ] 前端 `npm run format:check` 检查格式

---

### 29.6 一次性代码格式化修正

对所有现有代码执行 `--fix` 和 `--write`，确保零基线差异。

```bash
# 根目录
npx eslint --fix .
npx prettier --write "src/**/*.js" "tests/**/*.js"

# 前端
npx eslint --fix .
npx prettier --write "src/**/*.js" "tests/**/*.js"
```

**验收要点**:
- [ ] 根目录 `npm run lint` 返回 0 个 error/warning
- [ ] 根目录 `npm run format:check` 返回 "All matched files use Prettier code style"
- [ ] 前端 `npm run lint` 返回 0 个 error/warning
- [ ] 前端 `npm run format:check` 返回 "All matched files use Prettier code style"

---

## 测试用例

### 自动化验证

**文件**: 不需要新建测试文件，通过 npm scripts 直接验证。

```bash
# 根目录验证
npm run lint && npm run format:check && echo "PASS"

# 前端验证
npm run lint && npm run format:check && echo "PASS"
```

### 测试覆盖

- [ ] ESLint 能检测到明显错误（如使用未声明变量、语法错误）
- [ ] Prettier 能检测到格式差异（如缩进不一致、引号不统一）
- [ ] `--fix` / `--write` 能自动修正所有可修复问题
- [ ] ESLint 和 Prettier 规则互不冲突（`eslint-config-prettier` 生效）

---

## 验收标准

### 功能验收

- [ ] 根目录 ESLint flat config 加载成功，覆盖 `src/` + `tests/`
- [ ] 前端 ESLint flat config 加载成功，覆盖 `src/` + `tests/`
- [ ] 根目录 Prettier 配置生效，格式化所有 `.js` 文件
- [ ] 前端 Prettier 配置生效，格式化所有 `.js` 文件
- [ ] `npm run lint` / `npm run format:check` 在两个目录均返回零差异

### 代码质量验收

- [ ] `no-unused-vars` 规则生效，`_` 前缀参数豁免
- [ ] `eslint-config-prettier` 正确关闭 Prettier 冲突规则
- [ ] `.prettierignore` 排除 `node_modules` / `dist` / `.wrangler`
- [ ] ESLint `ignores` 排除构建产物目录

### 一致性验收

- [ ] 根目录和前端使用完全相同的 Prettier 规则（printWidth: 120, singleQuote: true, trailingComma: 'all', semi: false）
- [ ] 根目录和前端使用相同的 ESLint 规则集（`js.configs.recommended` + Prettier）

---

## 相关文件

### 新建文件
- `eslint.config.js` — 根目录 ESLint flat config（Worker 环境）
- `prettier.config.js` — 根目录 Prettier 配置
- `.prettierignore` — 根目录 Prettier 排除规则
- `frontend/eslint.config.js` — 前端 ESLint flat config（浏览器环境）
- `frontend/prettier.config.js` — 前端 Prettier 配置
- `frontend/.prettierignore` — 前端 Prettier 排除规则

### 修改文件
- `package.json` — 添加 `lint`, `lint:fix`, `format`, `format:check` scripts
- `frontend/package.json` — 添加 `lint`, `lint:fix`, `format`, `format:check` scripts

### 受影响文件（格式化后）
- 所有 `src/**/*.js` 和 `tests/**/*.js` 文件（仅格式变更，无逻辑变更）

---

## 依赖关系

### 前置依赖
- 无

### 后续依赖
- 任务 30（建议）：Git pre-commit hook（Husky + lint-staged），依赖本任务的 ESLint/Prettier 配置
- 任务 31（建议）：GitHub Actions CI 管道，依赖本任务的 lint/format scripts

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 一次性 `--fix` 改动量大，diff 混乱 | 代码审查困难 | 将 fix commit 与 config commit 分开，fix commit 只含自动格式化变更 |
| ESLint 9 flat config 语法与旧版不兼容 | 配置编写错误 | 严格使用官方推荐写法，避免遗留 `.eslintrc` 混用 |
| Worker 全局变量未被正确识别 | lint 误报 `no-undef` | 使用 `globals.serviceworker` 包，验证 `fetch`/`Request`/`Response` 不产生 lint 错误 |
| 前端无 `type: "module"`，ESLint 默认 CJS | `import` 语法报错 | 在 `eslint.config.js` 中不做额外配置，ESLint 9 flat config 本身就是 ESM |

---

## 下一步

1. ~~根据本文档依次实现 29.1 ~ 29.6~~
2. ~~每步完成后执行对应验证脚本~~
3. ~~全部通过后提交：先 commit 配置文件，再 commit 格式化变更~~
4. ~~更新 `tasklist.md` 添加任务 29 条目~~

### 补充任务：`no-unused-vars` 警告清零 (2026-07-03)

全部 42 个警告（根 30 + 前端 12）已清零，处置策略：

| 类别 | 数量 | 策略 |
|------|------|------|
| 未使用 import | 15 | 直接删除（`getAllDomains`、`describe`/`it`、`assert`、`assertThrows`） |
| 未使用参数（API 契约） | 11 | 加 `_` 前缀（`env→_env`、`ctx→_ctx`、`req→_req` 等） |
| 未使用 destructured 变量 | 1 | `apiToken→_apiToken` |
| 死代码赋值 | 6 | 删除赋值保留副作用调用，或直接删行 |
| catch 变量 | 3 | `caughtErrors: 'none'` 全局豁免 |

同时强化规则：`no-unused-vars` 从 `'warn'` 升至 `'error'`，新增 `varsIgnorePattern: '^_'` 和 `caughtErrors: 'none'`。
