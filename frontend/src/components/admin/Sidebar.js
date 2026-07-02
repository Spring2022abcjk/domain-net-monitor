/**
 * 管理后台侧边栏组件
 * 任务 16：配置式导航菜单，响应式设计
 * @param {Object} props - 属性
 * @param {boolean} [props.open=false] - 是否展开（移动端）
 */
export function Sidebar({ open = false }) {
  // 导航菜单配置（集中管理，易于扩展）
  const navItems = [
    {
      path: '/admin/dashboard',
      icon: '📊',
      label: '仪表盘',
      active: window.location.hash === '#/admin/dashboard',
    },
    {
      path: '/admin/domains',
      icon: '🌐',
      label: '域名管理',
      active: window.location.hash.startsWith('#/admin/domains'),
    },
    {
      path: '/admin/config',
      icon: '⚙️',
      label: '系统配置',
      active: window.location.hash.startsWith('#/admin/config'),
    },
    {
      path: '/admin/history',
      icon: '📜',
      label: '历史记录',
      active: window.location.hash.startsWith('#/admin/history'),
    },
    {
      path: '/admin/stats',
      icon: '📈',
      label: '统计概览',
      active: window.location.hash.startsWith('#/admin/stats'),
    },
  ]

  const activeClass = 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
  const inactiveClass = 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'

  return `
    <aside 
      class="dm-sidebar fixed lg:static inset-y-0 left-0 z-30 w-60 bg-white border-r border-gray-200 transform ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out flex flex-col"
    >
      <!-- Logo 区域 -->
      <div class="h-16 flex items-center justify-center border-b border-gray-200 px-4">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🔐</span>
          <span class="text-lg font-bold text-gray-900">域名监控</span>
        </div>
        ${
          open
            ? `
          <button 
            id="sidebar-close-btn"
            class="lg:hidden ml-auto text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        `
            : ''
        }
      </div>
      
      <!-- 导航菜单 -->
      <nav class="flex-1 overflow-y-auto py-4">
        ${navItems
          .map(
            (item) => `
          <a
            href="#${item.path}"
            class="dm-nav-item flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${item.active ? activeClass : inactiveClass}"
            onclick="${item.active ? 'event.preventDefault()' : ''}"
          >
            <span class="text-lg">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `,
          )
          .join('')}
      </nav>
      
      <!-- 底部信息 -->
      <div class="p-4 border-t border-gray-200">
        <div class="flex items-center gap-3 text-xs text-gray-500">
          <div class="w-2 h-2 rounded-full bg-green-500"></div>
          <span>系统运行正常</span>
        </div>
      </div>
    </aside>
  `
}

export default Sidebar
