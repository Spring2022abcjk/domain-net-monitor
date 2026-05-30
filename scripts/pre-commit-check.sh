#!/bin/bash

# pre-commit-check.sh
# 预提交检查脚本
# 
# 用法：./scripts/pre-commit-check.sh
# 在 git commit 之前运行，确保代码符合规范

set -e

echo "🔍 运行预提交检查..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 错误计数器
ERROR_COUNT=0

# -------------------------------------------
# 检查 1: API 响应格式
# -------------------------------------------
echo "📋 检查 1/4: API 响应格式..."

# 检查是否有直接使用 new Response(JSON.stringify (排除 handleOptionsRequest)
INVALID_RESPONSE=$(grep -rn "new Response(JSON.stringify" src/routes/admin/*.js 2>/dev/null | grep -v "handleOptionsRequest" | wc -l || echo 0)

if [ "$INVALID_RESPONSE" -gt 0 ]; then
  echo -e "${RED}❌ 发现 $INVALID_RESPONSE 处直接使用 new Response(JSON.stringify)${NC}"
  echo "   请使用 jsonResponse() 函数"
  echo ""
  echo "   违规位置:"
  grep -rn "new Response(JSON.stringify" src/routes/admin/*.js 2>/dev/null | grep -v "handleOptionsRequest" || true
  echo ""
  ERROR_COUNT=$((ERROR_COUNT + 1))
else
  echo -e "${GREEN}✅ API 响应格式检查通过${NC}"
fi

echo ""

# -------------------------------------------
# 检查 2: 测试代码命名
# -------------------------------------------
echo "📋 检查 2/4: 测试代码命名..."

# 检查是否有使用 config/response 而非 body 作为变量名
INCONSISTENT=$(grep -E "const (config|response) = await.*json\(\)" tests/integration/*.test.js 2>/dev/null | wc -l || echo 0)

if [ "$INCONSISTENT" -gt 0 ]; then
  echo -e "${RED}❌ 发现 $INCONSISTENT 处使用 config/response 而非 body${NC}"
  echo "   请统一使用：const body = await response.json()"
  echo ""
  echo "   违规位置:"
  grep -E "const (config|response) = await.*json\(\)" tests/integration/*.test.js 2>/dev/null || true
  echo ""
  ERROR_COUNT=$((ERROR_COUNT + 1))
else
  echo -e "${GREEN}✅ 测试代码命名检查通过${NC}"
fi

echo ""

# -------------------------------------------
# 检查 3: 测试访问模式
# -------------------------------------------
echo "📋 检查 3/4: 测试访问模式..."

# 检查是否有 config.data 或 config. 的访问模式（应该是 body.data）
WRONG_ACCESS=$(grep -E "assert(Equal)?\(config\.(data\.)?" tests/integration/*.test.js 2>/dev/null | wc -l || echo 0)

if [ "$WRONG_ACCESS" -gt 0 ]; then
  echo -e "${RED}❌ 发现 $WRONG_ACCESS 处使用 config/config.data 访问响应${NC}"
  echo "   请统一使用：body.data.xxx"
  echo ""
  echo "   违规位置:"
  grep -E "assert(Equal)?\(config\.(data\.)?" tests/integration/*.test.js 2>/dev/null || true
  echo ""
  ERROR_COUNT=$((ERROR_COUNT + 1))
else
  echo -e "${GREEN}✅ 测试访问模式检查通过${NC}"
fi

echo ""

# -------------------------------------------
# 检查 4: 运行测试
# -------------------------------------------
echo "📋 检查 4/4: 运行单元测试..."

if npm test > /tmp/pre-commit-test-output.txt 2>&1; then
  echo -e "${GREEN}✅ 单元测试检查通过${NC}"
  # 显示测试摘要
  tail -10 /tmp/pre-commit-test-output.txt | grep -E "(Total:|Passed:|Failed:|✅)" || true
else
  echo -e "${RED}❌ 单元测试失败${NC}"
  echo ""
  echo "失败详情:"
  tail -30 /tmp/pre-commit-test-output.txt
  echo ""
  ERROR_COUNT=$((ERROR_COUNT + 1))
fi

echo ""

# -------------------------------------------
# 总结
# -------------------------------------------
echo "======================================"

if [ $ERROR_COUNT -gt 0 ]; then
  echo -e "${RED}❌ 预提交检查失败：$ERROR_COUNT 项检查未通过${NC}"
  echo ""
  echo "请修复以上问题后再提交。"
  echo ""
  echo "提示:"
  echo "  - 使用 jsonResponse() 代替 new Response(JSON.stringify(...))"
  echo "  - 测试中使用 const body = await response.json()"
  echo "  - 访问响应数据使用 body.data.xxx"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ 所有预提交检查通过！${NC}"
  echo ""
  echo "可以安全提交代码。"
  exit 0
fi
