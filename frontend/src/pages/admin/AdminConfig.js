/**
 * 系统配置页面（占位）
 * 后续任务实现
 */
export class AdminConfig {
  async init() {
    console.log('[AdminConfig] Page initialized')
  }
  
  render() {
    return `
      <div class="space-y-6">
        <h1 class="text-2xl font-bold text-gray-900">系统配置</h1>
        <div class="text-center py-12 text-gray-500">
          功能开发中...
        </div>
      </div>
    `
  }
}

export default AdminConfig
