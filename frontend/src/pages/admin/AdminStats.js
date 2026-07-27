/**
 * 统计概览页面
 * 任务 20：展示系统统计数据
 */
import { Card } from '../../components/Card.js'
import { Button } from '../../components/Button.js'
import { show } from '../../components/Notification.js'
import { get } from '../../utils/api.js'

/**
 * 统计页面类
 */
export class AdminStats {
  constructor() {
    this.stats = null
    this.loading = false
    /** @type {(() => void)|null} */
    this.__refreshHandler = null
  }

  /**
   * 初始化页面
   */
  async init() {
    await this.loadStats()
  }

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      this.loading = true
      const res = await get('/api/admin/stats')
      this.stats = res.data
      this.loading = false
    } catch (error) {
      show.error('加载统计数据失败：' + ((/** @type {Error} */ (error)).message || '未知错误'))
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

    if (!this.stats) {
      return '<div class="text-center py-12 text-gray-500">统计数据加载失败</div>'
    }

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">统计概览</h1>
            <p class="text-sm text-gray-600 mt-1">
              系统运行数据和检测统计
            </p>
          </div>
          ${Button({
            text: '刷新数据',
            variant: 'secondary',
            size: 'md',
            id: 'refreshStatsBtn',
          })}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${this.renderCoreStats()}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${this.renderDetectionStats()}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${this.renderSystemInfo()}
        </div>
      </div>
    `
  }

  /**
   * 渲染核心指标卡片
   */
  renderCoreStats() {
    return `
      ${Card({
        title: '总域名数',
        content: `<div class="text-3xl font-bold text-blue-600">${this.stats.overview?.totalDomains || 0}</div>`,
        footer: '所有已添加的域名',
      })}
      ${Card({
        title: '默认域名数',
        content: `<div class="text-3xl font-bold text-green-600">${this.stats.overview?.defaultDomains || 0}</div>`,
        footer: '在公开页面展示的域名',
      })}
      ${Card({
        title: '今日检测',
        content: `<div class="text-3xl font-bold text-purple-600">${this.stats.today?.requests || 0}</div>`,
        footer: '今日总检测次数',
      })}
      ${Card({
        title: '限流命中',
        content: `<div class="text-3xl font-bold text-orange-600">${this.stats.today?.rateLimitHits || 0}</div>`,
        footer: '今日触发限流次数',
      })}
    `
  }

  /**
   * 渲染检测统计卡片
   */
  renderDetectionStats() {
    const successCount = this.stats.detection?.successCount || 0
    const failCount = this.stats.detection?.failCount || 0
    const total = successCount + failCount
    const successRateVal = total > 0 ? parseFloat(((successCount / total) * 100).toFixed(2)) : 0

    return `
      ${Card({
        title: '检测成功率',
        content: `<div class="text-3xl font-bold text-green-600">${successRateVal.toFixed(2)}%</div>`,
        footer: '今日检测成功率',
      })}
      ${Card({
        title: '检测成功',
        content: `<div class="text-3xl font-bold text-blue-600">${successCount || 0}</div>`,
        footer: '今日检测成功次数',
      })}
      ${Card({
        title: '检测失败',
        content: `<div class="text-3xl font-bold text-red-600">${failCount || 0}</div>`,
        footer: '今日检测失败次数',
      })}
    `
  }

  /**
   * 渲染系统信息卡片
   */
  renderSystemInfo() {
    const lastResetDate = this.stats.lastReset ? new Date(this.stats.lastReset).toLocaleString() : '暂无'
    const uptime = this.stats.uptimeHuman || '0.0 days'

    return `
      ${Card({
        title: '最后重置时间',
        content: `<div class="text-lg font-mono text-gray-700">${lastResetDate}</div>`,
        footer: '统计数据每日自动重置',
      })}
      ${Card({
        title: '系统运行时长',
        content: `<div class="text-3xl font-bold text-indigo-600">${uptime}</div>`,
        footer: '自上次部署以来',
      })}
    `
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 存储事件处理器引用以便清理
    this.__refreshHandler = () => this.handleRefresh()

    document.getElementById('refreshStatsBtn')?.addEventListener('click', this.__refreshHandler)
  }

  /**
   * 处理刷新数据
   */
  async handleRefresh() {
    await this.loadStats()
    if (!this.stats) return
    this.render()
    this.bindEvents()
    show.success('数据已刷新')
  }

  /**
   * 清理资源
   */
  destroy() {
    document.getElementById('refreshStatsBtn')?.removeEventListener('click', /** @type {EventListener} */ (this.__refreshHandler))
    this.__refreshHandler = null
  }
}

export default AdminStats
