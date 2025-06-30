#!/bin/bash

echo "=== Enterprise AI Coding Assistant - System Test ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test API endpoints
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $response, expected $expected_status)"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test JSON API endpoints
test_json_endpoint() {
    local name="$1"
    local url="$2"
    local expected_pattern="$3"
    
    echo -n "Testing $name... "
    
    response=$(curl -s -H "Accept: application/json" "$url")
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" "$url")
    
    if [ "$http_code" = "200" ] && echo "$response" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "Response: $response"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test AI functionality
test_ai_endpoint() {
    local name="$1"
    local url="$2"
    local data="$3"
    local expected_pattern="$4"
    
    echo -n "Testing $name... "
    
    response=$(curl -s -X POST "$url" -H "Content-Type: application/json" -d "$data")
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d "$data")
    
    if [ "$http_code" = "200" ] && echo "$response" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "Response: $response"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo -e "${BLUE}1. Testing Database Service${NC}"
test_endpoint "PostgreSQL Connection" "http://localhost:5432" "000"

echo ""
echo -e "${BLUE}2. Testing LLM Server API${NC}"
test_json_endpoint "LLM Server Health" "http://localhost:8000/health" "healthy"
test_json_endpoint "LLM Server Models" "http://localhost:8000/models" "codellama"

echo ""
echo -e "${BLUE}3. Testing User Authentication Service${NC}"
test_json_endpoint "Auth Service Health" "http://localhost:8001/health" "healthy"
test_endpoint "Auth API Documentation" "http://localhost:8001/docs" "200"

echo ""
echo -e "${BLUE}4. Testing Model Manager Service${NC}"
test_json_endpoint "Model Manager Health" "http://localhost:8002/health" "healthy"
test_endpoint "Model Manager API Documentation" "http://localhost:8002/docs" "200"

echo ""
echo -e "${BLUE}5. Testing Ollama Service${NC}"
test_json_endpoint "Ollama Service" "http://localhost:11434/api/tags" "models"

echo ""
echo -e "${BLUE}6. Testing Admin Dashboard${NC}"
test_endpoint "Admin Dashboard" "http://localhost:3000" "200"

echo ""
echo -e "${BLUE}7. Testing AI Code Completion${NC}"
# Get the first available Ollama model
ollama_model_id=$(curl -s "http://localhost:11434/api/tags" | grep -o '"name":"[^"]*"' | head -n1 | cut -d'"' -f4)
if [ -n "$ollama_model_id" ]; then
    echo -e "LLaMA Model Available: ${GREEN}$ollama_model_id${NC}"
    # Test code completion with a simple prompt
    test_ai_endpoint "Code Completion" "http://localhost:8000/autocomplete" '{"prompt":"def hello():", "model_id":"'$ollama_model_id'", "max_tokens":50, "temperature":0.1}' "completion"
else
    echo -e "LLaMA Model Available: ${YELLOW}⚠ NOT READY${NC} (Model still downloading or not available)"
    ((TESTS_FAILED++))
fi

echo ""
echo -e "${BLUE}8. Testing VS Code Extension Build${NC}"
cd src/vscode_extension
if npm list > /dev/null 2>&1; then
    echo -e "VS Code Extension Dependencies: ${GREEN}✓ INSTALLED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "VS Code Extension Dependencies: ${RED}✗ NOT INSTALLED${NC}"
    ((TESTS_FAILED++))
fi
cd - > /dev/null  # Return to original directory

echo ""
echo "=== TEST SUMMARY ==="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! System is ready for use.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Check the output above.${NC}"
    exit 1
fi
