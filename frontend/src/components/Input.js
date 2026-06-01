/**
 * 输入框组件
 * @param {Object} props - 属性
 * @param {string} props.type - 输入类型 (text/password/email/url/number)
 * @param {string} props.id - 输入框 ID
 * @param {string} props.placeholder - 占位符
 * @param {string} [props.value] - 值
 * @param {boolean} [props.required=false] - 是否必填
 * @param {string} [props.label] - 标签文本
 * @param {string} [props.error] - 错误信息
 * @param {boolean} [props.disabled=false] - 是否禁用
 * @param {boolean} [props.readonly=false] - 是否只读
 * @param {string} [props.name] - name 属性
 * @param {string} [props.autocomplete] - 自动完成提示
 * @param {string} [props.pattern] - 验证正则
 * @param {number} [props.minlength] - 最小长度
 * @param {number} [props.maxlength] - 最大长度
 * @param {number} [props.min] - 最小值（number 类型）
 * @param {number} [props.max] - 最大值（number 类型）
 * @param {Function} [props.onInput] - input 事件回调
 * @param {Function} [props.onChange] - change 事件回调
 * @param {Function} [props.onFocus] - focus 事件回调
 * @param {Function} [props.onBlur] - blur 事件回调
 * @param {Function} [props.onKeydown] - keydown 事件回调
 */
export function Input({ 
  type, 
  id, 
  placeholder, 
  value = '', 
  required = false,
  label,
  error,
  disabled = false,
  readonly = false,
  name,
  autocomplete,
  pattern,
  minlength,
  maxlength,
  min,
  max,
  onInput,
  onChange,
  onFocus,
  onBlur,
  onKeydown
}) {
  const eventHandlers = []
  const handlerConfig = {
    input: onInput,
    change: onChange,
    focus: onFocus,
    blur: onBlur,
    keydown: onKeydown
  }
  
  for (const [eventName, handler] of Object.entries(handlerConfig)) {
    if (handler && typeof handler === 'function') {
      const handlerName = `__input_${id}_${eventName}`
      window[handlerName] = handler
      eventHandlers.push(`on${eventName}="window.${handlerName}(event)"`)
    }
  }
  
  const eventHandlersStr = eventHandlers.join(' ')
  
  return `
    <div class="mb-4">
      ${label ? `<label class="block text-sm font-medium text-gray-700 mb-1">${label}</label>` : ''}
      <input 
        type="${type}" 
        id="${id}"
        ${name ? `name="${name}"` : ''}
        class="dm-input"
        placeholder="${placeholder}"
        value="${value}"
        ${required ? 'required' : ''}
        ${disabled ? 'disabled' : ''}
        ${readonly ? 'readonly' : ''}
        ${autocomplete ? `autocomplete="${autocomplete}"` : ''}
        ${pattern ? `pattern="${pattern}"` : ''}
        ${minlength ? `minlength="${minlength}"` : ''}
        ${maxlength ? `maxlength="${maxlength}"` : ''}
        ${min !== undefined ? `min="${min}"` : ''}
        ${max !== undefined ? `max="${max}"` : ''}
        ${eventHandlersStr}
      />
      ${error ? `<p class="mt-1 text-sm text-danger">${error}</p>` : ''}
    </div>
  `
}

export default Input
