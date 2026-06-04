/**
 * 模态框组件
 * 任务 17：用于添加域名、详情展示等弹窗场景
 * @param {Object} props - 属性
 * @param {string} props.title - 标题
 * @param {string} props.content - 内容（HTML 字符串）
 * @param {string} [props.footer] - 底部内容（HTML 字符串）
 * @param {boolean} [props.closable=true] - 是否可关闭
 */
export function Modal({ title, content, footer, closable = true }) {
  return `
    <div class="dm-modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div class="dm-modal bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        ${title ? `
          <div class="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
            ${closable ? `
              <button 
                class="text-gray-400 hover:text-gray-600"
                onclick="window.__modalCloseHandler && window.__modalCloseHandler()"
              >
                ✕
              </button>
            ` : ''}
          </div>
        ` : ''}
        <div class="p-6">
          ${content}
        </div>
        ${footer ? `
          <div class="p-6 border-t border-gray-200 bg-gray-50">
            ${footer}
          </div>
        ` : ''}
      </div>
    </div>
  `
}

export default Modal
