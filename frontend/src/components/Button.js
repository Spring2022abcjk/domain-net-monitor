/**
 * 按钮组件
 * @param {Object} props - 属性
 * @param {string} props.text - 按钮文本
 * @param {string} [props.variant='primary'] - 变体 (primary/secondary/danger)
 * @param {string} [props.size='md'] - 尺寸 (sm/md/lg)
 * @param {boolean} [props.disabled=false] - 是否禁用
 * @param {boolean} [props.loading=false] - 加载状态
 * @param {string} [props.id] - 按钮 ID（用于事件绑定）
 * @param {string} [props.data] - 自定义 data 属性对象
 */
export function Button({ 
  text, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  id = '',
  data = {}
}) {
  const variantClasses = {
    primary: 'dm-btn dm-btn-primary',
    secondary: 'dm-btn dm-btn-secondary',
    danger: 'dm-btn dm-btn-danger'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
  
  const dataAttributes = Object.entries(data)
    .map(([key, value]) => `data-${key}="${String(value).replace(/"/g, '&quot;')}"`)
    .join(' ')
  
  return `
    <button 
      ${id ? `id="${id}"` : ''}
      class="${variantClasses[variant]} ${sizeClasses[size]}"
      ${disabled || loading ? 'disabled' : ''}
      ${dataAttributes}
      data-button-variant="${variant}"
    >
      ${loading ? '<span class="animate-spin mr-2">⟳</span>' : ''}
      ${text}
    </button>
  `
}

export default Button
