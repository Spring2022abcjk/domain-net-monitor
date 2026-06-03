/**
 * 页脚组件
 */
export function Footer() {
  const year = new Date().getFullYear()
  return `
    <footer class="dm-footer mt-auto py-6 border-t border-gray-200 bg-white">
      <div class="container mx-auto px-4">
        <div class="text-center text-sm text-gray-500">
          <p>&copy; ${year} 域名监控平台。All rights reserved.</p>
          <p class="mt-1 text-xs text-gray-400">Powered by Cloudflare Workers</p>
        </div>
      </div>
    </footer>
  `
}

export default Footer
