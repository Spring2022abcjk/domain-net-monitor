/**
 * 公开 Dashboard 页面
 * 无需认证即可访问
 */
import { DomainCard } from '../components/DomainCard.js'
import { SearchBox } from '../components/SearchBox.js'
import { Footer } from '../components/Footer.js'
import { EmptyState } from '../components/EmptyState.js'
import { get, setApiBaseUrl } from '../utils/api.js'
import { show } from '../components/Notification.js'
import { debounce } from '../utils/index.js'
import { getApiEndpoint } from '../utils/storage.js'

export class PublicDashboard {
  constructor() {
    this.domains = []
    this.filteredDomains = []
    this.searchQuery = ''
    this.loading = false
    this.typingTimer = null
    this.debouncedSearch = debounce(this._doSearch.bind(this), 300)
    this.__searchClickHandler = () => this.triggerSearch()
    this.__searchInputHandler = () => this.debouncedSearch()
    this.__searchKeyHandler = (e) => {
      if (e.key === 'Enter') this.debouncedSearch()
    }
    this.__domainClickHandler = (e) => {
      const btn = e.target.closest('[data-domain]')
      if (btn) this.handleViewDetail(btn.dataset.domain)
    }
  }
  
  async init() {
    this.loading = true
    await this.loadDomains()
    this.render()
    this.bindEvents()
    this.loading = false
  }
  
  async loadDomains() {
    try {
      // 优先使用用户登录配置的端点
      const userEndpoint = getApiEndpoint()
      
      // 如果没有用户配置，使用 Vite 注入的环境变量
      if (userEndpoint) {
        setApiBaseUrl(userEndpoint)
        console.log('[PublicDashboard] Using user-configured endpoint:', userEndpoint)
      } else if (import.meta.env.VITE_API_BASE_URL) {
        setApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
        console.log('[PublicDashboard] Using env endpoint:', import.meta.env.VITE_API_BASE_URL)
      } else {
        // 都没有，提示用户配置
        show.info('请先在管理后台配置 API 端点')
        return
      }
      
      const res = await get('/api/public/domains')
      this.domains = res.data.domains || []
      this.filteredDomains = this.domains
    } catch (error) {
      console.error('Failed to load domains:', error)
      this.domains = []
      this.filteredDomains = []
      
      // 根据错误类型提供不同提示
      if (error.status === 404) {
        show.error('API 端点不存在，请确认后端服务已部署')
      } else if (error.status >= 500) {
        show.error('服务器错误，请稍后重试')
      } else if (error.name === 'TypeError' || error.message.includes('fetch')) {
        show.error('网络错误，请检查连接')
      } else {
        show.error('加载失败：' + (error.message || '未知错误'))
      }
    }
  }
  
  render() {
    const searchBox = SearchBox({ 
      value: this.searchQuery,
      id: 'domain-search'
    })
    
    const domainCards = this.filteredDomains.length > 0 
      ? this.filteredDomains.map(d => DomainCard({
          domain: d.domain,
          status: d.status,
          firstSeen: d.firstSeen,
          lastChecked: d.lastChecked
        })).join('')
      : EmptyState({
          title: '暂无监控域名',
          message: '请先在管理后台添加域名',
          icon: 'empty'
        })
    
    return `
      <div class="min-h-screen flex flex-col bg-gray-50">
        <!-- Header -->
        <header class="dm-header bg-white shadow-sm">
          <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <svg class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <h1 class="text-xl font-bold text-gray-900">域名监控平台</h1>
              </div>
              <nav class="flex items-center gap-4">
                <a href="#/" class="text-gray-600 hover:text-gray-900 font-medium">首页</a>
                <a href="#/login" class="dm-btn dm-btn-primary dm-btn-sm">管理后台</a>
              </nav>
            </div>
          </div>
        </header>
        
        <!-- Main Content -->
        <main class="container mx-auto px-4 py-8 flex-1">
          <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-900">监控域名列表</h2>
            <p class="text-gray-600 mt-1">共 ${this.filteredDomains.length} 个域名</p>
          </div>
          
          ${searchBox}
          
          <div id="domain-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${domainCards}
          </div>
        </main>
        
        ${Footer()}
      </div>
    `
  }
  
  bindEvents() {
    const searchBtn = document.getElementById('btn-search')
    const searchInput = document.getElementById('domain-search')
    const container = document.getElementById('domain-grid')

    searchBtn?.removeEventListener('click', this.__searchClickHandler)
    searchInput?.removeEventListener('input', this.__searchInputHandler)
    searchInput?.removeEventListener('keydown', this.__searchKeyHandler)
    container?.removeEventListener('click', this.__domainClickHandler)

    searchBtn?.addEventListener('click', this.__searchClickHandler)
    searchInput?.addEventListener('input', this.__searchInputHandler)
    searchInput?.addEventListener('keydown', this.__searchKeyHandler)
    container?.addEventListener('click', this.__domainClickHandler)
  }
  
  triggerSearch() {
    const searchInput = document.getElementById('domain-search')
    if (searchInput) {
      this.debouncedSearch()
    }
  }
  
  _doSearch() {
    const searchInput = document.getElementById('domain-search')
    this.searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : ''
    
    if (!this.searchQuery) {
      this.filteredDomains = this.domains
    } else {
      this.filteredDomains = this.domains.filter(d => 
        d.domain.toLowerCase().includes(this.searchQuery)
      )
    }
    
    this.render()
    this.bindEvents()
  }
  
  handleViewDetail(domain) {
    window.location.hash = '#/domain/' + encodeURIComponent(domain)
  }
  
  destroy() {
    document.getElementById('btn-search')?.removeEventListener('click', this.__searchClickHandler)
    document.getElementById('domain-search')?.removeEventListener('input', this.__searchInputHandler)
    document.getElementById('domain-search')?.removeEventListener('keydown', this.__searchKeyHandler)
    document.getElementById('domain-grid')?.removeEventListener('click', this.__domainClickHandler)
    if (this.debouncedSearch?.cancel) {
      this.debouncedSearch.cancel()
    }
  }
}

export default PublicDashboard
