/**
 * 路由配置表
 */
import Home from '../pages/Home.js'
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
    name: 'home',
    component: Home,
    meta: {
      title: '域名网络特性监控 Dashboard'
    }
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      title: '管理员登录'
    }
  },
  {
    path: '/404',
    name: 'not-found',
    component: NotFound,
    meta: {
      title: '页面不存在'
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
