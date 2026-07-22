/**
 * 系统配置页面
 * 任务 18：配置管理系统
 */
import { Input } from '../../components/Input.js'
import { Button } from '../../components/Button.js'
import { show } from '../../components/Notification.js'
import { get, put, post } from '../../utils/api.js'
import { getInputValue } from '../../utils/dom.js'

/**
 * 配置页面类
 */
export class AdminConfig {
  constructor() {
    this.config = null
    this.loading = false
    this.saving = false
    this.testing = false
    this.__saveHandler = () => this.handleSave()
    this.__resetHandler = () => this.handleReset()
    this.__testDohHandler = () => this.handleTestDoh()
  }

  /**
   * 初始化页面
   */
  async init() {
    await this.loadConfig()
  }

  /**
   * 加载配置
   */
  async loadConfig() {
    if (this.config) return
    try {
      this.loading = true
      const [configRes, dohRes] = await Promise.all([get('/api/admin/config'), get('/api/admin/doh')])
      this.config = {
        ...configRes.data,
        doh: dohRes.data,
      }
      this.loading = false
    } catch (error) {
      show.error('加载配置失败：' + (error.message || '未知错误'))
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
      return '<div class="text-center py-12 text-gray-500">配置加载失败</div>'
    }

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">系统配置</h1>
            <p class="text-sm text-gray-600 mt-1">
              配置检测频率、历史记录、DoH 服务器等系统参数
            </p>
          </div>
        </div>

        <form id="configForm" class="space-y-6" onsubmit="return false">
          ${this.renderDetectionSection()}
          ${this.renderHistorySection()}
          ${this.renderDohSection()}
          ${this.renderRateLimitSection()}

          <div class="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            ${Button({
              text: '恢复默认',
              variant: 'secondary',
              size: 'md',
              id: 'resetConfigBtn',
            })}
            ${Button({
              text: this.saving ? '保存中...' : '保存配置',
              variant: 'primary',
              size: 'md',
              id: 'saveConfigBtn',
              loading: this.saving,
            })}
          </div>
        </form>
      </div>
    `
  }

  /**
   * 渲染检测配置区域
   */
  renderDetectionSection() {
    return `
      <div class="dm-config-section bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">检测配置</h2>
        ${Input({
          type: 'number',
          id: 'refreshInterval',
          label: '检测间隔（秒）',
          value: String(this.config.refreshInterval || 43200),
          min: '1',
          required: true,
        })}
        <p class="mt-2 text-sm text-gray-500">
          默认值：43200 秒（12 小时），最小值：1 秒
        </p>
      </div>
    `
  }

  /**
   * 渲染历史配置区域
   */
  renderHistorySection() {
    return `
      <div class="dm-config-section bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">历史配置</h2>
        ${Input({
          type: 'number',
          id: 'historyRetention',
          label: '保留天数（天）',
          value: String(this.config.historyRetention || 7),
          min: '1',
          max: '365',
          required: true,
        })}
        <p class="mt-2 text-sm text-gray-500">
          默认值：7 天，范围：1-365 天。超过设定天数的历史记录将被自动清理
        </p>
      </div>
    `
  }

  /**
   * 渲染 DoH 服务器配置区域
   */
  renderDohSection() {
    const primaryValue = this.config.doh?.primary || 'https://cloudflare-dns.com/dns-query'
    const backupValue = this.config.doh?.backup || 'https://dns.google/resolve'

    return `
      <div class="dm-config-section bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">DoH 服务器配置</h2>
        ${Input({
          type: 'url',
          id: 'dohPrimary',
          label: 'DoH 主服务器',
          value: primaryValue,
          placeholder: 'https://...',
          required: true,
        })}
        ${Input({
          type: 'url',
          id: 'dohBackup',
          label: 'DoH 备用服务器',
          value: backupValue,
          placeholder: 'https://...',
          required: true,
        })}
        <div class="mt-4">
          ${Button({
            text: this.testing ? '测试中...' : '测试连接',
            variant: 'secondary',
            size: 'md',
            id: 'testDohBtn',
          })}
        </div>
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
        <h2 class="text-lg font-semibold text-gray-900 mb-4">限流配置（可选）</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${Input({
            type: 'number',
            id: 'rateLimitWindow',
            label: '时间窗口（毫秒）',
            value: String(windowMs),
            min: '1000',
            required: false,
          })}
          ${Input({
            type: 'number',
            id: 'rateLimitMax',
            label: '最大请求数',
            value: String(maxRequests),
            min: '1',
            required: false,
          })}
        </div>
        <p class="mt-2 text-sm text-gray-500">
          限制每个 IP 在指定时间窗口内的最大请求数，防止 API 滥用
        </p>
      </div>
    `
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const saveBtn = document.getElementById('saveConfigBtn')
    const resetBtn = document.getElementById('resetConfigBtn')
    const testDohBtn = document.getElementById('testDohBtn')

    saveBtn?.removeEventListener('click', this.__saveHandler)
    resetBtn?.removeEventListener('click', this.__resetHandler)
    testDohBtn?.removeEventListener('click', this.__testDohHandler)

    saveBtn?.addEventListener('click', this.__saveHandler)
    resetBtn?.addEventListener('click', this.__resetHandler)
    testDohBtn?.addEventListener('click', this.__testDohHandler)
  }

  /**
   * 处理保存配置
   */
  async handleSave() {
    this.saving = true
    this.render()
    this.bindEvents()

    try {
      const refreshInterval = parseInt(getInputValue('refreshInterval'))
      const historyRetention = parseInt(getInputValue('historyRetention'))
      const rateLimitWindow = parseInt(getInputValue('rateLimitWindow'))
      const rateLimitMax = parseInt(getInputValue('rateLimitMax'))
      const dohPrimary = getInputValue('dohPrimary')
      const dohBackup = getInputValue('dohBackup')

      // 验证检测间隔
      if (refreshInterval < 1) {
        show.error('检测间隔不能小于 1 秒')
        this.saving = false
        this.render()
        this.bindEvents()
        return
      }

      // 验证保留天数
      if (historyRetention < 1 || historyRetention > 365) {
        show.error('保留天数必须在 1-365 天之间')
        this.saving = false
        this.render()
        this.bindEvents()
        return
      }

      // 验证 DoH URL 格式
      if (!this.isValidUrl(dohPrimary)) {
        show.error('DoH 主服务器 URL 格式不正确')
        this.saving = false
        this.render()
        this.bindEvents()
        return
      }

      if (!this.isValidUrl(dohBackup)) {
        show.error('DoH 备用服务器 URL 格式不正确')
        this.saving = false
        this.render()
        this.bindEvents()
        return
      }

      // 保存配置
      const config = {
        refreshInterval,
        historyRetention,
        rateLimit: {
          windowMs: rateLimitWindow,
          maxRequests: rateLimitMax,
        },
      }

      await put('/api/admin/config', config)

      // 保存 DoH 配置
      await put('/api/admin/doh', {
        primary: dohPrimary,
        backup: dohBackup,
      })

      show.success('配置保存成功')
      this.saving = false
      this.render()
      this.bindEvents()
    } catch (error) {
      show.error(error.message || '保存失败')
      this.saving = false
      this.render()
      this.bindEvents()
    }
  }

  /**
   * 处理恢复默认配置
   */
  async handleReset() {
    if (!confirm('确定要恢复默认配置吗？此操作将覆盖当前所有配置。')) {
      return
    }

    this.config = {
      refreshInterval: 43200,
      historyRetention: 7,
      rateLimit: {
        windowMs: 60000,
        maxRequests: 10,
      },
      doh: {
        primary: 'https://cloudflare-dns.com/dns-query',
        backup: 'https://dns.google/resolve',
      },
    }

    this.render()
    this.bindEvents()
    show.success('已恢复默认配置')
  }

  /**
   * 处理测试 DoH 服务器连接
   */
  async handleTestDoh() {
    const dohPrimary = getInputValue('dohPrimary')
    const dohBackup = getInputValue('dohBackup')

    this.testing = true
    this.render()
    this.bindEvents()

    try {
      show.info('正在测试 DoH 服务器连接...')

      const [primaryRes, backupRes] = await Promise.all([
        post('/api/admin/doh/test', { url: dohPrimary }),
        post('/api/admin/doh/test', { url: dohBackup }),
      ])

      const primaryStatus = primaryRes.data?.success ? '✅ 可用' : '❌ 不可用'
      const backupStatus = backupRes.data?.success ? '✅ 可用' : '❌ 不可用'

      show.success(`测试结果：主服务器 ${primaryStatus} | 备用服务器 ${backupStatus}`)
      this.testing = false
      this.render()
      this.bindEvents()
    } catch (error) {
      show.error('测试失败：' + (error.message || '未知错误'))
      this.testing = false
      this.render()
      this.bindEvents()
    }
  }

  /**
   * 验证 URL 格式
   * @param {string} url - 要验证的 URL
   */
  isValidUrl(url) {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * 清理资源
   */
  destroy() {
    document.getElementById('saveConfigBtn')?.removeEventListener('click', this.__saveHandler)
    document.getElementById('resetConfigBtn')?.removeEventListener('click', this.__resetHandler)
    document.getElementById('testDohBtn')?.removeEventListener('click', this.__testDohHandler)
  }
}

export default AdminConfig
