/**
 * 空状态组件
 * @param {Object} props - 属性
 * @param {string} [props.title='暂无数据'] - 标题
 * @param {string} [props.message=''] - 副标题/描述
 * @param {string} [props.icon='empty'] - 图标类型 (empty/search/error)
 */
export function EmptyState({ title = '暂无数据', message = '', icon = 'empty' }) {
  /** @type {Record<string, string>} */
  const icons = {
    empty: `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    `,
    search: `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    `,
    error: `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    `,
  }

  return `
    <div class="dm-empty-state col-span-full text-center py-12">
      <div class="text-gray-400">
        <svg class="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          ${icons[icon] || icons.empty}
        </svg>
        ${title ? `<p class="text-lg font-medium text-gray-600">${title}</p>` : ''}
        ${message ? `<p class="mt-2 text-sm text-gray-500">${message}</p>` : ''}
      </div>
    </div>
  `
}

export default EmptyState
