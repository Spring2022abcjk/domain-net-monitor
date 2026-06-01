import './styles/index.css'
import App from './App.js'

/**
 * 应用初始化
 */
function init() {
  const app = document.getElementById('app')
  if (!app) {
    console.error('[App] Mount point #app not found')
    return
  }
  
  // 渲染根组件
  app.innerHTML = App.render()
  
  // 初始化路由
  if (App.init) {
    App.init()
  }
  
  console.log('[App] Initialized')
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
