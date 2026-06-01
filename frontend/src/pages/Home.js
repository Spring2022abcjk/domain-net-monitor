/**
 * 公开首页 - Dashboard
 */
export default {
  render() {
    return `
      <div class="space-y-6">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            🌐 域名网络特性监控
          </h1>
          <p class="text-gray-600">
            实时监控域名 DNS 网络特性，支持 DoH、HTTPS RR、ECH、IPv6
          </p>
        </div>
        
        <!-- 默认域名列表 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="dm-card">
            <h3 class="text-lg font-semibold mb-3">cloudflare.com</h3>
            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-gray-600">HTTPS RR</span>
                <span class="text-success">✅ OK</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">ECH</span>
                <span class="text-warning">⚠️ No</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">IPv6</span>
                <span class="text-success">✅ OK</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 搜索框 -->
        <div class="mt-8">
          <h2 class="text-xl font-semibold mb-4">单域名查询</h2>
          <div class="flex gap-2">
            <input 
              type="text" 
              placeholder="输入域名，例如 example.com" 
              class="dm-input flex-1"
            />
            <button class="dm-btn dm-btn-primary">查询</button>
          </div>
        </div>
      </div>
    `
  }
}
