/**
 * 路由配置表
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
 */
export const routes = [
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
  {
    path: '*',
    name: 'catch-all',
    component: NotFound,
    meta: {
      title: '页面不存在'
    }
  }
  // 后续扩展:
  // {
  //   path: '/domain/:name',
  //   name: 'domain-detail',
  //   component: DomainDetail,
  //   meta: {
  //     title: '域名详情',
  //     requiresAuth: true
  //   }
  // }
]

export default routes
