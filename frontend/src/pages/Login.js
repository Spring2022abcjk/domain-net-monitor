/**
 * 管理后台登录页
 * 任务 15：使用新组件库重构，实现 API Token 验证
 */
import { Input } from '../components/Input.js'
import { Button } from '../components/Button.js'
import { Card } from '../components/Card.js'
import { show } from '../components/Notification.js'
import { post } from '../utils/api.js'
import { 
  setApiEndpoint, 
  setApiToken, 
  isLoggedIn,
  getApiEndpoint,
  getApiToken
} from '../utils/storage.js'

/**
 * 登录页面类
 */
export class LoginPage {
  constructor() {
    this.loading = false
    this.formData = {
      endpoint: '',
      token: ''
    }
  }
  
  /**
   * 初始化页面
   */
  async init() {
    // 检查是否已登录
    if (isLoggedIn()) {
      const endpoint = getApiEndpoint()
      // 验证 Token 是否仍然有效
      try {
        await post(`${endpoint}/api/admin/auth/verify`, {}, {
          Authorization: `Bearer ${getApiToken()}`
        })
        // Token 有效，跳转到管理后台
        window.location.hash = '/admin/dashboard'
        return
      } catch (error) {
        // Token 失效，清除登录状态
        console.warn('[Login] Token expired, clearing auth')
      }
    }
    
    this.render()
    this.bindEvents()
  }
  
  /**
   * 渲染页面
   */
  render() {
    const app = document.getElementById('app')
    if (!app) return
    
    app.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        ${Card({
          content: `
            <div class="text-center mb-6">
              <div class="text-5xl mb-3">🔐</div>
              <h1 class="text-2xl font-bold text-gray-900">管理员登录</h1>
              <p class="text-sm text-gray-600 mt-2">
                登录后可以管理域名、配置检测、查看历史记录
              </p>
            </div>
            
            <form id="loginForm" class="space-y-4">
              ${Input({
                type: 'url',
                id: 'apiEndpoint',
                label: 'API 端点',
                placeholder: 'https://your-worker.workers.dev',
                required: true,
                value: this.formData.endpoint,
                autocomplete: 'url'
              })}
              
              ${Input({
                type: 'password',
                id: 'apiToken',
                label: 'API Token',
                placeholder: '输入你的 API Token',
                required: true,
                value: this.formData.token,
                autocomplete: 'current-password'
              })}
              
              ${Button({
                text: this.loading ? '登录中...' : '登录',
                variant: 'primary',
                size: 'lg',
                disabled: this.loading,
                loading: this.loading,
                id: 'submitBtn',
                data: { fullwidth: 'true' }
              })}
            </form>
            
            <div class="mt-6 pt-6 border-t border-gray-200">
              <p class="text-sm text-gray-600 text-center">
                提示：Token 将保存在本地，仅用于 API 认证
              </p>
              <p class="text-xs text-gray-500 text-center mt-2">
                还没有 Worker？
                <a href="https://github.com/chaitin/cloudflare-worker-domain-monitor" 
                   target="_blank"
                   class="text-blue-600 hover:underline">
                  查看部署指南
                </a>
              </p>
            </div>
          `
        })}
      </div>
    `
  }
  
  /**
   * 绑定事件
   */
  bindEvents() {
    const form = document.getElementById('loginForm')
    if (!form) return
    
    form.addEventListener('submit', (e) => this.handleSubmit(e))
    
    // 支持回车提交
    const inputs = form.querySelectorAll('input')
    inputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          form.dispatchEvent(new Event('submit'))
        }
      })
    })
  }
  
  /**
   * 处理表单提交
   * @param {Event} e - 提交事件
   */
  async handleSubmit(e) {
    e.preventDefault()
    
    if (this.loading) return
    
    const endpointInput = document.getElementById('apiEndpoint')
    const tokenInput = document.getElementById('apiToken')
    
    if (!endpointInput || !tokenInput) return
    
    const endpoint = endpointInput.value.trim()
    const token = tokenInput.value.trim()
    
    // 验证输入
    if (!endpoint || !token) {
      show.error('请输入 API 端点和 Token')
      endpointInput.focus()
      return
    }
    
    // 验证 URL 格式
    try {
      new URL(endpoint)
    } catch (e) {
      show.error('API 端点格式不正确，请输入完整的 URL（包含 https://）')
      endpointInput.focus()
      return
    }
    
    // 验证 Token 长度（至少 10 个字符）
    if (token.length < 10) {
      show.error('Token 格式不正确，请检查是否复制完整')
      tokenInput.focus()
      return
    }
    
    // 开始登录流程
    this.setLoading(true)
    
    try {
      // 调用 API 验证 Token
      const response = await post(`${endpoint}/api/admin/auth/verify`, {}, {
        Authorization: `Bearer ${token}`
      })
      
      if (response.code === 200 && response.data?.valid) {
        // 验证成功，保存凭证
        setApiEndpoint(endpoint)
        setApiToken(token)
        
        show.success('登录成功！正在跳转...')
        
        // 延迟跳转
        setTimeout(() => {
          window.location.hash = '/admin/dashboard'
        }, 800)
      } else {
        // 验证失败
        show.error(response.msg || 'Token 验证失败')
        this.setLoading(false)
      }
    } catch (error) {
      console.error('[Login] Login failed:', error)
      
      // 错误分类处理
      let errorMessage = '登录失败'
      
      if (error.status === 401) {
        errorMessage = 'Token 无效或已过期，请检查后重试'
      } else if (error.status === 403) {
        errorMessage = 'Token 权限不足，请确认 Token 具有管理员权限'
      } else if (error.status === 404) {
        errorMessage = 'API 端点不存在，请检查 URL 是否正确'
      } else if (error.status === 0 || error.message?.includes('Network')) {
        errorMessage = '网络连接失败，请确认：API 端点可访问、已启用 HTTPS、浏览器允许跨域请求'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      show.error(errorMessage)
      this.setLoading(false)
    }
  }
  
  /**
   * 设置加载状态
   * @param {boolean} loading - 是否加载中
   */
  setLoading(loading) {
    this.loading = loading
    const btn = document.getElementById('submitBtn')
    if (btn) {
      btn.disabled = loading
      btn.textContent = loading ? '登录中...' : '登录'
    }
  }
  
  /**
   * 清理资源
   */
  destroy() {
    this.loading = false
  }
}

export default LoginPage
