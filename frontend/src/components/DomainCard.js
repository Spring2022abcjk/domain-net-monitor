import { generateElementId } from '../utils/index.js'

/**
 * 域名状态卡片组件
 * @param {{ domain: string, status: string, firstSeen: number|null, lastChecked: number|null }} props - 属性
 */
export function DomainCard({ domain, status, firstSeen, lastChecked }) {
  /** @param {number} timestamp */
  const formatDate = (timestamp) => {
    if (!timestamp) return '暂无数据'
    const d = new Date(timestamp)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  // 状态白名单验证（防 XSS）
  const validStatuses = ['active', 'stopped', 'checking', 'unknown']
  const safeStatus = validStatuses.includes(status) ? status : 'unknown'

  /** @type {Record<string, string>} */
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    stopped: 'bg-red-100 text-red-800',
    checking: 'bg-yellow-100 text-yellow-800',
    unknown: 'bg-gray-100 text-gray-800',
  }

  /** @type {Record<string, string>} */
  const statusLabels = {
    active: '运行中',
    stopped: '已停止',
    checking: '检测中',
    unknown: '未知',
  }

  const statusClass = statusColors[safeStatus] || statusColors.unknown
  const statusLabel = statusLabels[safeStatus] || statusLabels.unknown

  const buttonId = generateElementId('btn-detail', domain)

  return `
    <div class="dm-card p-6 hover:shadow-lg transition-shadow">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 truncate" title="${domain}">${domain}</h3>
        <span class="px-3 py-1 text-xs font-medium rounded-full ${statusClass}">
          ${statusLabel}
        </span>
      </div>
      <div class="space-y-2 text-sm text-gray-600">
        <p>首次检测：<span class="text-gray-900">${firstSeen ? formatDate(firstSeen) : '暂无'}</span></p>
        <p>最近检测：<span class="text-gray-900">${lastChecked ? formatDate(lastChecked) : '暂无'}</span></p>
      </div>
      <div class="mt-4">
        <button 
          id="${buttonId}"
          class="dm-btn dm-btn-primary dm-btn-sm w-full"
          data-domain="${domain}"
        >
          状态详情
        </button>
      </div>
    </div>
  `
}

export default DomainCard
