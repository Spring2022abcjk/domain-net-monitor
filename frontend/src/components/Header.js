/**
 * 页面头部组件
 */
export default {
  render() {
    return `
      <header class="bg-white border-b border-gray-200">
        <div class="container mx-auto px-4">
          <div class="flex items-center justify-between h-16">
            <a href="#/" class="text-xl font-bold text-primary-600">
              🌐 域名监控
            </a>
            <nav class="flex items-center gap-4">
              <a href="#/" class="text-gray-600 hover:text-gray-900">首页</a>
              <a href="#/login" class="btn btn-primary">管理登录</a>
            </nav>
          </div>
        </div>
      </header>
    `
  },
}
