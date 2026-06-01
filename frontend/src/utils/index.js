/**
 * 日期格式化
 * @param {Date|string|number} date - 日期
 * @param {string} [format='YYYY-MM-DD HH:mm:ss'] - 格式
 * @returns {string} 格式化后的日期
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date)
  if (isNaN(d.getTime())) {
    return '无效日期'
  }
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 相对时间格式化
 * @param {Date|string|number} date - 日期
 * @returns {string} 相对时间描述
 */
export function formatRelativeTime(date) {
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * 验证 URL 格式
 * @param {string} url - URL 地址
 * @returns {boolean} 是否有效
 */
export function isValidURL(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 防抖函数
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟毫秒数
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn - 要执行的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, limit = 300) {
  let inThrottle = false
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 深拷贝（支持 Date、RegExp、Map、Set、ArrayBuffer 等特殊类型）
 * @param {*} obj - 要拷贝的对象
 * @param {WeakMap} [hash] - 用于处理循环引用
 * @returns {*} 拷贝后的对象
 */
export function deepClone(obj, hash = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }
  
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags)
  }
  
  if (obj instanceof Map) {
    const clonedMap = new Map()
    hash.set(obj, clonedMap)
    for (const [key, value] of obj.entries()) {
      clonedMap.set(deepClone(key, hash), deepClone(value, hash))
    }
    return clonedMap
  }
  
  if (obj instanceof Set) {
    const clonedSet = new Set()
    hash.set(obj, clonedSet)
    for (const value of obj.values()) {
      clonedSet.add(deepClone(value, hash))
    }
    return clonedSet
  }
  
  if (obj instanceof ArrayBuffer) {
    return obj.slice(0)
  }
  
  if (ArrayBuffer.isView(obj)) {
    return new obj.constructor(obj.slice(0))
  }
  
  if (hash.has(obj)) {
    return hash.get(obj)
  }
  
  if (Array.isArray(obj)) {
    const clonedArray = []
    hash.set(obj, clonedArray)
    obj.forEach((item, index) => {
      clonedArray[index] = deepClone(item, hash)
    })
    return clonedArray
  }
  
  const clonedObj = {}
  hash.set(obj, clonedObj)
  for (const key of Object.keys(obj)) {
    clonedObj[key] = deepClone(obj[key], hash)
  }
  return clonedObj
}

/**
 * 格式化数字（添加千分位）
 * @param {number} num - 数字
 * @returns {string} 格式化后的字符串
 */
export function formatNumber(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
