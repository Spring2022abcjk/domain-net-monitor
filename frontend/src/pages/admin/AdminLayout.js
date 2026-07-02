/**
 * 管理后台主布局组件
 * 任务 16：包裹所有管理后台子页面，提供 Sidebar + Topbar + Content 结构
 */
import { Sidebar } from '../../components/admin/Sidebar.js'
import { Topbar } from '../../components/admin/Topbar.js'
import { show } from '../../components/Notification.js'
import { isLoggedIn, clearAuth } from '../../utils/storage.js'

/**
 * 管理后台布局类
 */
export class AdminLayout {
  constructor(childComponent) {
    this.childComponent = childComponent
    this.childInstance = null
    this.sidebarOpen = false
    this.__sidebarToggleHandler = () => this.toggleSidebar()
    this.__topbarLogoutHandler = () => this.handleLogout()
    this.__sidebarCloseHandler = () => this.closeSidebar()
  }

  /**
   * 初始化：检查认证、创建子页面实例
   * @param {Object} params - 路由参数
   * @param {Object} queryParams - 查询参数
   */
  async init(params, queryParams) {
    // 认证检查（双重保险，路由守卫已检查）
    if (!isLoggedIn()) {
      show.error('请先登录')
      window.location.hash = '/login'
      return
    }

    // 子页面不存在时显示 Dashboard
    if (!this.childComponent) {
      try {
        const module = await import('./AdminDashboard.js')
        this.childComponent = module.default || module.AdminDashboard
      } catch (error) {
        console.error('[AdminLayout] Failed to load AdminDashboard:', error)
        show.error('加载 Dashboard 失败')
        return
      }
    }

    // 创建子页面实例
    this.childInstance = new this.childComponent()
    await this.childInstance.init(params, queryParams)

    // 绑定全局事件处理器
    this.bindGlobalHandlers()

    this.render()
    this.bindEvents()
  }

  /**
   * 渲染布局框架 + 子页面内容
   */
  render() {
    return `
      <div class="dm-admin-layout flex h-screen bg-gray-100">
        ${Sidebar({ open: this.sidebarOpen })}
        
        <div class="flex-1 flex flex-col overflow-hidden">
          ${Topbar()}
          
          <main id="admin-content" class="flex-1 overflow-auto p-6">
            ${this.childInstance?.render ? this.childInstance.render() : '<div class="text-center py-12">加载中...</div>'}
          </main>
        </div>
        
        <!-- 移动端遮罩 -->
        ${
          this.sidebarOpen
            ? `
          <div 
            id="sidebar-overlay"
            class="dm-sidebar-overlay fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          ></div>
        `
            : ''
        }
      </div>
    `
  }

  /**
   * 绑定事件 — 组件只渲染 HTML，事件在此统一绑定
   */
  bindEvents() {
    const menuBtn = document.getElementById('topbar-menu-btn')
    const logoutBtn = document.getElementById('topbar-logout-btn')
    const closeBtn = document.getElementById('sidebar-close-btn')
    const overlay = document.getElementById('sidebar-overlay')

    menuBtn?.removeEventListener('click', this.__sidebarToggleHandler)
    logoutBtn?.removeEventListener('click', this.__topbarLogoutHandler)
    closeBtn?.removeEventListener('click', this.__sidebarCloseHandler)
    overlay?.removeEventListener('click', this.__sidebarCloseHandler)

    menuBtn?.addEventListener('click', this.__sidebarToggleHandler)
    logoutBtn?.addEventListener('click', this.__topbarLogoutHandler)
    closeBtn?.addEventListener('click', this.__sidebarCloseHandler)
    overlay?.addEventListener('click', this.__sidebarCloseHandler)

    if (this.childInstance?.bindEvents) {
      this.childInstance.bindEvents()
    }
  }

  /**
   * 关闭侧边栏（移动端）
   */
  closeSidebar() {
    this.sidebarOpen = false
    this.render()
    this.bindEvents()
  }

  /**
   * 切换侧边栏（移动端）
   */
  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen
    this.render()
    this.bindEvents()
  }

  /**
   * 退出登录
   */
  async handleLogout() {
    if (!confirm('确定要退出登录吗？')) return

    clearAuth()
    show.success('已退出登录')
    window.location.hash = '/login'
  }

  /**
   * 绑定全局子路由刷新处理器
   */
  bindGlobalHandlers() {
    if (this.childInstance?.bindGlobalHandlers) {
      this.childInstance.bindGlobalHandlers()
    }
  }

  /**
   * 销毁页面
   */
  destroy() {
    document.getElementById('topbar-menu-btn')?.removeEventListener('click', this.__sidebarToggleHandler)
    document.getElementById('topbar-logout-btn')?.removeEventListener('click', this.__topbarLogoutHandler)
    document.getElementById('sidebar-close-btn')?.removeEventListener('click', this.__sidebarCloseHandler)
    document.getElementById('sidebar-overlay')?.removeEventListener('click', this.__sidebarCloseHandler)
    if (this.childInstance?.destroy) {
      this.childInstance.destroy()
    }
  }
}

export default AdminLayout
