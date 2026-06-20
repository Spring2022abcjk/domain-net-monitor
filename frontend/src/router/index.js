/**
 * 路由系统 - 配置式实现（支持嵌套路由）
 * 任务 16：实现嵌套路由，支持 AdminLayout 包裹子页面
 */
import { routes } from './routes.js'
import { matchRoute, getQueryParams } from './utils.js'
import { isLoggedIn } from '../utils/storage.js'

// 当前页面实例，用于清理
let currentPageInstance = null

/**
 * 清理当前页面
 */
function cleanupCurrentPage() {
  if (currentPageInstance && currentPageInstance.destroy) {
    currentPageInstance.destroy()
  }
  currentPageInstance = null
}

/**
 * 导航到指定路径
 * @param {string} path - 路径
 */
export function navigateTo(path) {
  window.location.hash = path
}

/**
 * 获取当前页面
 * @returns {Object|null} 页面对象
 */
export function getCurrentPage() {
  return currentPageInstance
}

/**
 * 处理 404
 */
function handleNotFound() {
  const notFoundRoute = routes.find(r => r.path === '/404')
  if (notFoundRoute) {
    renderRoute(notFoundRoute, {}, new URLSearchParams())
  }
}

/**
 * 查找嵌套的子路由
 * @param {Object} parentRoute - 父路由
 * @param {string} fullPath - 完整路径（如 /admin/dashboard）
 * @returns {Object|null} 子路由对象
 */
function findChildRoute(parentRoute, fullPath) {
  if (!parentRoute.children) return null
  
  // 提取子路径（去掉父路由路径部分）
  const parentPath = parentRoute.path
  const childPath = fullPath.startsWith(parentPath + '/') 
    ? fullPath.slice(parentPath.length + 1)  // +1 是去掉斜杠
    : fullPath
  
  for (const child of parentRoute.children) {
    if (child.path === childPath) return child
  }
  return null
}

/**
 * 渲染路由
 * @param {Object} route - 路由对象
 * @param {Object} params - 路由参数
 * @param {URLSearchParams} query - 查询参数
 * @param {Object} [parentRoute] - 父路由（嵌套场景）
 */
async function renderRoute(route, params, query, parentRoute = null) {
  // 权限检查：需要认证但未登录
  if (route.meta?.requiresAuth && !isLoggedIn()) {
    navigateTo('/login')
    return
  }
  
  // 已登录访问登录页，重定向到首页
  if (route.path === '/login' && isLoggedIn()) {
    navigateTo('/admin/dashboard')
    return
  }
  
  // 设置页面标题
  if (route.meta?.title) {
    document.title = route.meta.title
  } else if (parentRoute?.meta?.title) {
    document.title = parentRoute.meta.title
  }
  
  // 清理旧页面
  cleanupCurrentPage()
  
  // 渲染新页面
  const app = document.getElementById('app')
  if (!app) {
    console.error('[Router] App mount point not found')
    return
  }
  
  // === 处理嵌套路由 ===
  if (parentRoute && route !== parentRoute) {
    let ParentComponent
    
    // 动态导入父组件（嵌套路由的布局）
    if (typeof parentRoute.component === 'function') {
      try {
        const module = await parentRoute.component()
        console.log('[Router] Loaded parent module:', parentRoute.name, module)
        ParentComponent = module.default || module[Object.keys(module)[0]]
        console.log('[Router] ParentComponent resolved:', ParentComponent)
      } catch (error) {
        console.error('[Router] Failed to load parent component:', error)
        throw error
      }
    } else {
      ParentComponent = parentRoute.component
    }
    
    let ChildComponent
    if (typeof route.component === 'function') {
      try {
        const module = await route.component()
        console.log('[Router] Loaded child module:', route.name, module)
        ChildComponent = module.default || module[Object.keys(module)[0]]
        console.log('[Router] ChildComponent resolved:', ChildComponent)
      } catch (error) {
        console.error('[Router] Failed to load child component:', error)
        throw error
      }
    } else {
      ChildComponent = route.component
    }
    
    currentPageInstance = new ParentComponent(ChildComponent)
  } else {
    // 普通路由（支持懒加载）
    let PageComponent
    if (typeof route.component === 'function') {
      try {
        const module = await route.component()
        console.log('[Router] Loaded module:', route.name, module)
        PageComponent = module.default || module[Object.keys(module)[0]]
        console.log('[Router] PageComponent resolved:', PageComponent)
      } catch (error) {
        console.error('[Router] Failed to load component:', error)
        throw error
      }
    } else {
      PageComponent = route.component
    }
    currentPageInstance = new PageComponent()
  }
  
  // 初始化页面
  if (currentPageInstance.init) {
    await currentPageInstance.init({ params, query })
  }
  
  // 渲染（如果是 Layout，会自己 render 和 bindEvents）
  if (currentPageInstance.render) {
    app.innerHTML = currentPageInstance.render()
    if (currentPageInstance.bindEvents) {
      currentPageInstance.bindEvents()
    }
  }
  
  console.log('[Router] Rendered:', route.name, parentRoute ? `(parent: ${parentRoute.name})` : '')
}

/**
 * 初始化路由
 */
export async function init() {
  // 处理 hashchange 事件
  window.addEventListener('hashchange', async () => {
    const hash = window.location.hash || '#/'
    const [pathPart, queryPart] = hash.slice(1).split('?')
    const path = pathPart || '/'
    const query = new URLSearchParams(queryPart || '')
    
    // 查找匹配的路由
    let matchedRoute = null
    let parentRoute = null
    let params = {}
    
    // 优先匹配具体路由
    for (const route of routes) {
      if (route.path === '*') continue // 通配符最后处理
      
      // 检查是否是嵌套路由的父路由（如 /admin）
      if (route.children && path.startsWith(route.path + '/')) {
        parentRoute = route
        const childRoute = findChildRoute(route, path)
        if (childRoute) {
          matchedRoute = childRoute
          params = {} // 子路由暂时不支持动态参数
          console.log('[Router] Matched child route:', childRoute.name, '(parent:', parentRoute.name + ')')
          break
        } else {
          console.warn('[Router] Child route not found for path:', path, 'in parent:', route.path)
          // 父路由匹配但子路由不存在，继续查找其他路由
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
    
    // 未找到 match，使用通配符路由或 404
    if (!matchedRoute) {
      const catchAllRoute = routes.find(r => r.path === '*')
      if (catchAllRoute) {
        matchedRoute = catchAllRoute
      } else {
        handleNotFound()
        return
      }
    }
    
    // 渲染路由
    await renderRoute(matchedRoute, params, query, parentRoute)
  })
  
  // 触发初始路由
  window.dispatchEvent(new Event('hashchange'))
  
  console.log('[Router] Initialized with', routes.length, 'routes')
}
