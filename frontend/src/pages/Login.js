/**
 * 管理后台登录页
 * 任务 15：使用新组件库重构，实现 API Token 验证
 */
import { Input } from '../components/Input.js'
import { Button } from '../components/Button.js'
import { Card } from '../components/Card.js'
import { show } from '../components/Notification.js'
import { post } from '../utils/api.js'
import { setApiEndpoint, setApiToken, isLoggedIn, getApiEndpoint } from '../utils/storage.js'
import { getInputValue } from '../utils/dom.js'

/**
 * 登录页面类
 */
export class LoginPage {
  constructor() {
    this.loading = false
    this._redirectTimer = null
    this.formData = {
      endpoint: '',
      token: '',
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
        await post(`${endpoint}/api/admin/auth/verify`, {})
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
    return `
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
                autocomplete: 'url',
              })}
              
              ${Input({
                type: 'password',
                id: 'apiToken',
                label: 'API Token',
                placeholder: '输入你的 API Token',
                required: true,
                value: this.formData.token,
                autocomplete: 'current-password',
              })}
              
              ${Button({
                text: this.loading ? '登录中...' : '登录',
                variant: 'primary',
                size: 'lg',
                disabled: this.loading,
                loading: this.loading,
                id: 'submitBtn',
                data: { fullwidth: 'true' },
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
          `,
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

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      await this.handleSubmit()
    })
  }

  /**
   * 处理登录提交
   */
  async handleSubmit() {
    if (this.loading) return

    const endpoint = getInputValue('apiEndpoint')
    const token = getInputValue('apiToken')

    if (!endpoint || !token) {
      show.error('请输入 API 端点和 Token')
      return
    }

    this.loading = true
    this.setLoading(true)

    try {
      // 验证 Token（通过 apiToken 参数传递）
      const response = await post(
        `${endpoint}/api/admin/auth/verify`,
        {},
        {
          apiToken: token,
        },
      )

      if (response.code === 200) {
        // 保存配置
        setApiEndpoint(endpoint)
        setApiToken(token)

        show.success('登录成功')
        this.setLoading(false)

        // 延迟跳转
        this._redirectTimer = setTimeout(() => {
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
      if ((/** @type {Error} */ (error)).message.includes('Failed to fetch')) {
        show.error('无法连接到 API 端点，请检查网络或 CORS 配置')
      } else if ((/** @type {Error} */ (error)).message.includes('401')) {
        show.error('无效的 Token')
      } else if ((/** @type {Error} */ (error)).message.includes('403')) {
        show.error('Token 已过期')
      } else {
        show.error('登录失败：' + (/** @type {Error} */ (error)).message)
      }

      this.setLoading(false)
    }
  }

  /**
   * 设置按钮加载状态
   * @param {boolean} loading - 是否处于加载状态
   */
  setLoading(loading) {
    const btn = document.getElementById('submitBtn')
    if (btn) {
      if (loading) {
        btn.classList.add('loading');
        /** @type {HTMLButtonElement} */ (btn).disabled = true
      } else {
        btn.classList.remove('loading');
        /** @type {HTMLButtonElement} */ (btn).disabled = false
      }
    }
  }

  /**
   * 销毁页面
   */
  destroy() {
    if (this._redirectTimer) {
      clearTimeout(this._redirectTimer)
      this._redirectTimer = null
    }
    const form = document.getElementById('loginForm')
    if (form) {
      form.remove()
    }
  }
}

export default LoginPage
