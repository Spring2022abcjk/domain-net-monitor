import Home from '../pages/Home.js'
import Login from '../pages/Login.js'

/**
 * 路由配置
 */
const routes = {
  '/': Home,
  '/home': Home,
  '/login': Login
}

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
 * 获取当前页面
 * @returns {Object} 页面对象
 */
export function getCurrentPage() {
  const hash = window.location.hash || '#/'
  const path = hash.slice(1) || '/'
  
  return routes[path] || Home
}

/**
 * 导航到指定路径
 * @param {string} path - 路径
 */
export function navigate(path) {
  window.location.hash = path
}

/**
 * 渲染页面
 * @param {Object} page - 页面对象
 */
function renderPage(page) {
  const app = document.getElementById('app')
  if (!app) {
    console.error('[Router] App mount point not found')
    return
  }
  
  // 清理旧页面
  cleanupCurrentPage()
  
  // 渲染新页面
  app.innerHTML = page.render()
  
  // 保存页面实例并初始化
  currentPageInstance = page
  if (page.init) {
    page.init()
  }
}

/**
 * 初始化路由
 */
export function init() {
  // 初始渲染
  const page = getCurrentPage()
  renderPage(page)
  
  // 监听 hash 变化
  window.addEventListener('hashchange', () => {
    const page = getCurrentPage()
    renderPage(page)
  })
  
  console.log('[Router] Initialized')
}
