/**
 * API 响应类型定义
 * 所有后端 API 返回统一格式: { code, data, msg }
 *
 * @typedef {Object} ApiResponse
 * @property {number} code - 业务状态码，200=成功
 * @property {Object} data - 响应数据
 * @property {string} msg - 状态消息
 */

/**
 * @typedef {Object} ApiListResponse
 * @property {number} code
 * @property {Array} data - 列表数据
 * @property {string} msg
 */

/**
 * @typedef {Object} ApiStatsResponse
 * @property {number} code
 * @property {{domain: string, status: string, firstSeen: number|null, lastChecked: number|null, totalChecks: number, successRate: number}} data
 * @property {string} msg
 */

/**
 * @typedef {Object} ApiDomainResponse
 * @property {number} code
 * @property {{domain: string, status: string, firstSeen: number|null, lastChecked: number|null, isDefault: boolean}} data
 * @property {string} msg
 */

/**
 * @typedef {Object} HistoryDomain
 * @property {string} domain
 * @property {Array<Object>} [history]
 * @property {number} [latestCheck]
 */

/**
 * @typedef {Object} HistoryRecord
 * @property {number|string} timestamp
 * @property {string} domain
 * @property {{status: string}} https_rr
 * @property {{status: string}} ipv6
 * @property {{status: string}} ech
 */

/**
 * @typedef {Object} DomainItem
 * @property {string} domain
 * @property {boolean} isDefault
 * @property {string} status
 * @property {number|null} lastChecked
 */

export {}
