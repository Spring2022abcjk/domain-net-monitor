/**
 * 页面底部组件
 */
export default {
  render() {
    const year = new Date().getFullYear()
    return `
      <footer class="bg-white border-t border-gray-200 mt-auto">
        <div class="container mx-auto px-4 py-6">
          <div class="text-center text-gray-600 text-sm">
            <p>&copy; ${year} 域名监控平台 · Powered by Cloudflare Workers</p>
          </div>
        </div>
      </footer>
    `
  }
}
