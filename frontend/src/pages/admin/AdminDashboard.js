/**
 * 管理后台 Dashboard 页面
 * 任务 16：展示统计概览
 */
import { Card } from '../../components/Card.js'
import { Table } from '../../components/Table.js'
import { get } from '../../utils/api.js'

/**
 * Dashboard 页面类
 */
export class AdminDashboard {
  constructor() {
    this.stats = null
    /** @type {Array<{domain: string, status: string, lastChecked: number|null}>} */
    this.recentDomains = []
    this.error = null
    this.__refreshHandler = async () => {
      await this.loadData()
      const container = document.getElementById('admin-content')
      if (container) {
        container.innerHTML = this.render()
        this.bindEvents()
      }
    }
  }

  /**
   * 初始化：加载数据
   */
  async init() {
    await this.loadData()
  }

  /**
   * 加载数据
   */
  async loadData() {
    try {
      // 获取统计信息
      const statsRes = await get('/api/admin/stats')
      this.stats = statsRes.data

      // 获取最近域名
      const domainsRes = await get('/api/admin/domains')
      this.recentDomains = (domainsRes.data.domains || []).slice(0, 5)
      this.error = null
    } catch (error) {
      console.error('[Dashboard] Failed to load data:', error)
      this.error = '加载数据失败，请刷新页面重试'
    }
  }

  /**
   * 渲染页面
   */
  render() {
    if (this.error) {
      return `
        <div class="text-center py-12">
          <div class="text-red-600 mb-4">${this.error}</div>
          <button class="dm-btn dm-btn-primary" id="dashboard-refresh-btn">
            刷新
          </button>
        </div>
      `
    }

    if (!this.stats) {
      return '<div class="text-center py-12">加载中...</div>'
    }

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900">仪表盘</h1>
          <button class="dm-btn dm-btn-secondary dm-btn-sm" id="dashboard-refresh-btn">
            刷新数据
          </button>
        </div>
        
        <!-- 统计卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${Card({
            content: `
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-gray-600">监控域名</div>
                  <div class="text-3xl font-bold text-blue-600 mt-1">${this.stats.domainCount || 0}</div>
                </div>
                <span class="text-4xl">🌐</span>
              </div>
            `,
          })}
          
          ${Card({
            content: `
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-gray-600">运行中</div>
                  <div class="text-3xl font-bold text-green-600 mt-1">${this.stats.activeCount || 0}</div>
                </div>
                <span class="text-4xl">✅</span>
              </div>
            `,
          })}
          
          ${Card({
            content: `
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-gray-600">已停止</div>
                  <div class="text-3xl font-bold text-red-600 mt-1">${this.stats.stoppedCount || 0}</div>
                </div>
                <span class="text-4xl">❌</span>
              </div>
            `,
          })}
          
          ${Card({
            content: `
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-gray-600">今日检测</div>
                  <div class="text-3xl font-bold text-purple-600 mt-1">${this.stats.todayChecks || 0}</div>
                </div>
                <span class="text-4xl">📊</span>
              </div>
            `,
          })}
        </div>
        
        <!-- 最近域名列表 -->
        <div>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">最近域名</h2>
          ${
            this.recentDomains.length > 0
              ? Table({
                  columns: [
                    {
                      key: 'domain',
                      title: '域名',
                      render: (value) => `<span class="font-medium text-gray-900">${value}</span>`,
                    },
                    {
                      key: 'status',
                      title: '状态',
                      render: (value) => `
                  <span class="px-2 py-1 text-xs rounded-full ${
                    value === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }">
                    ${value === 'active' ? '运行中' : '已停止'}
                  </span>
                `,
                    },
                    {
                      key: 'lastChecked',
                      title: '最近检测',
                      render: (value) => {
                        if (!value) return '<span class="text-gray-400">暂无</span>'
                        const date = new Date(value)
                        return `<span class="text-sm text-gray-600">${date.toLocaleString('zh-CN')}</span>`
                      },
                    },
                  ],
                  data: this.recentDomains,
                })
              : `
            <div class="text-center py-8 text-gray-500">
              暂无域名数据
            </div>
          `
          }
        </div>
      </div>
    `
  }

  /**
   * 绑定刷新事件
   */
  bindEvents() {
    const btn = document.getElementById('dashboard-refresh-btn')
    btn?.removeEventListener('click', this.__refreshHandler)
    btn?.addEventListener('click', this.__refreshHandler)
  }

  /**
   * 清理资源
   */
  destroy() {
    document.getElementById('dashboard-refresh-btn')?.removeEventListener('click', this.__refreshHandler)
  }
}

export default AdminDashboard
