import { cleanDomain, jsonResponse } from '../utils/helper.js';
import { getResult, getAllResults } from '../storage/kv.js';

/**
 * 查询全部域名最新结果 GET /api/result/all
 */
async function handleResultAll(request, env) {
  try {
    const results = await getAllResults(env);
    
    if (results.length === 0) {
      return jsonResponse([], 200, 'No results found');
    }
    
    return jsonResponse(results, 200, 'success');
  } catch (error) {
    return jsonResponse(null, 500, error.message);
  }
}

/**
 * 查询单域名最新结果 POST /api/result/single
 */
async function handleResultSingle(request, env) {
  try {
    const body = await request.json();
    
    if (!body.domain || typeof body.domain !== 'string') {
      return jsonResponse(null, 400, 'Invalid request: domain is required');
    }

    const cleaned = cleanDomain(body.domain);
    if (!cleaned) {
      return jsonResponse(null, 400, 'Invalid domain format');
    }

    const result = await getResult(env, cleaned);
    
    if (!result) {
      return jsonResponse(null, 404, 'No result found for this domain');
    }
    
    return jsonResponse(result, 200, 'success');
  } catch (error) {
    if (error.message.includes('JSON')) {
      return jsonResponse(null, 400, 'Invalid JSON body');
    }
    return jsonResponse(null, 500, error.message);
  }
}

export {
  handleResultAll,
  handleResultSingle
};
