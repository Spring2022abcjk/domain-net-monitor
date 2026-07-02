import { cleanDomain, jsonResponse } from '../utils/helper.js'
import { getDomainList } from '../storage/kv.js'
import { detectAll } from '../detectors/index.js'
import { setResult } from '../storage/kv.js'

/**
 * 批量检测全部域名 GET/POST /api/detect/all
 */
async function handleDetectAll(request, env) {
  try {
    const list = await getDomainList(env)

    if (list.length === 0) {
      return jsonResponse([], 200, 'No domains in list')
    }

    const results = []

    for (const domain of list) {
      try {
        const result = await detectAll(domain)
        await setResult(env, domain, result)
        results.push(result)
      } catch (error) {
        results.push({
          domain: domain,
          timestamp: Date.now(),
          error: error.message,
        })
      }
    }

    return jsonResponse(results, 200, `Detected ${results.length} domains`)
  } catch (error) {
    return jsonResponse(null, 500, error.message)
  }
}

/**
 * 单域名检测 POST /api/detect/single
 */
async function handleDetectSingle(request, env) {
  try {
    const body = await request.json()

    if (!body.domain || typeof body.domain !== 'string') {
      return jsonResponse(null, 400, 'Invalid request: domain is required')
    }

    const cleaned = cleanDomain(body.domain)
    if (!cleaned) {
      return jsonResponse(null, 400, 'Invalid domain format')
    }

    const result = await detectAll(cleaned)
    await setResult(env, cleaned, result)

    return jsonResponse(result, 200, 'Detection completed')
  } catch (error) {
    if (error.message.includes('JSON')) {
      return jsonResponse(null, 400, 'Invalid JSON body')
    }
    return jsonResponse(null, 500, error.message)
  }
}

export { handleDetectAll, handleDetectSingle }
