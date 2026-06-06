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

/**
 * 历史记录页面类
 */
export class AdminHistory {
  constructor() {
    this.historyData = null
    this.selectedDomain = ''
    this.daysFilter = '7'
    this.loading = false
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
      show.error('加载历史记录失败：' + (error.message || '未知错误'))
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
              id: 'exportCsvBtn'
            })}
            ${Button({
              text: '清理历史',
              variant: 'danger',
              size: 'md',
              id: 'cleanupHistoryBtn'
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
    const domainOptions = this.historyData.domains
      .map(d => `<option value="${d.domain}" ${this.selectedDomain === d.domain ? 'selected' : ''}>${d.domain}</option>`)
      .join('')

    return `
      <div class="bg-white rounded-lg shadow p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            ${Input({
              type: 'select',
              id: 'domainSelect',
              label: '选择域名',
              value: this.selectedDomain,
              options: [
                { value: '', label: '全部域名' },
                ...this.historyData.domains.map(d => ({ value: d.domain, label: d.domain }))
              ]
            })}
          </div>
          <div>
            ${Input({
              type: 'select',
              id: 'daysSelect',
              label: '时间范围',
              value: this.daysFilter,
              options: [
                { value: '7', label: '最近 7 天' },
                { value: '30', label: '最近 30 天' },
                { value: '90', label: '最近 90 天' },
                { value: '365', label: '最近 1 年' }
              ]
            })}
          </div>
          <div class="flex items-end">
            ${Button({
              text: '查询',
              variant: 'primary',
              size: 'md',
              id: 'queryBtn',
              class: 'w-full'
            })}
          </div>
        </div>
      </div>
    `
  }

  /**
   * 获取过滤后的历史数据
   * @returns {Array} 过滤后的历史数据数组
   */
  getFilteredHistory() {
    let historyData = []
    
    if (this.selectedDomain) {
      const domainData = this.historyData.domains.find(d => d.domain === this.selectedDomain)
      if (domainData && domainData.history) {
        historyData = domainData.history.map(h => ({ ...h, domain: this.selectedDomain }))
      }
    } else {
      // 显示所有域名的最新记录
      this.historyData.domains.forEach(d => {
        if (d.history && d.history.length > 0) {
          const latestRecord = d.history[0]
          historyData.push({
            timestamp: latestRecord.timestamp,
            domain: d.domain,
            httpsRR: latestRecord.httpsRR,
            ipv6: latestRecord.ipv6,
            ech: latestRecord.ech
          })
        } else if (d.latestCheck) {
          // 兼容旧数据结构
          historyData.push({
            timestamp: d.latestCheck,
            domain: d.domain,
            httpsRR: 'success',
            ipv6: true,
            ech: false
          })
        }
      })
    }
    
    // 应用时间范围筛选
    const days = parseInt(this.daysFilter) || 7
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000)
    
    return historyData.filter(h => {
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
        render: (value) => formatDate(value)
      },
      {
        key: 'domain',
        title: '域名',
        render: (value) => `<span class="font-medium text-gray-900">${value}</span>`
      },
      {
        key: 'httpsRR',
        title: 'HTTPS RR',
        render: (value) => this.renderStatusBadge(value === 'success', '成功', '失败')
      },
      {
        key: 'ipv6',
        title: 'IPv6',
        render: (value) => this.renderStatusBadge(value, '支持', '不支持')
      },
      {
        key: 'ech',
        title: 'ECH',
        render: (value) => this.renderStatusBadge(value, '支持', '不支持')
      }
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
    // 存储事件处理器引用以便清理
    this.__queryHandler = () => this.handleQuery()
    this.__exportHandler = () => this.handleExportCsv()
    this.__cleanupHandler = () => this.handleCleanup()

    document.getElementById('queryBtn')?.addEventListener('click', this.__queryHandler)
    document.getElementById('exportCsvBtn')?.addEventListener('click', this.__exportHandler)
    document.getElementById('cleanupHistoryBtn')?.addEventListener('click', this.__cleanupHandler)
  }

  /**
   * 清理资源
   */
  destroy() {
    document.getElementById('queryBtn')?.removeEventListener('click', this.__queryHandler)
    document.getElementById('exportCsvBtn')?.removeEventListener('click', this.__exportHandler)
    document.getElementById('cleanupHistoryBtn')?.removeEventListener('click', this.__cleanupHandler)
    
    this.__queryHandler = null
    this.__exportHandler = null
    this.__cleanupHandler = null
  }

  /**
   * 处理查询
   */
  async handleQuery() {
    const domainSelect = document.getElementById('domainSelect')
    const daysSelect = document.getElementById('daysSelect')

    this.selectedDomain = domainSelect?.value || ''
    this.daysFilter = daysSelect?.value || '7'

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
      const rows = historyToExport.map(h => [
        new Date(h.timestamp).toLocaleString(),
        h.domain,
        h.httpsRR === 'success' ? '成功' : '失败',
        h.ipv6 ? '支持' : '不支持',
        h.ech ? '支持' : '不支持'
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

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
      show.error('导出失败：' + (error.message || '未知错误'))
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
      show.error('清理失败：' + (error.message || '未知错误'))
    }
  }
}

export default AdminHistory
