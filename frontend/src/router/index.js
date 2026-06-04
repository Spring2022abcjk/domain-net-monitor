/**
 * 路由系统 - 配置式实现
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
 * 渲染路由
 * @param {Object} route - 路由对象
 * @param {Object} params - 路由参数
 * @param {URLSearchParams} query - 查询参数
 */
function renderRoute(route, params, query) {
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
  }
  
  // 清理旧页面
  cleanupCurrentPage()
  
  // 渲染新页面
  const app = document.getElementById('app')
  if (!app) {
    console.error('[Router] App mount point not found')
    return
  }
  
  app.innerHTML = route.component.render()
  
  // 保存页面实例并初始化
  currentPageInstance = route.component
  if (currentPageInstance.init) {
    currentPageInstance.init({ params, query })
  }
  
  console.log('[Router] Rendered:', route.name)
}

/**
 * 初始化路由
 */
export function init() {
  // 处理 hashchange 事件
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash || '#/'
    const [pathPart, queryPart] = hash.slice(1).split('?')
    const path = pathPart || '/'
    const query = new URLSearchParams(queryPart || '')
    
    // 查找匹配的路由
    let matchedRoute = null
    let params = {}
    
    // 优先匹配具体路由
    for (const route of routes) {
      if (route.path === '*') continue // 通配符最后处理
      
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
    renderRoute(matchedRoute, params, query)
  })
  
  // 触发初始路由
  window.dispatchEvent(new Event('hashchange'))
  
  console.log('[Router] Initialized with', routes.length, 'routes')
}
