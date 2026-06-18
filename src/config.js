// DoH 服务地址
export const DOH_PRIMARY = 'https://cloudflare-dns.com/dns-query';
export const DOH_BACKUP = 'https://dns.google/resolve';

// DNS 记录类型码
export const DNS_TYPE_HTTPS = 65; // HTTPS RR
export const DNS_TYPE_AAAA = 28;  // IPv6 记录

// 超时设置（毫秒）
export const REQUEST_TIMEOUT = 5000;

// 状态枚举
export const STATUS_OK = 'ok';
export const STATUS_PARTIAL = 'partial';
export const STATUS_NO = 'no';
export const STATUS_ERROR = 'error';

// KV 存储键名
export const KV_KEY_DOMAIN_LIST = 'domain_list';
export const KV_KEY_RESULT_PREFIX = 'result:';
export const KV_KEY_DEFAULT_DOMAINS = 'default_domains';
export const KV_KEY_HISTORY_PREFIX = 'history:';
export const KV_KEY_CONFIG = 'config';
export const KV_KEY_STATS = 'stats';
export const KV_KEY_HISTORY_COUNT = 'history_count';
export const KV_KEY_RESULT_COUNT = 'result_count';

// 速率限制告警阈值
export const RATE_LIMIT_ALERT_THRESHOLD = 100;

// 健康检查配置
export const HEALTH_CHECK_INTERVAL = 300000; // 5 分钟

// 跨域响应头
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
