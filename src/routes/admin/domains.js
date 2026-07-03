// src/routes/admin/domains.js

import { getDomainList, addDomain, removeDomain, getResult } from '../../storage/kv.js'
import { getDefaultDomains, setDefaultDomains } from '../../storage/default-domains.js'
import { cleanDomain, jsonResponse } from '../../utils/helper.js'

/**
 * 处理域名管理相关请求
 * GET /api/admin/domains - 获取所有域名
 * POST /api/admin/domains - 添加域名
 * DELETE /api/admin/domains/:domain - 删除域名
 * POST /api/admin/domains/:domain/default - 设为默认展示
 * DELETE /api/admin/domains/:domain/default - 取消默认展示
 *
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Promise<Response>} 响应对象
 */
export async function handleDomains(request, env) {
  const method = request.method
  const url = new URL(request.url)
  const path = url.pathname

  // GET /api/admin/domains
  if (path === '/api/admin/domains' && method === 'GET') {
    return handleGetDomains(request, env)
  }

  // POST /api/admin/domains
  if (path === '/api/admin/domains' && method === 'POST') {
    return handleAddDomain(request, env)
  }

  // POST /api/admin/domains/:domain/default (check BEFORE generic DELETE)
  if (path.endsWith('/default') && method === 'POST') {
    const parts = path.split('/')
    const domain = parts[parts.length - 2]
    return handleSetDefaultDomain(request, env, domain)
  }

  // DELETE /api/admin/domains/:domain/default (check BEFORE generic DELETE)
  if (path.endsWith('/default') && method === 'DELETE') {
    const parts = path.split('/')
    const domain = parts[parts.length - 2]
    return handleRemoveDefaultDomain(request, env, domain)
  }

  // DELETE /api/admin/domains/:domain (generic, after specific routes)
  if (path.startsWith('/api/admin/domains/') && method === 'DELETE') {
    const parts = path.split('/')
    const domain = parts[parts.length - 1]
    return handleDeleteDomain(request, env, domain)
  }

  // 方法不允许
  return jsonResponse(null, 405, 'Method not allowed')
}

/**
 * 获取所有域名列表
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Promise<Response>} 响应
 */
async function handleGetDomains(request, env) {
  const list = await getDomainList(env)
  const defaults = await getDefaultDomains(env)

  // 丰富域名数据：域名 + 是否默认 + 最新检测结果
  const domains = await Promise.all(
    list.map(async (domain) => {
      let cached = null
      try {
        cached = await getResult(env, domain)
      } catch (_e) {
        // 缓存读取失败不阻塞
      }

      return {
        domain,
        isDefault: defaults.includes(domain),
        status: cached ? 'active' : 'unknown',
        lastChecked: cached?.timestamp || null,
      }
    }),
  )

  return jsonResponse(
    {
      domains,
      count: domains.length,
    },
    200,
  )
}

/**
 * 添加域名
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @returns {Promise<Response>} 响应
 */
async function handleAddDomain(request, env) {
  let body
  try {
    body = await request.json()
  } catch (error) {
    console.error('Failed to parse request body:', error.message)
    return jsonResponse(null, 400, 'Invalid JSON format')
  }

  const domain = cleanDomain(body.domain)

  if (!domain) {
    return jsonResponse(null, 400, 'Invalid domain format')
  }

  const added = await addDomain(env, domain)

  if (!added) {
    return jsonResponse(null, 409, 'Domain already exists')
  }

  return jsonResponse(
    {
      success: true,
      message: 'Domain added successfully',
      domain,
    },
    200,
  )
}

/**
 * 删除域名
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @param {string} domain - 域名参数
 * @returns {Promise<Response>} 响应
 */
async function handleDeleteDomain(request, env, domain) {
  const cleanedDomain = cleanDomain(domain)

  if (!cleanedDomain) {
    return jsonResponse(null, 400, 'Invalid domain format')
  }

  const deleted = await removeDomain(env, cleanedDomain)

  if (!deleted) {
    return jsonResponse(null, 404, 'Domain not found')
  }

  return jsonResponse(
    {
      success: true,
      message: 'Domain deleted successfully',
      domain: cleanedDomain,
    },
    200,
  )
}

/**
 * 设为默认展示域名
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @param {string} domain - 域名参数
 * @returns {Promise<Response>} 响应
 */
async function handleSetDefaultDomain(request, env, domain) {
  const cleanedDomain = cleanDomain(domain)

  if (!cleanedDomain) {
    return jsonResponse(null, 400, 'Invalid domain format')
  }

  // 检查域名是否在监控列表中
  const allDomains = await getDomainList(env)
  if (!allDomains.includes(cleanedDomain)) {
    return jsonResponse(null, 404, 'Domain not in list')
  }

  // 获取现有默认列表
  const defaults = await getDefaultDomains(env)

  // 如果已在列表中，幂等返回成功
  if (!defaults.includes(cleanedDomain)) {
    defaults.push(cleanedDomain)
    await setDefaultDomains(env, defaults)
  }

  return jsonResponse(
    {
      success: true,
      message: 'Domain set as default',
      domain: cleanedDomain,
    },
    200,
  )
}

/**
 * 取消默认展示域名
 * @param {Request} request - 请求对象
 * @param {import('../../types.js').Env} env - 环境变量对象
 * @param {string} domain - 域名参数
 * @returns {Promise<Response>} 响应
 */
async function handleRemoveDefaultDomain(request, env, domain) {
  const cleanedDomain = cleanDomain(domain)

  if (!cleanedDomain) {
    return jsonResponse(null, 400, 'Invalid domain format')
  }

  const defaults = await getDefaultDomains(env)
  const index = defaults.indexOf(cleanedDomain)

  if (index === -1) {
    return jsonResponse(null, 404, 'Domain not in default list')
  }

  defaults.splice(index, 1)
  await setDefaultDomains(env, defaults)

  return jsonResponse(
    {
      success: true,
      message: 'Domain removed from defaults',
      domain: cleanedDomain,
    },
    200,
  )
}
