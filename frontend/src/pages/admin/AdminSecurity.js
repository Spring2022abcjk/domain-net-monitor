/**
 * 安全配置页面
 * 任务 1：展示安全配置状态（CORS、限流、Token）
 */
import { Input } from '../../components/Input.js'
import { Button } from '../../components/Button.js'
import { Card } from '../../components/Card.js'
import { show } from '../../components/Notification.js'
import { get, put } from '../../utils/api.js'
import { getInputValue } from '../../utils/dom.js'

/**
 * 安全配置页面类
 */
export class AdminSecurity {
  constructor() {
    this.config = null
    this.loading = false
    this.saving = false
    this.__saveHandler = () => this.handleSave()
  }

  /**
   * 初始化页面
   */
  async init() {
    await this.loadConfig()
  }

  /**
   * 加载安全配置
   */
  async loadConfig() {
    if (this.config) return
    try {
      this.loading = true
      const res = await get('/api/admin/config/security')
      this.config = res.data
      this.loading = false
    } catch (error) {
      show.error('加载安全配置失败：' + ((/** @type {Error} */ (error)).message || '未知错误'))
      this.loading = false
    }
  }

  /**
   * 渲染页面
   */
  render() {
    if (this.loading) {
      return '<div class="text-center py-12 text-gray-500">加载中...</div>'
    }

    if (!this.config) {
      return '<div class="text-center py-12 text-gray-500">安全配置加载失败</div>'
    }

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">安全配置</h1>
            <p class="text-sm text-gray-600 mt-1">
              CORS 跨域、速率限制、API 认证等安全相关配置
            </p>
          </div>
        </div>

        ${this.renderSecurityStatus()}

        <form id="securityForm" class="space-y-6" onsubmit="return false">
          ${this.renderRateLimitSection()}

          <div class="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            ${Button({
              text: this.saving ? '保存中...' : '保存配置',
              variant: 'primary',
              size: 'md',
              id: 'saveSecurityBtn',
              loading: this.saving,
            })}
          </div>
        </form>
      </div>
    `
  }

  /**
   * 渲染安全状态信息卡片
   */
  renderSecurityStatus() {
    const corsModeLabel = this.config.corsMode === 'wildcard' ? '通配符模式（允许所有来源）' : '白名单模式'
    const corsModeColor = this.config.corsMode === 'wildcard' ? 'text-yellow-600' : 'text-green-600'
    const originsList =
      this.config.allowedOrigins && this.config.allowedOrigins.length > 0
        ? this.config.allowedOrigins.map((o) => `<li class="text-sm text-gray-600">${o}</li>`).join('')
        : '<li class="text-sm text-gray-400">未配置（全部允许）</li>'
    const tokenStatus = this.config.tokenConfigured ? '✅ 已配置' : '❌ 未配置'
    const tokenColor = this.config.tokenConfigured ? 'text-green-600' : 'text-red-600'

    return `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${Card({
          title: 'CORS 模式',
          content: `<div class="text-lg font-semibold ${corsModeColor}">${corsModeLabel}</div>`,
          footer: '跨域资源共享策略',
        })}
        ${Card({
          title: 'Token 状态',
          content: `<div class="text-lg font-semibold ${tokenColor}">${tokenStatus}</div>`,
          footer: '管理员 API 认证 Token',
        })}
        ${Card({
          title: '速率限制',
          content: `<div class="text-lg font-semibold text-blue-600">${this.config.rateLimit?.maxRequests || 0} 次/分钟</div>`,
          footer: '每个 IP 每分钟最大请求数',
        })}
      </div>

      <div class="dm-config-section bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">允许的来源列表</h2>
        ${this.config.allowedOrigins && this.config.allowedOrigins.length > 0
          ? `<ul class="list-disc list-inside space-y-1">${originsList}</ul>`
          : '<p class="text-sm text-gray-400">通配符模式（*），允许所有来源访问</p>'}
        ${this.config.corsMode === 'whitelist'
          ? '<p class="mt-2 text-sm text-gray-500">仅以下来源可以跨域访问 API</p>'
          : ''}
      </div>
    `
  }

  /**
   * 渲染限流配置区域
   */
  renderRateLimitSection() {
    const windowMs = this.config.rateLimit?.windowMs || 60000
    const maxRequests = this.config.rateLimit?.maxRequests || 10

    return `
      <div class="dm-config-section bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">速率限制配置</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${Input({
            type: 'number',
            id: 'rateLimitWindow',
            label: '时间窗口（毫秒）',
            placeholder: '',
            value: String(windowMs),
            min: 1000,
            required: false,
          })}
          ${Input({
            type: 'number',
            id: 'rateLimitMax',
            label: '最大请求数',
            placeholder: '',
            value: String(maxRequests),
            min: 1,
            required: false,
          })}
        </div>
        <p class="mt-2 text-sm text-gray-500">
          限制每个 IP 在指定时间窗口内的最大请求数，防止 API 滥用。当前：${Math.floor(windowMs / 1000)} 秒内最多 ${maxRequests} 次请求
        </p>
      </div>
    `
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const saveBtn = document.getElementById('saveSecurityBtn')

    saveBtn?.removeEventListener('click', this.__saveHandler)
    saveBtn?.addEventListener('click', this.__saveHandler)
  }

  /**
   * 处理保存速率限制配置
   */
  async handleSave() {
    this.saving = true
    this.render()
    this.bindEvents()

    try {
      const rateLimitWindow = parseInt(getInputValue('rateLimitWindow'))
      const rateLimitMax = parseInt(getInputValue('rateLimitMax'))

      // 验证
      if (rateLimitWindow < 1000) {
        show.error('时间窗口不能小于 1000 毫秒')
        this.saving = false
        this.render()
        this.bindEvents()
        return
      }

      if (rateLimitMax < 1) {
        show.error('最大请求数不能小于 1')
        this.saving = false
        this.render()
        this.bindEvents()
        return
      }

      await put('/api/admin/config', {
        rateLimit: {
          windowMs: rateLimitWindow,
          maxRequests: rateLimitMax,
        },
      })

      // 刷新安全配置
      const res = await get('/api/admin/config/security')
      this.config = res.data

      show.success('速率限制配置已保存')
      this.saving = false
      this.render()
      this.bindEvents()
    } catch (error) {
      show.error((/** @type {Error} */ (error)).message || '保存失败')
      this.saving = false
      this.render()
      this.bindEvents()
    }
  }

  /**
   * 清理资源
   */
  destroy() {
    document.getElementById('saveSecurityBtn')?.removeEventListener('click', this.__saveHandler)
  }
}

export default AdminSecurity