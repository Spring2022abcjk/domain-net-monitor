import Header from './components/Header.js'
import Footer from './components/Footer.js'
import { getCurrentPage, init as initRouter } from './router/index.js'

/**
 * 根组件
 */
export default {
  /**
   * 渲染应用
   * @returns {string} HTML 字符串
   */
  render() {
    const currentPage = getCurrentPage()
    
    // 路由初始化前，currentPage 可能为 null
    if (!currentPage || !currentPage.render) {
      return '<div class="min-h-screen flex items-center justify-center">加载中...</div>'
    }
    
    return `
      <div class="min-h-screen flex flex-col">
        ${Header.render()}
        <main class="flex-1 container mx-auto px-4 py-8">
          ${currentPage.render()}
        </main>
        ${Footer.render()}
      </div>
    `
  },
  
  /**
   * 初始化应用
   */
  init() {
    console.log('[App] Root component initialized')
    // 初始化路由
    initRouter()
  }
}
