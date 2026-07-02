/**
 * 配置式路由表
 * 支持嵌套路由（/admin 为父路由）
 */
export const routes = [
  {
    name: 'public',
    path: '/',
    component: () => import('../pages/PublicDashboard.js'),
    meta: { requiresAuth: false, title: '首页' },
  },
  {
    name: 'domain-detail',
    path: '/domain/:domain',
    component: () => import('../pages/DomainDetail.js'),
    meta: { requiresAuth: false, title: '域名详情' },
  },
  {
    name: 'login',
    path: '/login',
    component: () => import('../pages/Login.js'),
    meta: { requiresAuth: false, title: '登录' },
  },
  {
    name: 'admin',
    path: '/admin',
    component: () => import('../pages/admin/AdminLayout.js'),
    meta: { requiresAuth: true, title: '管理后台' },
    children: [
      {
        name: 'admin-dashboard',
        path: 'dashboard',
        component: () => import('../pages/admin/AdminDashboard.js'),
        meta: { title: '仪表盘' },
      },
      {
        name: 'admin-domains',
        path: 'domains',
        component: () => import('../pages/admin/AdminDomains.js'),
        meta: { title: '域名管理' },
      },
      {
        name: 'admin-config',
        path: 'config',
        component: () => import('../pages/admin/AdminConfig.js'),
        meta: { title: '系统配置' },
      },
      {
        name: 'admin-history',
        path: 'history',
        component: () => import('../pages/admin/AdminHistory.js'),
        meta: { title: '历史记录' },
      },
      {
        name: 'admin-stats',
        path: 'stats',
        component: () => import('../pages/admin/AdminStats.js'),
        meta: { title: '统计概览' },
      },
    ],
  },
  {
    name: 'notfound',
    path: '*',
    component: () => import('../pages/NotFound.js'),
    meta: { title: '404 - Not Found' },
  },
]

export default routes
