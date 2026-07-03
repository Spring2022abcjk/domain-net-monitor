/**
 * 管理后台顶部栏组件
 * 任务 16：面包屑导航、用户信息、退出按钮
 */
import { getCurrentUser } from '../../utils/storage.js'

export function Topbar() {
  const user = getCurrentUser()

  // 面包屑生成（根据当前路径）
  const crumbs = generateBreadcrumbs(window.location.hash)

  return `
    <header class="dm-topbar h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <!-- 左侧：菜单按钮 + 面包屑 -->
      <div class="flex items-center gap-4">
        <button 
          id="topbar-menu-btn"
          class="lg:hidden text-gray-500 hover:text-gray-700"
          aria-label="切换菜单"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        ${
          crumbs.length > 0
            ? `
          <nav class="hidden sm:flex items-center gap-2 text-sm text-gray-500" aria-label="面包屑导航">
            ${crumbs
              .map(
                (crumb, index) => `
              ${index > 0 ? '<span class="text-gray-400">/</span>' : ''}
              ${
                index === crumbs.length - 1
                  ? `<span class="text-gray-900 font-medium">${crumb.label}</span>`
                  : `<a href="#${crumb.path}" class="hover:text-gray-900">${crumb.label}</a>`
              }
            `,
              )
              .join('')}
          </nav>
        `
            : ''
        }
      </div>
      
      <!-- 右侧：用户信息 + 退出 -->
      <div class="flex items-center gap-4">
        ${
          user?.endpoint
            ? `
          <div class="hidden md:flex items-center gap-2 text-sm text-gray-600">
            <span class="text-gray-400">|</span>
            <span>${user.endpoint.replace(/^https?:\/\//, '').split('/')[0]}</span>
          </div>
        `
            : ''
        }
        
        <button 
          id="topbar-logout-btn"
          class="dm-btn dm-btn-secondary dm-btn-sm flex items-center gap-2"
          aria-label="退出登录"
        >
          <span>🚪</span>
          <span class="hidden sm:inline">退出</span>
        </button>
      </div>
    </header>
  `
}

/**
 * 生成面包屑导航
 * @param {string} hash - 当前 hash 路径
 * @returns {Array} 面包屑数组
 */
function generateBreadcrumbs(hash) {
  const path = hash.replace('#', '')
  const parts = path.split('/').filter(Boolean)

  const crumbMap = {
    admin: '管理后台',
    dashboard: '仪表盘',
    domains: '域名管理',
    config: '系统配置',
    history: '历史记录',
  }

  /** @type {Array<{path: string, label: string}>} */
  const crumbs = []
  let accumulatedPath = ''

  parts.forEach((part) => {
    accumulatedPath += '/' + part
    crumbs.push({
      path: accumulatedPath,
      label: crumbMap[part] || part,
    })
  })

  return crumbs
}

export default Topbar
