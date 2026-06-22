/**
 * 开关组件
 * 任务 17：用于默认展示开关等场景
 * @param {Object} props - 属性
 * @param {boolean} [props.checked=false] - 是否选中
 * @param {string} [props.id] - ID
 * @param {string} [props.name] - name 属性
 * @param {boolean} [props.disabled=false] - 是否禁用
 */
export function Toggle({ checked = false, id, name, disabled = false }) {
  return `
    <label class="dm-toggle inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}">
      <input 
        type="checkbox" 
        ${id ? `id="${id}"` : ''}
        ${name ? `name="${name}"` : ''}
        class="sr-only peer"
        ${checked ? 'checked' : ''}
        ${disabled ? 'disabled' : ''}
      />
      <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${disabled ? 'peer-checked:bg-gray-400' : ''}"></div>
    </label>
  `
}

export default Toggle
