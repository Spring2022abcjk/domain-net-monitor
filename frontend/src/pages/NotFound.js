/**
 * 404 页面
 */
export class NotFound {
  render() {
    return `
      <div class="max-w-2xl mx-auto mt-20 text-center">
        <div class="dm-card">
          <h1 class="text-8xl font-bold text-gray-200 mb-4">404</h1>
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">
            页面不存在
          </h2>
          <p class="text-gray-600 mb-8">
            抱歉，您访问的页面不存在或已被移除
          </p>
          <button
            onclick="window.location.hash='/'"
            class="dm-btn dm-btn-primary"
          >
            返回首页
          </button>
        </div>
      </div>
    `
  }
}

export default NotFound
