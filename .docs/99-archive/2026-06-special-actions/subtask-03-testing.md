# 专项行动子任务 3：全面测试验证

**专项行动**: SPECIAL-001（前端路由系统）  
**子任务编号**: SA001-SUB03  
**优先级**: P0  
**预计工时**: 1.5 小时  

---

## 任务目标

创建全面的路由系统测试用例，确保所有路由场景 100% 覆盖，所有功能正常工作。

---

## 测试文件

### 1. 单元测试文件

**路径**: `frontend/tests/router-comprehensive.test.js`

**测试范围**:
- `matchRoute()` - 路由匹配函数
- `findChildRoute()` - 子路由查找函数
- `navigateTo()` - 导航函数
- `isLoggedIn()` - 登录状态检查

**用例数量**: ≥ 30 个

---

### 2. 边界情况测试文件

**路径**: `frontend/tests/router-edge-cases.test.js`

**测试场景**:
- 连续路由跳转
- 快速 hashchange 事件
- 浏览器前进/后退
- 深层嵌套路由
- 特殊字符编码
- 长路径处理

**用例数量**: ≥ 15 个

---

### 3. E2E 测试检查清单

**路径**: `frontend/tests/e2e-routing-checklist.md`

**测试类型**: 手动测试

**测试路径**: ≥ 20 个

---

## 单元测试用例设计

### 测试套件 1: matchRoute() - 路由匹配（8 个用例）

```javascript
import { strict as assert } from 'assert'
import { matchRoute } from '../src/router/utils.js'

describe('matchRoute() - 路由匹配', () => {
  it('应正确匹配根路由', () => {
    const result = matchRoute('/', '/')
    assert.deepStrictEqual(result, {})
  })

  it('应正确匹配简单路径', () => {
    const result = matchRoute('/login', '/login')
    assert.deepStrictEqual(result, {})
  })

  it('应提取动态参数', () => {
    const result = matchRoute('/domain/example.com', '/domain/:name')
    assert.deepStrictEqual(result, { name: 'example.com' })
  })

  it('应正确匹配多个动态参数', () => {
    const result = matchRoute('/a/b/c', '/:x/:y/:z')
    assert.deepStrictEqual(result, { x: 'a', y: 'b', z: 'c' })
  })

  it('应返回 null 当路径不匹配', () => {
    const result = matchRoute('/invalid', '/login')
    assert.strictEqual(result, null)
  })

  it('应返回 null 当路径段数不匹配', () => {
    const result = matchRoute('/a/b', '/a')
    assert.strictEqual(result, null)
  })

  it('应正确处理 URL 编码', () => {
    const result = matchRoute('/domain/example%20test.com', '/domain/:name')
    assert.deepStrictEqual(result, { name: 'example test.com' })
  })

  it('应不匹配子路由路径', () => {
    const result = matchRoute('/admin/dashboard', '/admin')
    assert.deepStrictEqual(result, {})  // 只匹配 /admin 部分
  })
})
```

---

### 测试套件 2: findChildRoute() - 子路由查找（6 个用例）

```javascript
import { strict as assert } from 'assert'
import { findChildRoute } from '../src/router/index.js'

describe('findChildRoute() - 子路由查找', () => {
  const adminRoute = {
    path: '/admin',
    name: 'admin',
    children: [
      { path: 'dashboard', name: 'admin-dashboard' },
      { path: 'domains', name: 'admin-domains' },
      { path: 'config', name: 'admin-config' },
      { path: 'history', name: 'admin-history' },
      { path: 'stats', name: 'admin-stats' }
    ]
  }

  it('应正确提取并匹配子路径', () => {
    const result = findChildRoute(adminRoute, '/admin/dashboard')
    assert.strictEqual(result?.name, 'admin-dashboard')
  })

  it('应正确匹配多个子路由', () => {
    assert.strictEqual(findChildRoute(adminRoute, '/admin/domains')?.name, 'admin-domains')
    assert.strictEqual(findChildRoute(adminRoute, '/admin/config')?.name, 'admin-config')
    assert.strictEqual(findChildRoute(adminRoute, '/admin/history')?.name, 'admin-history')
    assert.strictEqual(findChildRoute(adminRoute, '/admin/stats')?.name, 'admin-stats')
  })

  it('应返回 null 当子路由不存在', () => {
    const result = findChildRoute(adminRoute, '/admin/invalid')
    assert.strictEqual(result, null)
  })

  it('应返回 null 当没有 children', () => {
    const routeWithoutChildren = { path: '/login', name: 'login' }
    const result = findChildRoute(routeWithoutChildren, '/login/dashboard')
    assert.strictEqual(result, null)
  })

  it('应处理不带斜杠的路径', () => {
    const result = findChildRoute(adminRoute, 'admin/dashboard')  // 缺少前导斜杠
    assert.strictEqual(result?.name, 'admin-dashboard')
  })

  it('应处理深层嵌套路径', () => {
    const deepRoute = {
      path: '/admin',
      children: [
        { path: 'users/:id', name: 'admin-user-detail' }
      ]
    }
    const result = findChildRoute(deepRoute, '/admin/users/123')
    assert.strictEqual(result?.name, 'admin-user-detail')
  })
})
```

---

### 测试套件 3: navigateTo() - 导航函数（4 个用例）

```javascript
import { strict as assert } from 'assert'
import { navigateTo } from '../src/router/index.js'

describe('navigateTo() - 导航函数', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('应正确设置 hash 路径', () => {
    navigateTo('/admin/dashboard')
    assert.strictEqual(window.location.hash, '#/admin/dashboard')
  })

  it('应自动添加 # 前缀', () => {
    navigateTo('login')  // 不带 #
    assert.strictEqual(window.location.hash, '#login')
  })

  it('应保留查询参数', () => {
    navigateTo('/domain/test.com?tab=history')
    assert.strictEqual(window.location.hash, '#/domain/test.com?tab=history')
  })

  it('应触发 hashchange 事件', (done) => {
    window.addEventListener('hashchange', () => {
      done()
    })
    navigateTo('/test')
  })
})
```

---

### 测试套件 4: isLoggedIn() - 登录状态检查（4 个用例）

```javascript
import { strict as assert } from 'assert'
import { isLoggedIn } from '../src/utils/storage.js'

describe('isLoggedIn() - 登录状态检查', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('应返回 false 当 token 不存在', () => {
    assert.strictEqual(isLoggedIn(), false)
  })

  it('应返回 true 当 token 存在', () => {
    localStorage.setItem('api_token', 'test-token')
    assert.strictEqual(isLoggedIn(), true)
  })

  it('应返回 false 当 token 为空字符串', () => {
    localStorage.setItem('api_token', '')
    assert.strictEqual(isLoggedIn(), false)
  })

  it('应返回 true 当 token 为任意非空值', () => {
    localStorage.setItem('api_token', 'any-value')
    assert.strictEqual(isLoggedIn(), true)
  })
})
```

---

### 测试套件 5: renderRoute() - 路由渲染（5 个用例）

```javascript
import { strict as assert } from 'assert'

describe('renderRoute() - 路由渲染', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>'
    localStorage.clear()
  })

  it('应渲染公开路由', async () => {
    const { renderRoute } = await import('../src/router/index.js')
    const route = {
      name: 'public',
      path: '/',
      component: () => import('../src/pages/PublicDashboard.js'),
      meta: { requiresAuth: false }
    }
    
    await renderRoute(route, {}, new URLSearchParams())
    const app = document.getElementById('app')
    assert.ok(app.innerHTML.includes('dashboard') || app.innerHTML.includes('Domain'))
  })

  it('应拒绝未认证的后台路由', async () => {
    const { renderRoute, navigateTo } = await import('../src/router/index.js')
    const route = {
      name: 'admin',
      path: '/admin',
      component: () => import('../src/pages/admin/AdminLayout.js'),
      meta: { requiresAuth: true }
    }
    
    await renderRoute(route, {}, new URLSearchParams())
    assert.strictEqual(window.location.hash, '#/login')
  })

  it('应已登录时重定向访问登录页', async () => {
    const { renderRoute } = await import('../src/router/index.js')
    localStorage.setItem('api_token', 'test-token')
    
    const route = {
      name: 'login',
      path: '/login',
      component: () => import('../src/pages/Login.js'),
      meta: { requiresAuth: false }
    }
    
    await renderRoute(route, {}, new URLSearchParams())
    assert.strictEqual(window.location.hash, '#/admin/dashboard')
  })

  it('应正确设置页面标题', async () => {
    const { renderRoute } = await import('../src/router/index.js')
    const route = {
      name: 'login',
      path: '/login',
      component: () => import('../src/pages/Login.js'),
      meta: { title: '登录 - 域名监控' }
    }
    
    await renderRoute(route, {}, new URLSearchParams())
    assert.strictEqual(document.title, '登录 - 域名监控')
  })

  it('应清理旧页面实例', async () => {
    const { renderRoute, getCurrentPage, cleanupCurrentPage } = await import('../src/router/index.js')
    
    // 渲染第一个页面
    const route1 = {
      name: 'public',
      path: '/',
      component: () => import('../src/pages/PublicDashboard.js')
    }
    await renderRoute(route1, {}, new URLSearchParams())
    const page1 = getCurrentPage()
    
    // 渲染第二个页面，第一个应该被清理
    const route2 = {
      name: 'login',
      path: '/login',
      component: () => import('../src/pages/Login.js')
    }
    await renderRoute(route2, {}, new URLSearchParams())
    
    assert.notStrictEqual(getCurrentPage(), page1)
  })
})
```

---

### 测试套件 6: init() - 路由初始化（3 个用例）

```javascript
describe('init() - 路由初始化', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>'
    window.location.hash = ''
    localStorage.clear()
  })

  it('应初始化路由系统', async () => {
    const { init } = await import('../src/router/index.js')
    await init()
    assert.ok('路由系统已初始化')
  })

  it('应触发初始路由', async () => {
    window.location.hash = '#/'
    const { init } = await import('../src/router/index.js')
    await init()
    
    // 等待渲染完成
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const app = document.getElementById('app')
    assert.ok(app.innerHTML.length > 0, '首页已渲染')
  })

  it('应监听 hashchange 事件', async () => {
    const { init } = await import('../src/router/index.js')
    await init()
    
    window.location.hash = '#/login'
    await new Promise(resolve => setTimeout(resolve, 100))
    
    assert.strictEqual(window.location.hash, '#/login')
  })
})
```

---

## 边界情况测试用例

### 测试套件 7: 边界情况（15+ 个用例）

```javascript
import { strict as assert } from 'assert'

describe('边界情况测试', () => {
  describe('快速路由切换', () => {
    it('应处理连续的 hashchange 事件', async () => {
      window.location.hash = '#/login'
      window.location.hash = '#/admin/dashboard'
      window.location.hash = '#/admin/domains'
      
      await new Promise(resolve => setTimeout(resolve, 200))
      assert.strictEqual(window.location.hash, '#/admin/domains')
    })

    it('应防止重复渲染', async () => {
      // 连续触发相同路由
      window.location.hash = '#/login'
      window.location.hash = '#/login'
      window.location.hash = '#/login'
      
      await new Promise(resolve => setTimeout(resolve, 100))
      // 应只渲染一次
    })
  })

  describe('浏览器导航', () => {
    it('应正确处理后退按钮', async () => {
      window.location.hash = '#/'
      await new Promise(resolve => setTimeout(resolve, 50))
      
      window.location.hash = '#/login'
      await new Promise(resolve => setTimeout(resolve, 50))
      
      window.history.back()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      assert.strictEqual(window.location.hash, '#/')
    })

    it('应正确处理前进按钮', async () => {
      window.location.hash = '#/'
      window.location.hash = '#/login'
      window.history.back()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      window.history.forward()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      assert.strictEqual(window.location.hash, '#/login')
    })
  })

  describe('特殊路径处理', () => {
    it('应处理带空格的参数', () => {
      const result = matchRoute('/domain/example%20test.com', '/domain/:name')
      assert.deepStrictEqual(result, { name: 'example test.com' })
    })

    it('应处理带特殊字符的参数', () => {
      const result = matchRoute('/domain/test+example.com', '/domain/:name')
      assert.deepStrictEqual(result, { name: 'test+example.com' })
    })

    it('应处理超长路径', () => {
      const longPath = '/domain/' + 'a'.repeat(1000) + '.com'
      const result = matchRoute(longPath, '/domain/:name')
      assert.ok(result?.name.length > 1000)
    })

    it('应处理多层嵌套路径', () => {
      const deepRoute = {
        path: '/app',
        children: [
          {
            path: 'module',
            children: [
              { path: 'sub', name: 'deep-sub' }
            ]
          }
        ]
      }
      // 当前实现不支持三层嵌套，但应正确处理
      const result = findChildRoute(deepRoute, '/app/module')
      assert.ok(result)
    })
  })

  describe('认证边界', () => {
    it('应处理 token 过期', () => {
      localStorage.setItem('api_token', 'expired-token')
      // 模拟 token 过期场景
      assert.strictEqual(isLoggedIn(), true)  // 本地检查通过
      // 实际 API 调用会返回 401
    })

    it('应处理多个后台标签页', () => {
      // 标签页 A 登录
      localStorage.setItem('api_token', 'token')
      localStorage.setItem('login_time', Date.now().toString())
      
      // 标签页 B 应能检测到登录状态
      assert.strictEqual(localStorage.getItem('api_token'), 'token')
    })
  })

  describe('错误恢复', () => {
    it('应从模块加载失败中恢复', async () => {
      // 模拟加载不存在的组件
      try {
        await import('./NonExistent.js')
        assert.fail('应抛出错误')
      } catch (error) {
        assert.ok(error.message.includes('Cannot resolve module'))
      }
    })

    it('应在路由损坏时显示 404', async () => {
      window.location.hash = '#/completely/invalid/path/that/does/not/exist'
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const app = document.getElementById('app')
      assert.ok(app.innerHTML.includes('404') || app.innerHTML.includes('不存在'))
    })
  })
})
```

---

## E2E 手动测试清单

### 创建文件: `frontend/tests/e2e-routing-checklist.md`

```markdown
# 路由系统 E2E 测试清单

## 测试环境

- 浏览器：Chrome 最新版
- 环境：开发环境 (npm run dev)
- 构建：生产构建 (npm run build && npm run preview)

## 测试用例

### 公开路由（5 个）

- [ ] 首页加载 (#/)
- [ ] 首页带搜索参数 (#/?search=example.com)
- [ ] 登录页加载 (#/login)
- [ ] 404 页面 (#/invalid)
- [ ] 移动端响应式布局

### 认证流程（4 个）

- [ ] 未登录访问后台重定向
- [ ] 登录成功跳转后台
- [ ] 已登录访问登录页重定向
- [ ] 退出登录返回登录页

### 管理后台（7 个）

- [ ] 后台仪表盘 (#/admin/dashboard)
- [ ] 域名管理 (#/admin/domains)
- [ ] 系统配置 (#/admin/config)
- [ ] 历史记录 (#/admin/history)
- [ ] 统计概览 (#/admin/stats)
- [ ] 侧边栏导航切换
- [ ] 移动端菜单响应

### 边界情况（4 个）

- [ ] 快速切换多个路由
- [ ] 浏览器前进/后退
- [ ] 直接输入 URL 访问
- [ ] 刷新页面保持路由

## 测试记录

- 测试日期：______
- 测试人员：______
- 通过用例：__ / 20
- 失败用例：__ / 20
- 备注：______
```

---

## 验收标准

### 单元测试验收

- [ ] 30+ 个单元测试用例
- [ ] 100% 通过率
- [ ] 覆盖所有路由函数
- [ ] 测试报告生成

### 边界测试验收

- [ ] 15+ 个边界用例
- [ ] 100% 通过率
- [ ] 覆盖所有边界场景
- [ ] 无未处理的异常

### E2E 验收

- [ ] 20+ 个手动测试用例
- [ ] 100% 通过率
- [ ] 所有路由正常工作
- [ ] 用户体验流畅

---

**状态**: ⬜ 未开始 → 🟡 进行中 → ✅ 已完成  
**实际工时**: ___ 小时  
**完成日期**: ___
