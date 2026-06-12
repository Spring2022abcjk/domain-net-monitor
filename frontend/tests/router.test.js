/**
 * 路由系统单元测试
 * 验证嵌套路由匹配逻辑修复
 */

// 模拟 matchRoute 函数（来自 utils.js）
function matchRoute(path, pattern) {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = path.split('/').filter(Boolean)
  
  if (patternParts.length !== pathParts.length) return null
  
  const params = {}
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]
    const pathPart = pathParts[i]
    
    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart)
    } else if (patternPart !== pathPart) {
      return null
    }
  }
  
  return params
}

// 模拟 findChildRoute 函数（来自 index.js）
function findChildRoute(parentRoute, fullPath) {
  if (!parentRoute.children) return null
  
  const parentPath = parentRoute.path
  const childPath = fullPath.startsWith(parentPath + '/') 
    ? fullPath.slice(parentPath.length + 1)
    : fullPath
  
  for (const child of parentRoute.children) {
    if (child.path === childPath) return child
  }
  return null
}

// 模拟路由匹配流程（修复后的逻辑）
function findRoute(path) {
  let matchedRoute = null
  let parentRoute = null
  let params = {}
  
  const routes = [
    { name: 'public', path: '/', children: undefined },
    { name: 'login', path: '/login', children: undefined },
    {
      name: 'admin',
      path: '/admin',
      children: [
        { name: 'admin-dashboard', path: 'dashboard' },
        { name: 'admin-domains', path: 'domains' },
        { name: 'admin-config', path: 'config' },
        { name: 'admin-history', path: 'history' },
        { name: 'admin-stats', path: 'stats' }
      ]
    },
    { name: 'notfound', path: '*', children: undefined }
  ]
  
  for (const route of routes) {
    if (route.path === '*') continue
    
    // === 修复后的逻辑：先检查嵌套路由 ===
    if (route.children && path.startsWith(route.path + '/')) {
      parentRoute = route
      const childRoute = findChildRoute(route, path)
      if (childRoute) {
        matchedRoute = childRoute
        params = {}
        break
      }
    }
    
    // 普通路由匹配
    const routeParams = matchRoute(path, route.path)
    if (routeParams) {
      matchedRoute = route
      params = routeParams
      break
    }
  }
  
  if (!matchedRoute) {
    matchedRoute = routes.find(r => r.path === '*')
  }
  
  return { matchedRoute, parentRoute, params }
}

// 模拟实际的路径提取（从 hash 中提取 path，去掉查询参数）
function parseHash(hash) {
  const [pathPart, queryPart] = hash.slice(1).split('?')
  return pathPart || '/'
}

// 测试框架
const tests = []
function test(name, fn) {
  tests.push({ name, fn })
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`)
  }
}

// 定义测试用例
test('普通路由：访问首页', () => {
  const result = findRoute('/')
  assert(result.matchedRoute.name === 'public', '应该匹配 public 路由')
  assert(result.parentRoute === null, '不应有父路由')
})

test('普通路由：访问登录页', () => {
  const result = findRoute('/login')
  assert(result.matchedRoute.name === 'login', '应该匹配 login 路由')
  assert(result.parentRoute === null, '不应有父路由')
})

test('嵌套路由：访问仪表盘', () => {
  const result = findRoute('/admin/dashboard')
  assert(result.matchedRoute.name === 'admin-dashboard', '应该匹配 admin-dashboard')
  assert(result.parentRoute.name === 'admin', '父路由应该是 admin')
})

test('嵌套路由：访问域名管理', () => {
  const result = findRoute('/admin/domains')
  assert(result.matchedRoute.name === 'admin-domains', '应该匹配 admin-domains')
  assert(result.parentRoute.name === 'admin', '父路由应该是 admin')
})

test('嵌套路由：访问系统配置', () => {
  const result = findRoute('/admin/config')
  assert(result.matchedRoute.name === 'admin-config', '应该匹配 admin-config')
  assert(result.parentRoute.name === 'admin', '父路由应该是 admin')
})

test('嵌套路由：访问历史记录', () => {
  const result = findRoute('/admin/history')
  assert(result.matchedRoute.name === 'admin-history', '应该匹配 admin-history')
  assert(result.parentRoute.name === 'admin', '父路由应该是 admin')
})

test('嵌套路由：访问统计概览', () => {
  const result = findRoute('/admin/stats')
  assert(result.matchedRoute.name === 'admin-stats', '应该匹配 admin-stats')
  assert(result.parentRoute.name === 'admin', '父路由应该是 admin')
})

test('未知子路由：返回 404', () => {
  const result = findRoute('/admin/unknown')
  assert(result.matchedRoute.name === 'notfound', '应该匹配 404')
})

test('未知路由：返回 404', () => {
  const result = findRoute('/unknown')
  assert(result.matchedRoute.name === 'notfound', '应该匹配 404')
})

test('带查询参数的路由', () => {
  // 实际场景中，hashchange 事件会先提取 path 部分
  const hash = '#/admin/domains?page=1&size=10'
  const path = parseHash(hash)  // 提取出 '/admin/domains'
  const result = findRoute(path)
  assert(result.matchedRoute.name === 'admin-domains', '应该匹配 admin-domains')
  assert(result.parentRoute.name === 'admin', '父路由应该是 admin')
})

test('动态参数路由（模拟）', () => {
  const params = matchRoute('/domain/abc123', '/domain/:id')
  assert(params && params.id === 'abc123', '应该提取参数 id')
})

// 运行测试
console.log("╔══════════════════════════════════════════════════════╗")
console.log("║           路由系统单元测试                            ║")
console.log("╚══════════════════════════════════════════════════════╝")
console.log("")

let passed = 0
let failed = 0
const errors = []

tests.forEach(({ name, fn }) => {
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (error) {
    console.log(`❌ ${name}`)
    console.log(`   ${error.message}`)
    failed++
    errors.push({ name, error: error.message })
  }
})

console.log("")
console.log("═══════════════════════════════════════════════════════")
console.log(`结果：${passed} 通过 / ${tests.length} 总计`)
if (failed > 0) {
  console.log(`失败：${failed}`)
  console.log("")
  console.log("错误详情:")
  errors.forEach(({ name, error }) => {
    console.log(`  - ${name}: ${error.message}`)
  })
} else {
  console.log("✅ 所有测试通过！")
}
console.log("═══════════════════════════════════════════════════════")

process.exit(failed > 0 ? 1 : 0)
