/**
 * 卡片组件
 * @param {Object} props - 属性
 * @param {string} [props.title] - 标题
 * @param {string} props.content - 内容
 * @param {string} [props.footer] - 底部内容
 * @param {boolean} [props.hoverable=false] - 是否支持悬停
 * @param {string} [props.class] - 额外 CSS 类
 */
export function Card({ title, content, footer, hoverable = false, class: extraClass = '' }) {
  return `
    <div class="dm-card ${extraClass} ${hoverable ? 'transition-shadow cursor-pointer' : ''}">
      ${title ? `<h3 class="text-lg font-semibold mb-3">${title}</h3>` : ''}
      <div class="text-gray-600">
        ${content}
      </div>
      ${footer ? `<div class="mt-4 pt-4 border-t border-gray-100">${footer}</div>` : ''}
    </div>
  `
}

export default Card
