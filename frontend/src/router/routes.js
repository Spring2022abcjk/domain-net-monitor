/**
 * 配置式路由表
 * 支持嵌套路由（/admin 为父路由）
 */
export const routes = [
  {
    path: '/',
    component: () => import('../pages/PublicDashboard.js'),
    meta: { requiresAuth: false, title: '首页' }
  },
  {
    path: '/login',
    component: () => import('../pages/Login.js'),
    meta: { requiresAuth: false, title: '登录' }
  },
  {
    path: '/admin',
    component: () => import('../pages/admin/AdminLayout.js'),
    meta: { requiresAuth: true, title: '管理后台' },
    children: [
      {
        path: '/dashboard',
        component: () => import('../pages/admin/AdminDashboard.js'),
        meta: { title: '仪表盘' }
      },
      {
        path: '/domains',
        component: () => import('../pages/admin/AdminDomains.js'),
        meta: { title: '域名管理' }
      },
      {
        path: '/config',
        component: () => import('../pages/admin/AdminConfig.js'),
        meta: { title: '系统配置' }
      },
      {
        path: '/history',
        component: () => import('../pages/admin/AdminHistory.js'),
        meta: { title: '历史记录' }
      }
    ]
  },
  {
    path: '*',
    component: () => import('../pages/NotFound.js'),
    meta: { title: '404 - Not Found' }
  }
]

export default routes
