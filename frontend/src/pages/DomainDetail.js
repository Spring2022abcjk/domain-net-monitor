/**
 * 公开域名详情页
 * 任务 28：展示单域名完整检测结果与近期趋势
 */
import { get } from '../utils/api.js'
import { Card } from '../components/Card.js'
import { Table } from '../components/Table.js'
import { formatDate } from '../utils/index.js'

export class DomainDetail {
  constructor() {
    this.domain = null
    this.stats = null
    this.loading = true
    this.error = null
    this.__backHandler = () => {
      window.location.hash = '#/'
    }
  }

  async init({ params }) {
    this.domain = decodeURIComponent(params.domain)
    document.title = `${this.domain} - 域名详情`
    await this.loadStats()
  }

  async loadStats() {
    this.loading = true
    try {
      const res = await get(`/api/public/stats/${encodeURIComponent(this.domain)}`)
      this.stats = res.data
      this.loading = false
    } catch (e) {
      console.error('[DomainDetail] Failed to load stats:', e)
      this.error = '加载域名数据失败，请返回重试'
      this.loading = false
    }
  }

  render() {
    if (this.loading) {
      return `
        <div class="flex items-center justify-center py-20">
          <div class="dm-loading"></div>
          <span class="ml-3 text-gray-500">加载中...</span>
        </div>
      `
    }

    if (this.error) {
      return `
        <div class="text-center py-20">
          <div class="text-red-500 text-lg mb-4">${this.error}</div>
          <button class="dm-btn dm-btn-secondary" id="domain-detail-back-btn">返回首页</button>
        </div>
      `
    }

    if (!this.stats) {
      return `
        <div class="text-center py-20">
          <div class="text-gray-400 text-lg mb-4">暂无该域名数据</div>
          <button class="dm-btn dm-btn-secondary" id="domain-detail-back-btn">返回首页</button>
        </div>
      `
    }

    const statusLabel = this.stats.status === 'active' ? '运行中' : this.stats.status === 'stopped' ? '已停止' : '未知'
    const statusClass =
      this.stats.status === 'active'
        ? 'bg-green-100 text-green-800'
        : this.stats.status === 'stopped'
          ? 'bg-red-100 text-red-800'
          : 'bg-gray-100 text-gray-800'

    const successRateClass =
      (this.stats.successRate || 0) >= 90
        ? 'text-green-600'
        : (this.stats.successRate || 0) >= 70
          ? 'text-yellow-600'
          : 'text-red-600'

    return `
      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button class="dm-btn dm-btn-secondary dm-btn-sm" id="domain-detail-back-btn">
              &larr; 返回
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">${this.stats.domain}</h1>
              <span class="px-2 py-0.5 text-xs rounded-full ${statusClass}">${statusLabel}</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${Card({
            content: `
              <div class="text-sm font-medium text-gray-600">总检测次数</div>
              <div class="text-3xl font-bold text-blue-600 mt-1">${this.stats.totalChecks || 0}</div>
            `,
          })}
          ${Card({
            content: `
              <div class="text-sm font-medium text-gray-600">成功率</div>
              <div class="text-3xl font-bold ${successRateClass} mt-1">${(this.stats.successRate || 0).toFixed(1)}%</div>
            `,
          })}
          ${Card({
            content: `
              <div class="text-sm font-medium text-gray-600">成功/失败</div>
              <div class="text-3xl font-bold text-gray-800 mt-1">
                <span class="text-green-600">${this.stats.successCount || 0}</span>
                <span class="text-gray-400 mx-1">/</span>
                <span class="text-red-600">${this.stats.failureCount || 0}</span>
              </div>
            `,
          })}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          ${Card({
            content: `
              <div class="flex justify-between">
                <span class="text-gray-500">首次检测</span>
                <span class="text-gray-800">${this.stats.firstSeen ? formatDate(new Date(this.stats.firstSeen)) : '--'}</span>
              </div>
            `,
          })}
          ${Card({
            content: `
              <div class="flex justify-between">
                <span class="text-gray-500">最近检测</span>
                <span class="text-gray-800">${this.stats.lastChecked ? formatDate(new Date(this.stats.lastChecked)) : '--'}</span>
              </div>
            `,
          })}
        </div>

        <div>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">最新检测记录</h2>
          ${
            this.stats.latestResults && this.stats.latestResults.length > 0
              ? Table({
                  columns: [
                    {
                      key: 'timestamp',
                      title: '检测时间',
                      render: (value) => formatDate(new Date(value)),
                    },
                    {
                      key: 'status',
                      title: '状态',
                      render: (value) => {
                        const label = value === 'active' ? '正常' : value === 'stopped' ? '异常' : '未知'
                        const cls =
                          value === 'active'
                            ? 'bg-green-100 text-green-800'
                            : value === 'stopped'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        return `<span class="px-2 py-0.5 text-xs rounded-full ${cls}">${label}</span>`
                      },
                    },
                  ],
                  data: this.stats.latestResults,
                })
              : `
              <div class="text-center py-8 text-gray-400">
                暂无检测记录
              </div>
            `
          }
        </div>
      </div>
    `
  }

  bindEvents() {
    const btn = document.getElementById('domain-detail-back-btn')
    btn?.removeEventListener('click', this.__backHandler)
    btn?.addEventListener('click', this.__backHandler)
  }

  destroy() {
    document.getElementById('domain-detail-back-btn')?.removeEventListener('click', this.__backHandler)
  }
}

export default DomainDetail
