/**
 * 历史记录页面
 * 任务 19：提供域名历史检测记录的查询、筛选、导出等功能
 */
import { Table } from '../../components/Table.js'
import { Button } from '../../components/Button.js'
import { Input } from '../../components/Input.js'
import { show } from '../../components/Notification.js'
import { get, del } from '../../utils/api.js'
import { formatDate } from '../../utils/index.js'
import { getInputValue, getSelectValue } from '../../utils/dom.js'
/** @typedef {import('../../types/api.js').HistoryDomain} HistoryDomain */
/** @typedef {import('../../types/api.js').HistoryRecord} HistoryRecord */

/**
 * 历史记录页面类
 */
export class AdminHistory {
  constructor() {
    this.historyData = null
    this.selectedDomain = ''
    this.daysFilter = '7'
    this.loading = false
    this.__queryHandler = () => this.handleQuery()
    this.__exportHandler = () => this.handleExportCsv()
    this.__cleanupHandler = () => this.handleCleanup()
  }

  /**
   * 初始化页面
   */
  async init() {
    await this.loadData()
  }

  /**
   * 加载历史数据
   */
  async loadData() {
    try {
      this.loading = true
      const res = await get('/api/admin/history')
      this.historyData = res.data
      this.loading = false
    } catch (error) {
      show.error('加载历史记录失败：' + ((/** @type {Error} */ (error)).message || '未知错误'))
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

    if (!this.historyData || this.historyData.domains.length === 0) {
      return this.renderEmptyState()
    }

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">历史记录</h1>
            <p class="text-sm text-gray-600 mt-1">
              共 ${this.historyData.domains.length} 个域名有历史记录，总计 ${this.historyData.totalCount} 条记录
            </p>
          </div>
          <div class="flex items-center gap-3">
            ${Button({
              text: '导出 CSV',
              variant: 'secondary',
              size: 'md',
              id: 'exportCsvBtn',
            })}
            ${Button({
              text: '清理历史',
              variant: 'danger',
              size: 'md',
              id: 'cleanupHistoryBtn',
            })}
          </div>
        </div>

        ${this.renderFilterBar()}
        ${this.renderHistoryTable()}
      </div>
    `
  }

  /**
   * 渲染空状态
   */
  renderEmptyState() {
    return `
      <div class="bg-white rounded-lg shadow text-center py-12">
        <div class="text-6xl mb-4">📝</div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">暂无历史记录</h3>
        <p class="text-gray-600">系统会自动保存域名检测的历史记录</p>
      </div>
    `
  }

  /**
   * 渲染筛选栏
   */
  renderFilterBar() {
    return `
      <div class="bg-white rounded-lg shadow p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            ${Input({
              type: 'select',
              id: 'domainSelect',
              label: '选择域名',
              placeholder: '',
              value: this.selectedDomain,
              options: [
                { value: '', label: '全部域名' },
                ...this.historyData.domains.map((/** @type {HistoryDomain} */ d) => ({ value: d.domain, label: d.domain })),
              ],
            })}
          </div>
          <div>
            ${Input({
              type: 'select',
              id: 'daysSelect',
              label: '时间范围',
              placeholder: '',
              value: this.daysFilter,
              options: [
                { value: '7', label: '最近 7 天' },
                { value: '30', label: '最近 30 天' },
                { value: '90', label: '最近 90 天' },
                { value: '365', label: '最近 1 年' },
              ],
            })}
          </div>
          <div class="flex items-end">
            ${Button({
              text: '查询',
              variant: 'primary',
              size: 'md',
              id: 'queryBtn',
            })}
          </div>
        </div>
      </div>
    `
  }

  /**
   * 获取过滤后的历史数据
   * @returns {HistoryRecord[]} 过滤后的历史数据数组
   */
  getFilteredHistory() {
    let historyData = []

    if (this.selectedDomain) {
      const domainData = this.historyData.domains.find((/** @type {HistoryDomain} */ d) => d.domain === this.selectedDomain)
      if (domainData && domainData.history) {
        historyData = domainData.history.map((/** @type {HistoryRecord} */ h) => ({ ...h, domain: this.selectedDomain }))
      }
    } else {
      this.historyData.domains.forEach((/** @type {HistoryDomain} */ d) => {
        if (d.history && d.history.length > 0) {
          const latestRecord = d.history[0]
          historyData.push({
            timestamp: latestRecord.timestamp,
            domain: d.domain,
            https_rr: latestRecord.https_rr,
            ipv6: latestRecord.ipv6,
            ech: latestRecord.ech,
          })
        } else if (d.latestCheck) {
          historyData.push({
            timestamp: d.latestCheck,
            domain: d.domain,
            https_rr: { status: 'no' },
            ipv6: { status: 'no' },
            ech: { status: 'no' },
          })
        }
      })
    }

    // 应用时间范围筛选
    const days = parseInt(this.daysFilter) || 7
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000

    return historyData.filter((/** @type {HistoryRecord} */ h) => {
      const timestamp = typeof h.timestamp === 'number' ? h.timestamp : new Date(h.timestamp).getTime()
      return timestamp >= cutoffTime
    })
  }

  /**
   * 渲染历史记录表格
   */
  renderHistoryTable() {
    const columns = [
      {
        key: 'timestamp',
        title: '检测时间',
        render: (/** @type {number|string} */ value) => formatDate(value),
      },
      {
        key: 'domain',
        title: '域名',
        render: (/** @type {string} */ value) => `<span class="font-medium text-gray-900">${value}</span>`,
      },
      {
        key: 'https_rr',
        title: 'HTTPS RR',
        render: (/** @type {{status: string}} */ value) =>
          this.renderStatusBadge(value?.status === 'ok' || value?.status === 'partial', '支持', '不支持'),
      },
      {
        key: 'ipv6',
        title: 'IPv6',
        render: (/** @type {{status: string}} */ value) =>
          this.renderStatusBadge(value?.status === 'ok' || value?.status === 'partial', '支持', '不支持'),
      },
      {
        key: 'ech',
        title: 'ECH',
        render: (/** @type {{status: string}} */ value) =>
          this.renderStatusBadge(value?.status === 'ok' || value?.status === 'partial', '支持', '不支持'),
      },
    ]

    const historyToDisplay = this.getFilteredHistory()

    return `
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            ${this.selectedDomain ? `${this.selectedDomain} 的历史记录` : '所有域名最新记录'}
          </h3>
        </div>
        ${Table({ columns, data: historyToDisplay })}
      </div>
    `
  }

  /**
   * 渲染状态徽章
   * @param {boolean} success
   * @param {string} successText
   * @param {string} failText
   */
  renderStatusBadge(success, successText, failText) {
    if (success) {
      return '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">' + successText + '</span>'
    } else {
      return '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">' + failText + '</span>'
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const queryBtn = document.getElementById('queryBtn')
    const exportBtn = document.getElementById('exportCsvBtn')
    const cleanupBtn = document.getElementById('cleanupHistoryBtn')

    queryBtn?.removeEventListener('click', this.__queryHandler)
    exportBtn?.removeEventListener('click', this.__exportHandler)
    cleanupBtn?.removeEventListener('click', this.__cleanupHandler)

    queryBtn?.addEventListener('click', this.__queryHandler)
    exportBtn?.addEventListener('click', this.__exportHandler)
    cleanupBtn?.addEventListener('click', this.__cleanupHandler)
  }

  /**
   * 清理资源
   */
  destroy() {
    document.getElementById('queryBtn')?.removeEventListener('click', this.__queryHandler)
    document.getElementById('exportCsvBtn')?.removeEventListener('click', this.__exportHandler)
    document.getElementById('cleanupHistoryBtn')?.removeEventListener('click', this.__cleanupHandler)
  }

  /**
   * 处理查询
   */
  async handleQuery() {
    this.selectedDomain = getSelectValue('domainSelect')
    this.daysFilter = getSelectValue('daysSelect') || '7'

    await this.loadData()
    this.render()
    this.bindEvents()
    show.success('查询完成')
  }

  /**
   * 处理导出 CSV
   */
  async handleExportCsv() {
    try {
      show.info('正在生成 CSV 文件...')

      // 使用统一的数据获取方法
      const historyToExport = this.getFilteredHistory()

      if (historyToExport.length === 0) {
        show.error('没有可导出的数据')
        return
      }

      // 生成 CSV 内容
      const headers = ['检测时间', '域名', 'HTTPS RR', 'IPv6', 'ECH']
      const rows = historyToExport.map((h) => [
        new Date(h.timestamp).toLocaleString(),
        h.domain,
        h.https_rr?.status === 'ok' ? '成功' : '失败',
        h.ipv6 ? '支持' : '不支持',
        h.ech ? '支持' : '不支持',
      ])

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

      // 创建下载
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `历史记录_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      show.success(`成功导出 ${historyToExport.length} 条记录`)
    } catch (error) {
      show.error('导出失败：' + ((/** @type {Error} */ (error)).message || '未知错误'))
    }
  }

  /**
   * 处理清理历史记录
   */
  async handleCleanup() {
    const message = this.selectedDomain
      ? `确定要清理 ${this.selectedDomain} 的所有历史记录吗？此操作不可恢复。`
      : '确定要清理所有域名的历史记录吗？此操作不可恢复。'

    if (!confirm(message)) {
      return
    }

    try {
      if (this.selectedDomain) {
        await del(`/api/admin/history/${encodeURIComponent(this.selectedDomain)}`)
        show.success(`${this.selectedDomain} 的历史记录已清理`)
      } else {
        await del('/api/admin/history')
        show.success('所有历史记录已清理')
      }

      await this.loadData()
      this.render()
      this.bindEvents()
    } catch (error) {
      show.error('清理失败：' + ((/** @type {Error} */ (error)).message || '未知错误'))
    }
  }
}

export default AdminHistory
