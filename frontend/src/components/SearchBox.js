/**
 * 搜索框组件
 * @param {Object} props - 属性
 * @param {string} props.value - 当前值
 * @param {string} [props.placeholder='搜索域名...'] - 占位符
 * @param {string} [props.id='domain-search'] - 输入框 ID
 */
export function SearchBox({ value, placeholder = '搜索域名...', id = 'domain-search' }) {
  return `
    <div class="dm-search-box mb-6">
      <div class="flex gap-2">
        <input 
          type="text" 
          id="${id}"
          class="dm-input flex-1"
          placeholder="${placeholder}"
          value="${value}"
        />
        <button 
          id="btn-search"
          class="dm-btn dm-btn-primary"
        >
          搜索
        </button>
      </div>
    </div>
  `
}

export default SearchBox
