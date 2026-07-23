/**
 * 加载状态组件
 * @param {Object} props - 属性
 * @param {string} [props.text='加载中...'] - 加载文本
 * @param {string} [props.size='md'] - 尺寸 (sm/md/lg)
 */
export function Loading({ text = '加载中...', size = 'md' }) {
  /** @type {Record<string, string>} */
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return `
    <div class="flex flex-col items-center justify-center py-8">
      <div class="${sizeClasses[size]} animate-spin text-primary-600">
        <svg class="w-full h-full" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="4"/>
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      </div>
      ${text ? `<p class="mt-4 text-gray-600">${text}</p>` : ''}
    </div>
  `
}

export default Loading
