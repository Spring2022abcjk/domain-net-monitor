/**
 * 域名管理页面
 * 任务 17：完整的域名 CRUD 操作
 */
import { Table } from '../../components/Table.js'
import { Button } from '../../components/Button.js'
import { Modal } from '../../components/Modal.js'
import { Toggle } from '../../components/Toggle.js'
import { show } from '../../components/Notification.js'
import { get, post, del } from '../../utils/api.js'
import { formatDate, isValidDomain } from '../../utils/index.js'
import { getInputValue } from '../../utils/dom.js'

/**
 * 域名管理页面类
 */
export class AdminDomains {
  constructor() {
    /** @type {Array<{domain: string, status: string, lastChecked: number|null, isDefault: boolean}>} */
    this.domains = []
    /** @type {Array<string>} */
    this.selectedDomains = []
    this.loading = false
    this.showAddModal = false
    this.newDomainInput = ''
    this.__addDomainHandler = () => {
      this.showAddModal = true
      this.newDomainInput = ''
    }
    this.__cancelAddHandler = () => {
      this.showAddModal = false
      this.newDomainInput = ''
    }
    this.__confirmAddHandler = () => this.handleAddDomain()
    this.__batchDeleteHandler = () => this.handleBatchDelete()
    this.__selectAllHandler = (/** @type {Event} */ e) => {
      if (/** @type {HTMLInputElement} */ (e.target).checked) {
        this.selectedDomains = this.domains.map((d) => d.domain)
      } else {
        this.selectedDomains = []
      }
      this.render()
      this.bindEvents()
    }
    this.__tableDelegateHandler = (/** @type {Event} */ e) => {
      const target = /** @type {HTMLElement} */ (e.target)
      const deleteBtn = target.closest('.dm-delete-btn')
      if (deleteBtn) {
        this._handleDeleteDomain(deleteBtn.dataset.domain)
        return
      }
      const checkbox = target.closest('.dm-domain-checkbox')
      if (checkbox) {
        const domain = checkbox.getAttribute('data-domain')
        if (/** @type {HTMLInputElement} */ (checkbox).checked) {
          this.selectedDomains.push(domain)
        } else {
          this.selectedDomains = this.selectedDomains.filter((d) => d !== domain)
        }
        return
      }
      const toggle = target.closest('.dm-toggle input[type="checkbox"]')
      if (toggle && toggle.id) {
        const domain = toggle.id.replace('toggle-', '').replace(/-/g, '.')
        this.handleToggleDefault(domain)
      }
    }
  }

  /**
   * 初始化页面
   */
  async init() {
    await this.loadData()
  }

  /**
   * 加载域名列表
   */
  async loadData() {
    try {
      this.loading = true
      const res = await get('/api/admin/domains')
      this.domains = res.data.domains || []
      this.loading = false
    } catch (error) {
      show.error('加载域名列表失败：' + (error.message || '未知错误'))
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

    return `
      <div class="space-y-6">
        ${this.renderHeader()}
        ${this.renderTable()}
        ${this.renderAddModal()}
      </div>
    `
  }

  /**
   * 渲染页面头部
   */
  renderHeader() {
    return `
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">域名管理</h1>
          <p class="text-sm text-gray-600 mt-1">
            共 ${this.domains.length} 个域名，已选择 ${this.selectedDomains.length} 个
          </p>
        </div>
        <div class="flex items-center gap-3">
          ${Button({
            text: '批量删除',
            variant: 'danger',
            size: 'md',
            disabled: this.selectedDomains.length === 0,
            id: 'batchDeleteBtn',
          })}
          ${Button({
            text: '添加域名',
            variant: 'primary',
            size: 'md',
            id: 'addDomainBtn',
          })}
        </div>
      </div>
    `
  }

  /**
   * 渲染域名表格
   */
  renderTable() {
    if (this.domains.length === 0) {
      return `
        <div class="bg-white rounded-lg shadow text-center py-12">
          <div class="text-6xl mb-4">🌐</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">暂无域名</h3>
          <p class="text-gray-600 mb-6">点击右上角"添加域名"开始添加</p>
          ${Button({
            text: '添加域名',
            variant: 'primary',
            size: 'md',
            id: 'emptyAddBtn',
          })}
        </div>
      `
    }

    const columns = [
      {
        key: 'select',
        title: '<input type="checkbox" id="selectAll" class="rounded" />',
        render: (/** @type {any} */ _, /** @type {any} */ row) => `
          <input
            type="checkbox"
            class="dm-domain-checkbox rounded"
            data-domain="${row.domain}"
            ${this.selectedDomains.includes(row.domain) ? 'checked' : ''}
          />
        `,
      },
      {
        key: 'domain',
        title: '域名',
        render: (/** @type {string} */ value) => `
          <a href="#/admin/history?domain=${encodeURIComponent(value)}" class="text-blue-600 hover:underline font-medium">
            ${value}
          </a>
        `,
      },
      {
        key: 'status',
        title: '状态',
        render: (/** @type {string} */ value) => this.renderStatusBadge(value),
      },
      {
        key: 'lastChecked',
        title: '最近检测',
        render: (/** @type {number|null} */ value) => (value ? formatDate(value) : '<span class="text-gray-400">暂无</span>'),
      },
      {
        key: 'isDefault',
        title: '默认展示',
        render: (/** @type {boolean} */ value, /** @type {any} */ row) =>
          Toggle({
            checked: value,
            id: `toggle-${row.domain.replace(/\./g, '-')}`,
          }),
      },
      {
        key: 'actions',
        title: '操作',
        render: (/** @type {any} */ _, /** @type {any} */ row) => `
          <button
            class="dm-delete-btn dm-btn dm-btn-danger dm-btn-sm"
            data-domain="${row.domain.replace(/'/g, "\\'")}"
          >
            删除
          </button>
        `,
      },
    ]

    return Table({ columns, data: this.domains })
  }

  /**
   * 渲染状态徽章
   * @param {string} status
   */
  renderStatusBadge(status) {
    if (status === 'active') {
      return '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">运行中</span>'
    } else if (status === 'stopped') {
      return '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">已停止</span>'
    }
    return '<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">未知</span>'
  }

  /**
   * 渲染添加域名弹窗
   */
  renderAddModal() {
    if (!this.showAddModal) return ''

    return Modal({
      title: '添加域名',
      closable: true,
      content: `
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              域名（多个域名用逗号分隔）
            </label>
            <textarea
              id="newDomainInput"
              class="dm-input w-full h-32 font-mono"
              placeholder="example.com 或 example.com,test.com,abc.com"
              rows="4"
            >${this.newDomainInput}</textarea>
            <p class="mt-1 text-sm text-gray-500">
              支持批量添加，用英文逗号分隔多个域名
            </p>
          </div>
        </div>
      `,
      footer: `
        <div class="flex items-center justify-end gap-3">
          ${Button({
            text: '取消',
            variant: 'secondary',
            id: 'cancelAddBtn',
          })}
          ${Button({
            text: '添加',
            variant: 'primary',
            id: 'confirmAddBtn',
          })}
        </div>
      `,
    })
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const addBtn = document.getElementById('addDomainBtn')
    const emptyBtn = document.getElementById('emptyAddBtn')
    const cancelBtn = document.getElementById('cancelAddBtn')
    const closeBtn = document.getElementById('modal-close-btn')
    const confirmBtn = document.getElementById('confirmAddBtn')
    const batchBtn = document.getElementById('batchDeleteBtn')
    const selectAll = document.getElementById('selectAll')
    const tableBody = document.querySelector('tbody')

    addBtn?.removeEventListener('click', this.__addDomainHandler)
    emptyBtn?.removeEventListener('click', this.__addDomainHandler)
    cancelBtn?.removeEventListener('click', this.__cancelAddHandler)
    closeBtn?.removeEventListener('click', this.__cancelAddHandler)
    confirmBtn?.removeEventListener('click', this.__confirmAddHandler)
    batchBtn?.removeEventListener('click', this.__batchDeleteHandler)
    selectAll?.removeEventListener('change', this.__selectAllHandler)
    tableBody?.removeEventListener('click', this.__tableDelegateHandler)

    addBtn?.addEventListener('click', this.__addDomainHandler)
    emptyBtn?.addEventListener('click', this.__addDomainHandler)
    cancelBtn?.addEventListener('click', this.__cancelAddHandler)
    closeBtn?.addEventListener('click', this.__cancelAddHandler)
    confirmBtn?.addEventListener('click', this.__confirmAddHandler)
    batchBtn?.addEventListener('click', this.__batchDeleteHandler)
    selectAll?.addEventListener('change', this.__selectAllHandler)
    tableBody?.addEventListener('click', this.__tableDelegateHandler)

    const input = document.getElementById('newDomainInput')
    if (input) {
      this.newDomainInput = /** @type {HTMLInputElement} */ (input).value
    }
  }

  /**
   * 绑定全局事件处理器（由 AdminLayout 调用，当前无全局事件）
   */
  bindGlobalHandlers() {
    // All handlers moved to bindEvents() with event delegation
  }

  /**
   * 处理添加域名
   */
  async handleAddDomain() {
    const input = getInputValue('newDomainInput').trim()
    if (!input) {
      show.error('请输入域名')
      return
    }

    // 解析多个域名
    const domains = input
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)

    // 验证域名格式
    const invalidDomains = domains.filter((d) => !isValidDomain(d))
    if (invalidDomains.length > 0) {
      show.error(`以下域名格式不正确：${invalidDomains.join(', ')}`)
      return
    }

    // 批量添加
    try {
      let successCount = 0
      let failedCount = 0

      for (const domain of domains) {
        try {
          await post('/api/admin/domains', { domain })
          successCount++
        } catch (error) {
          failedCount++
          console.error(`Failed to add ${domain}:`, error)
        }
      }

      let message = `成功添加 ${successCount} 个域名`
      if (failedCount > 0) {
        message += `（${failedCount} 个失败，可能已存在）`
      }

      show.success(message)
      this.showAddModal = false
      this.newDomainInput = ''
      await this.loadData()
    } catch (error) {
      show.error(error.message || '添加失败')
    }
  }

  /**
   * 处理批量删除
   */
  async handleBatchDelete() {
    if (this.selectedDomains.length === 0) {
      show.error('请选择要删除的域名')
      return
    }

    if (!confirm(`确定要删除选中的 ${this.selectedDomains.length} 个域名吗？此操作不可恢复。`)) {
      return
    }

    try {
      let successCount = 0
      let failedCount = 0

      for (const domain of this.selectedDomains) {
        try {
          await del(`/api/admin/domains/${encodeURIComponent(domain)}`)
          successCount++
        } catch (error) {
          failedCount++
          console.error(`Failed to delete ${domain}:`, error)
        }
      }

      show.success(`成功删除 ${successCount} 个域名${failedCount > 0 ? `（${failedCount} 个失败）` : ''}`)
      this.selectedDomains = []
      await this.loadData()
    } catch (error) {
      show.error('批量删除失败：' + (error.message || '未知错误'))
    }
  }

  /**
   * 处理切换默认展示
   * @param {string} domain
   */
  async handleToggleDefault(domain) {
    try {
      const isCurrentlyDefault = this.domains.find((d) => d.domain === domain)?.isDefault

      if (isCurrentlyDefault) {
        await del(`/api/admin/domains/${encodeURIComponent(domain)}/default`)
        show.success('已取消默认展示')
      } else {
        await post(`/api/admin/domains/${encodeURIComponent(domain)}/default`, {})
        show.success('已设为默认展示')
      }

      await this.loadData()
      this.render()
      this.bindEvents()
    } catch (error) {
      show.error('操作失败：' + (error.message || '未知错误'))
    }
  }

  /** @param {string} domain */
  async _handleDeleteDomain(domain) {
    if (!confirm(`确定要删除域名 ${domain} 吗？此操作不可恢复。`)) return
    try {
      await del(`/api/admin/domains/${encodeURIComponent(domain)}`)
      show.success('域名已删除')
      await this.loadData()
      this.selectedDomains = this.selectedDomains.filter((d) => d !== domain)
      this.render()
      this.bindEvents()
    } catch (error) {
      show.error(error.message || '删除失败')
    }
  }

  /**
   * 清理资源
   */
  destroy() {
    document.getElementById('addDomainBtn')?.removeEventListener('click', this.__addDomainHandler)
    document.getElementById('emptyAddBtn')?.removeEventListener('click', this.__addDomainHandler)
    document.getElementById('cancelAddBtn')?.removeEventListener('click', this.__cancelAddHandler)
    document.getElementById('modal-close-btn')?.removeEventListener('click', this.__cancelAddHandler)
    document.getElementById('confirmAddBtn')?.removeEventListener('click', this.__confirmAddHandler)
    document.getElementById('batchDeleteBtn')?.removeEventListener('click', this.__batchDeleteHandler)
    document.getElementById('selectAll')?.removeEventListener('change', this.__selectAllHandler)
    document.querySelector('tbody')?.removeEventListener('click', this.__tableDelegateHandler)
  }
}

export default AdminDomains
