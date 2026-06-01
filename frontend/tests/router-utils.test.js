// tests/router-utils.test.js

import { runSuite, assertEqual } from './test-runner.js'
import { matchRoute, getQueryParams, navigate } from '../src/router/utils.js'

/**
 * 路由工具函数测试
 */
async function runRouterUtilsTests() {
  // ========== matchRoute 测试 ==========
  await runSuite('Router Utils - matchRoute', async () => {
    const result0 = matchRoute('/admin/dashboard', '/admin/dashboard')
    assertEqual(typeof result0, 'object', 'Returns object for exact match')
    assertEqual(Object.keys(result0).length, 0, 'Returns empty object for exact match without params')
    
    const result1 = matchRoute('/domain/example.com', '/domain/:name')
    assertEqual(result1.name, 'example.com', 'Extracts dynamic param')
    
    const result2 = matchRoute('/user/123/settings', '/user/:id/settings')
    assertEqual(result2.id, '123', 'Extracts param from middle')
    
    assertEqual(
      matchRoute('/admin', '/admin/dashboard'),
      null,
      'Returns null for mismatched paths'
    )
    
    const result3 = matchRoute('/a/b/c', '/:x/:y/:z')
    assertEqual(result3.x, 'a', 'Extracts multiple params - x')
    assertEqual(result3.y, 'b', 'Extracts multiple params - y')
    assertEqual(result3.z, 'c', 'Extracts multiple params - z')
  })
  
  // ========== getQueryParams 测试 ==========
  await runSuite('Router Utils - getQueryParams', async () => {
    const params1 = getQueryParams('#/path?foo=bar&baz=qux')
    assertEqual(params1.get('foo'), 'bar', 'Extracts query param foo')
    assertEqual(params1.get('baz'), 'qux', 'Extracts query param baz')
    
    const params2 = getQueryParams('#/path')
    assertEqual(params2.toString(), '', 'Returns empty for no query string')
    
    const params3 = getQueryParams('')
    assertEqual(params3.toString(), '', 'Returns empty for empty string')
    
    const params4 = getQueryParams('#/search?q=test&page=1&sort=desc')
    assertEqual(params4.get('q'), 'test', 'Extracts search query')
    assertEqual(params4.get('page'), '1', 'Extracts page number')
    assertEqual(params4.get('sort'), 'desc', 'Extracts sort order')
  })
  
  // ========== navigate 测试 ==========
  // 注意：navigate 依赖 window.location，只能在浏览器环境运行
  if (typeof window !== 'undefined') {
    await runSuite('Router Utils - navigate', async () => {
      const originalHash = window.location.hash
      window.location.hash = ''
      
      navigate('/dashboard')
      assertEqual(window.location.hash, '#/dashboard', 'Navigates to simple path')
      
      navigate('/user/:id', { id: '123' })
      assertEqual(window.location.hash, '#/user/123', 'Replaces param in path')
      
      navigate('/search', {}, { q: 'test', page: '2' })
      assertEqual(
        window.location.hash.includes('q=test'),
        true,
        'Adds query params'
      )
      assertEqual(
        window.location.hash.includes('page=2'),
        true,
        'Adds multiple query params'
      )
      
      navigate('/domain/:name/detail', { name: 'example.com' }, { tab: 'settings' })
      assertEqual(
        window.location.hash,
        '#/domain/example.com/detail?tab=settings',
        'Combines params and query'
      )
      
      navigate('/encoded/:name', { name: 'a/b' })
      assertEqual(
        window.location.hash.includes('a%2Fb'),
        true,
        'Encodes special characters in params'
      )
      
      window.location.hash = originalHash
    })
  }
}

export { runRouterUtilsTests as runRouterUtils }
