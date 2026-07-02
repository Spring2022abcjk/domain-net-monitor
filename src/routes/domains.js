import { cleanDomain, jsonResponse } from '../utils/helper.js'
import { getDomainList, setDomainList, addDomain, removeDomain } from '../storage/kv.js'

/**
 * 获取域名列表 GET /api/domains
 */
async function handleGetDomains(request, env) {
  try {
    const list = await getDomainList(env)
    return jsonResponse(list, 200, 'success')
  } catch (error) {
    return jsonResponse(null, 500, error.message)
  }
}

/**
 * 全量更新域名列表 POST /api/domains
 */
async function handleUpdateDomains(request, env) {
  try {
    const body = await request.json()

    if (!body.domains || !Array.isArray(body.domains)) {
      return jsonResponse(null, 400, 'Invalid request: domains must be an array')
    }

    const cleanedDomains = body.domains.map((d) => cleanDomain(d)).filter((d) => d !== null)

    await setDomainList(env, cleanedDomains)

    return jsonResponse({ count: cleanedDomains.length }, 200, 'Domain list updated')
  } catch (error) {
    if (error.message.includes('JSON')) {
      return jsonResponse(null, 400, 'Invalid JSON body')
    }
    return jsonResponse(null, 500, error.message)
  }
}

/**
 * 追加单个域名 POST /api/domains/add
 */
async function handleAddDomain(request, env) {
  try {
    const body = await request.json()

    if (!body.domain || typeof body.domain !== 'string') {
      return jsonResponse(null, 400, 'Invalid request: domain is required')
    }

    const cleaned = cleanDomain(body.domain)
    if (!cleaned) {
      return jsonResponse(null, 400, 'Invalid domain format')
    }

    const added = await addDomain(env, cleaned)

    if (added) {
      return jsonResponse({ domain: cleaned }, 200, 'Domain added')
    } else {
      return jsonResponse({ domain: cleaned }, 200, 'Domain already exists')
    }
  } catch (error) {
    if (error.message.includes('JSON')) {
      return jsonResponse(null, 400, 'Invalid JSON body')
    }
    return jsonResponse(null, 500, error.message)
  }
}

/**
 * 删除单个域名 POST /api/domains/delete
 */
async function handleDeleteDomain(request, env) {
  try {
    const body = await request.json()

    if (!body.domain || typeof body.domain !== 'string') {
      return jsonResponse(null, 400, 'Invalid request: domain is required')
    }

    const cleaned = cleanDomain(body.domain)
    if (!cleaned) {
      return jsonResponse(null, 400, 'Invalid domain format')
    }

    const removed = await removeDomain(env, cleaned)

    if (removed) {
      return jsonResponse({ domain: cleaned }, 200, 'Domain removed')
    } else {
      return jsonResponse({ domain: cleaned }, 200, 'Domain not found')
    }
  } catch (error) {
    if (error.message.includes('JSON')) {
      return jsonResponse(null, 400, 'Invalid JSON body')
    }
    return jsonResponse(null, 500, error.message)
  }
}

export { handleGetDomains, handleUpdateDomains, handleAddDomain, handleDeleteDomain }
