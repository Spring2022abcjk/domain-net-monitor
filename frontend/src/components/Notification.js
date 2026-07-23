/**
 * 通知组件
 * 支持全局调用：show.error('消息'), show.success('消息')
 */

/** @type {Record<string, { icon: string, class: string }>} */
const NOTIFICATION_TYPES = {
  success: {
    icon: '✅',
    class: 'bg-green-50 border-green-200 text-green-800',
  },
  error: {
    icon: '❌',
    class: 'bg-red-50 border-red-200 text-red-800',
  },
  warning: {
    icon: '⚠️',
    class: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  },
  info: {
    icon: 'ℹ️',
    class: 'bg-blue-50 border-blue-200 text-blue-800',
  },
}

/** @type {HTMLElement|null} */
let notificationContainer = null

/**
 * 获取或创建通知容器
 */
function getContainer() {
  if (!notificationContainer) {
    notificationContainer = document.createElement('div')
    notificationContainer.className = 'fixed top-4 right-4 z-50 space-y-2'
    document.body.appendChild(notificationContainer)
  }
  return notificationContainer
}

/**
 * 显示通知
 * @param {string} message - 通知内容
 * @param {string} [type='info'] - 通知类型 (success/error/warning/info)
 * @param {number} [duration=3000] - 显示时长（毫秒）
 */
function show(message, type = 'info', duration = 3000) {
  const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info
  const container = getContainer()

  const notification = document.createElement('div')
  notification.className = `dm-notification ${config.class} border rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 animate-slide-in-right`
  notification.innerHTML = `
    <span class="text-lg">${config.icon}</span>
    <span class="flex-1">${message}</span>
    <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
      ✕
    </button>
  `

  container.appendChild(notification)

  setTimeout(() => {
    notification.remove()
  }, duration)
}

/**
 * 便捷方法：显示错误通知
 * @param {string} message
 * @param {number} [duration]
 */
show.error = function (message, duration = 5000) {
  show(message, 'error', duration)
}

/**
 * 便捷方法：显示成功通知
 * @param {string} message
 * @param {number} [duration]
 */
show.success = function (message, duration = 3000) {
  show(message, 'success', duration)
}

/**
 * 便捷方法：显示警告通知
 * @param {string} message
 * @param {number} [duration]
 */
show.warning = function (message, duration = 3000) {
  show(message, 'warning', duration)
}

/**
 * 便捷方法：显示信息通知
 * @param {string} message
 * @param {number} [duration]
 */
show.info = function (message, duration = 3000) {
  show(message, 'info', duration)
}

export { show, NOTIFICATION_TYPES }
