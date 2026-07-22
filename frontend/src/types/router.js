/**
 * 路由系统类型定义
 */

/**
 * @typedef {Object} RouteMeta
 * @property {boolean} [requiresAuth] - 是否需要认证
 * @property {string} [title] - 页面标题
 */

/**
 * @typedef {Object} RouteConfig
 * @property {string} name - 路由名称
 * @property {string} path - 路由路径
 * @property {function(): Promise<{default: Function}>|Function} component - 组件（懒加载函数或类）
 * @property {RouteMeta} [meta] - 路由元信息
 * @property {RouteConfig[]} [children] - 子路由
 */

/**
 * @typedef {Object} PageInstance
 * @property {function} [init] - 初始化方法
 * @property {function(): string} render - 渲染方法
 * @property {function} [bindEvents] - 绑定事件
 * @property {function} [destroy] - 销毁方法
 */

export {}
