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
    this.sidebarOpen = false // 移动端控制
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
      const AdminDashboard = (await import('./AdminDashboard.js')).default
      this.childComponent = AdminDashboard
    }
    
    // 创建子页面实例
    this.childInstance = new this.childComponent()
    this.childInstance.init(params, queryParams)
    
    // 绑定全局事件处理器
    this.bindGlobalHandlers()
    
    this.render()
    this.bindEvents()
  }
  
  /**
   * 渲染布局框架 + 子页面内容
   */
  render() {
    const app = document.getElementById('app')
    if (!app) return
    
    app.innerHTML = `
      <div class="dm-admin-layout flex h-screen bg-gray-100">
        ${Sidebar({ 
          open: this.sidebarOpen,
          onClose: () => this.toggleSidebar()
        })}
        
        <div class="flex-1 flex flex-col overflow-hidden">
          ${Topbar({
            onMenuClick: () => this.toggleSidebar(),
            onLogout: () => this.handleLogout()
          })}
          
          <main id="admin-content" class="flex-1 overflow-auto p-6">
            ${this.childInstance?.render ? this.childInstance.render() : '<div class="text-center py-12">加载中...</div>'}
          </main>
        </div>
        
        <!-- 移动端遮罩 -->
        ${this.sidebarOpen ? `
          <div 
            class="dm-sidebar-overlay fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onclick="window.__sidebarCloseHandler()"
          ></div>
        ` : ''}
      </div>
    `
  }
  
  /**
   * 绑定事件：子页面事件由子页面自己绑定
   */
  bindEvents() {
    // 绑定子页面事件
    if (this.childInstance?.bindEvents) {
      this.childInstance.bindEvents()
    }
  }
  
  /**
   * 绑定全局事件处理器
   */
  bindGlobalHandlers() {
    // Sidebar 切换
    window.__sidebarToggleHandler = () => this.toggleSidebar()
    
    // Sidebar 关闭
    window.__sidebarCloseHandler = () => {
      this.sidebarOpen = false
      this.render()
      this.bindEvents()
    }
    
    // 退出登录
    window.__topbarOnLogout = () => this.handleLogout()
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
   * 清理：调用子页面 destroy
   */
  destroy() {
    if (this.childInstance?.destroy) {
      this.childInstance.destroy()
    }
    this.childInstance = null
    
    // 清理全局处理器
    window.__sidebarToggleHandler = null
    window.__sidebarCloseHandler = null
    window.__topbarOnLogout = null
  }
}

export default AdminLayout
