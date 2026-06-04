/**
 * 路由配置表
 * 任务 15：添加登录页路由
 * 任务 16：添加管理后台嵌套路由
 */
import PublicDashboard from '../pages/PublicDashboard.js'
import Login from '../pages/Login.js'
import NotFound from '../pages/NotFound.js'

/**
 * 路由配置
 * @typedef {Object} Route
 * @property {string} path - 路由路径
 * @property {string} name - 路由名称
 * @property {Object} component - 页面对象
 * @property {Object} [meta] - 路由元数据
 * @property {string} [meta.title] - 页面标题
 * @property {boolean} [meta.requiresAuth] - 是否需要登录
 * @property {Array} [children] - 子路由（用于嵌套布局）
 */
export const routes = [
  // === 公开路由 ===
  {
    path: '/',
    name: 'public-dashboard',
    component: PublicDashboard,
    meta: {
      title: '域名监控平台',
      requiresAuth: false
    }
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      title: '管理员登录',
      requiresAuth: false
    }
  },
  
  // === 管理后台路由（嵌套结构）===
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../pages/admin/AdminLayout.js'),
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: '/admin/dashboard',
        name: 'admin-dashboard',
        component: () => import('../pages/admin/AdminDashboard.js'),
        meta: { title: '仪表盘' }
      },
      {
        path: '/admin/domains',
        name: 'admin-domains',
        component: () => import('../pages/admin/AdminDomains.js'),
        meta: { title: '域名管理' }
      },
      {
        path: '/admin/config',
        name: 'admin-config',
        component: () => import('../pages/admin/AdminConfig.js'),
        meta: { title: '系统配置' }
      },
      {
        path: '/admin/history',
        name: 'admin-history',
        component: () => import('../pages/admin/AdminHistory.js'),
        meta: { title: '历史记录' }
      }
    ]
  },
  
  // === 404 ===
  {
    path: '*',
    name: 'catch-all',
    component: NotFound,
    meta: {
      title: '页面不存在'
    }
  }
]

export default routes
