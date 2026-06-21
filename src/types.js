/**
 * @fileoverview Cloudflare Domain Monitor 类型定义
 * 使用 JSDoc 提供类型注释，配合 VSCode 智能提示和 TypeScript 类型检查
 */

/**
 * Worker 环境变量
 * @typedef {Object} Env
 * @property {import('@cloudflare/workers-types').KVNamespace} DOMAIN_MONITOR_KV - KV 存储绑定
 * @property {string} ALLOWED_ORIGINS - CORS 白名单（逗号分隔或 *）
 * @property {string} ADMIN_API_TOKEN - 管理员登录认证 Token (优先级高于 CLOUDFLARE_API_TOKEN)
 @property {string} [CLOUDFLARE_API_TOKEN] - (已废弃) 向后兼容的管理员认证 Token
 * @property {string} CLOUDFLARE_ACCOUNT_ID - Cloudflare Account ID
 */

/**
 * 检测状态枚举
 * @typedef {'ok'|'partial'|'no'|'error'} Status
 */

/**
 * DNS 记录检测结果
 * @typedef {Object} RecordStatus
 * @property {Status} status - 状态：ok=正常，partial=部分，no=无，error=错误
 * @property {*} [details] - 详细数据（DNS 记录数组等）
 * @property {number} [count] - 记录数量（用于 IPv6）
 * @property {boolean} [value] - 布尔值（用于 ECH）
 * @property {string} [error] - 错误信息（当 status='error' 时）
 */

/**
 * 域名检测结果
 * @typedef {Object} DomainResult
 * @property {string} domain - 域名
 * @property {number} timestamp - 检测时间戳（毫秒）
 * @property {RecordStatus} https_rr - HTTPS RR 检测结果
 * @property {RecordStatus} ech - ECH 检测结果
 * @property {RecordStatus} ipv6 - IPv6 检测结果
 * @property {Status} overall - 整体状态
 */

/**
 * API 统一响应格式
 * @template T
 * @typedef {Object} APIResponse
 * @property {number} code - HTTP 状态码或业务状态码
 * @property {T} data - 响应数据（泛型）
 * @property {string} msg - 描述信息
 */

/**
 * 限流结果
 * @typedef {Object} RateLimitResult
 * @property {boolean} allowed - 是否允许通过
 * @property {number} remaining - 剩余请求次数
 */

/**
 * 配置对象
 * @typedef {Object} Config
 * @property {number} defaultRefreshInterval - 默认刷新频率（秒）
 * @property {number} historyRetention - 历史记录保留天数
 * @property {RateLimitConfig} rateLimit - 限流配置
 * @property {DoHConfig} doh - DoH 端点配置
 * @property {string[]} defaultDomains - 默认展示域名列表
 */

/**
 * 限流配置
 * @typedef {Object} RateLimitConfig
 * @property {number} windowMs - 窗口时间（毫秒）
 * @property {number} maxRequests - 窗口内最大请求数
 */

/**
 * DoH 配置
 * @typedef {Object} DoHConfig
 * @property {string} primary - 主 DoH 端点 URL
 * @property {string} [backup] - 备用 DoH 端点 URL
 */

/**
 * 统计数据
 * @typedef {Object} Stats
 * @property {number} todayRequests - 今日请求数
 * @property {number} rateLimitHits - 今日限流命中数
 * @property {number} lastReset - 上次重置时间戳
 */

/**
 * 历史记录项
 * @typedef {DomainResult & {timestamp: number}} HistoryItem
 */

/**
 * CORS 响应头对象
 * @typedef {Record<string, string>} CorsHeaders
 */

/**
 * 额外的响应头对象
 * @typedef {Record<string, string>} ExtraHeaders
 */
