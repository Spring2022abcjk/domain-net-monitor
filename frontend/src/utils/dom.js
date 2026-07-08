/**
 * DOM 安全访问层
 * 封装 document.getElementById() 并提供 null 检查和类型窄化
 */

/**
 * 安全获取输入元素值，元素不存在时返回空字符串并 warn
 * @param {string} id
 * @returns {string}
 */
export function getInputValue(id) {
  const el = document.getElementById(id)
  if (!el) {
    console.warn(`[dom] element #${id} not found`)
    return ''
  }
  return /** @type {HTMLInputElement} */ (el).value
}

/**
 * 安全获取 select 元素值
 * @param {string} id
 * @returns {string}
 */
export function getSelectValue(id) {
  const el = document.getElementById(id)
  if (!el) {
    console.warn(`[dom] element #${id} not found`)
    return ''
  }
  return /** @type {HTMLSelectElement} */ (el).value
}

/**
 * 安全获取任意元素，不存在时返回 null
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T|null}
 */
export function getElement(id) {
  return /** @type {T|null} */ (document.getElementById(id))
}
