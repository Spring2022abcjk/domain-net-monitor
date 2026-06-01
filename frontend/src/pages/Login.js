/**
 * 登录页面
 */
import { setApiEndpoint, setApiToken } from '../utils/storage.js'

export default {
  render() {
    return `
      <div class="max-w-md mx-auto mt-12">
        <div class="card">
          <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">
            🔐 管理员登录
          </h1>
          
           <form id="loginForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                API 端点
              </label>
              <input 
                type="url" 
                id="apiEndpoint"
                placeholder="https://your-worker.workers.dev" 
                class="dm-input"
                required
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                API Token
              </label>
              <input 
                type="password" 
                id="apiToken"
                placeholder="输入你的 API Token" 
                class="dm-input"
                required
              />
            </div>
            
            <div id="errorMessage" class="hidden text-danger text-sm"></div>
            <div id="successMessage" class="hidden text-success text-sm"></div>
            
            <button 
              type="submit" 
              class="dm-btn dm-btn-primary w-full"
              id="submitBtn"
            >
              登录
            </button>
          </form>
          
          <div class="mt-6 pt-6 border-t border-gray-200">
            <p class="text-sm text-gray-600 text-center">
              登录后可以管理域名、配置检测、查看历史记录
            </p>
          </div>
        </div>
      </div>
    `
  },
  
  /**
   * 显示通知
   * @param {string} message - 通知内容
   * @param {boolean} isError - 是否为错误
   */
  showMessage(message, isError = false) {
    const errorDiv = document.getElementById('errorMessage')
    const successDiv = document.getElementById('successMessage')
    const submitBtn = document.getElementById('submitBtn')
    
    if (isError) {
      errorDiv.textContent = message
      errorDiv.classList.remove('hidden')
      successDiv.classList.add('hidden')
    } else {
      successDiv.textContent = message
      successDiv.classList.remove('hidden')
      errorDiv.classList.add('hidden')
    }
    
    // 禁用按钮防止重复提交
    submitBtn.disabled = true
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed')
    
    // 3 秒后恢复
    setTimeout(() => {
      submitBtn.disabled = false
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed')
      errorDiv.classList.add('hidden')
      successDiv.classList.add('hidden')
    }, 3000)
  },
  
  init() {
    const form = document.getElementById('loginForm')
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      const apiEndpoint = document.getElementById('apiEndpoint').value.trim()
      const apiToken = document.getElementById('apiToken').value.trim()
      
      // 验证输入
      if (!apiEndpoint || !apiToken) {
        this.showMessage('请输入 API 端点和 Token', true)
        return
      }
      
      // 验证 URL 格式
      try {
        new URL(apiEndpoint)
      } catch (e) {
        this.showMessage('API 端点格式不正确，请输入完整的 URL', true)
        return
      }
      
      // 保存登录信息（使用统一的 storage API）
      setApiEndpoint(apiEndpoint)
      setApiToken(apiToken)
      
      // TODO: 调用 API 验证 Token
      try {
        console.log('[Login] Attempting login:', { apiEndpoint, apiToken })
        
        // 这里调用 API 验证
        // const response = await post(`${apiEndpoint}/api/admin/auth/verify`, {})
        
        // 临时成功提示
        this.showMessage('登录成功！正在跳转...')
        
        // 延迟跳转让用户看到成功提示
        setTimeout(() => {
          window.location.hash = '/'
        }, 500)
      } catch (error) {
        this.showMessage(error.message || '登录失败，请检查端点和 Token', true)
      }
    })
    
    console.log('[Login] Page initialized')
  }
}
