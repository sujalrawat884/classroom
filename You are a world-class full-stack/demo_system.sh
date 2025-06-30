#!/bin/bash

echo "=== Enterprise AI Coding Assistant - Feature Demo ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Helper function to make JSON pretty
pretty_json() {
    python3 -m json.tool 2>/dev/null || cat
}

# Helper function to demonstrate API calls
demo_api_call() {
    local title="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    
    echo -e "${CYAN}=== $title ===${NC}"
    echo -e "${YELLOW}Request:${NC}"
    if [ "$method" = "GET" ]; then
        echo "curl -X GET \"$url\""
        echo ""
        echo -e "${YELLOW}Response:${NC}"
        curl -s -X GET "$url" | pretty_json
    else
        echo "curl -X $method \"$url\" \\"
        echo "  -H \"Content-Type: application/json\" \\"
        echo "  -d '$data'"
        echo ""
        echo -e "${YELLOW}Response:${NC}"
        curl -s -X "$method" "$url" -H "Content-Type: application/json" -d "$data" | pretty_json
    fi
    echo ""
    echo "---"
    echo ""
}

echo -e "${BLUE}🚀 Starting Enterprise AI Coding Assistant Demo${NC}"
echo ""

# Check if all services are running
echo -e "${PURPLE}1. Service Status Check${NC}"
services=("db:5432" "llm_server:8000" "user_auth:8001" "model_manager:8002" "ollama:11434")
for service in "${services[@]}"; do
    IFS=':' read -ra ADDR <<< "$service"
    name=${ADDR[0]}
    port=${ADDR[1]}
    if curl -s --connect-timeout 3 "http://localhost:$port" > /dev/null 2>&1 || nc -z localhost $port 2>/dev/null; then
        echo -e "$name: ${GREEN}✓ RUNNING${NC}"
    else
        echo -e "$name: ${RED}✗ NOT RUNNING${NC}"
    fi
done
echo ""

# Demo 1: Health Checks
echo -e "${PURPLE}2. Health Check Demonstration${NC}"
demo_api_call "LLM Server Health" "GET" "http://localhost:8000/health"
demo_api_call "Auth Service Health" "GET" "http://localhost:8001/health"
demo_api_call "Model Manager Health" "GET" "http://localhost:8002/health"

# Demo 2: Available Models
echo -e "${PURPLE}3. Available AI Models${NC}"
demo_api_call "LLM Server Models" "GET" "http://localhost:8000/models"
demo_api_call "Ollama Models" "GET" "http://localhost:11434/api/tags"

# Demo 3: User Registration (if supported)
echo -e "${PURPLE}4. User Management Demo${NC}"
echo -e "${CYAN}=== User Registration Attempt ===${NC}"
echo -e "${YELLOW}Note: This may fail if registration endpoint doesn't exist${NC}"
test_user_data='{
  "email": "demo@example.com",
  "username": "demouser",
  "password": "demopassword123",
  "full_name": "Demo User"
}'
echo "curl -X POST \"http://localhost:8001/register\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '$test_user_data'"
echo ""
echo -e "${YELLOW}Response:${NC}"
curl -s -X POST "http://localhost:8001/register" -H "Content-Type: application/json" -d "$test_user_data" | pretty_json
echo ""
echo "---"
echo ""

# Demo 4: AI Code Completion
echo -e "${PURPLE}5. AI Code Completion Demo${NC}"

# Check if model is available
echo -e "${CYAN}=== Checking AI Model Availability ===${NC}"
ollama_models=$(curl -s "http://localhost:11434/api/tags")
if echo "$ollama_models" | grep -q "llama3.2"; then
    echo -e "${GREEN}✓ LLaMA 3.2 Model is available!${NC}"
    echo ""
    
    # Demo different code completion scenarios
    echo -e "${CYAN}=== Python Function Completion ===${NC}"
    python_prompt='{"prompt":"def fibonacci(n):\n    \"\"\"Calculate fibonacci number\"\"\"\n    if n <= 1:\n        return n\n    else:", "model_id":"llama3.2:1b", "max_tokens":100, "temperature":0.2}'
    demo_api_call "Python Code Completion" "POST" "http://localhost:8000/autocomplete" "$python_prompt"
    
    echo -e "${CYAN}=== JavaScript Function Completion ===${NC}"
    js_prompt='{"prompt":"function sortArray(arr) {\n    // Sort array in ascending order\n    return arr.", "model_id":"llama3.2:1b", "max_tokens":50, "temperature":0.1}'
    demo_api_call "JavaScript Code Completion" "POST" "http://localhost:8000/autocomplete" "$js_prompt"
    
    echo -e "${CYAN}=== SQL Query Completion ===${NC}"
    sql_prompt='{"prompt":"SELECT users.name, COUNT(orders.id) as order_count\nFROM users\nLEFT JOIN orders ON users.id = orders.user_id\n", "model_id":"llama3.2:1b", "max_tokens":80, "temperature":0.1}'
    demo_api_call "SQL Code Completion" "POST" "http://localhost:8000/autocomplete" "$sql_prompt"
    
else
    echo -e "${YELLOW}⚠ LLaMA model not ready yet. You can run this demo again once the model download is complete.${NC}"
    echo "Current models available:"
    echo "$ollama_models" | pretty_json
    echo ""
fi

# Demo 5: Chat Functionality
echo -e "${PURPLE}6. AI Chat Demo${NC}"
if echo "$ollama_models" | grep -q "llama3.2"; then
    chat_messages='{"messages":[{"role":"user","content":"Explain what a REST API is in simple terms"}], "model_id":"llama3.2:1b", "max_tokens":150, "temperature":0.7}'
    demo_api_call "AI Chat Conversation" "POST" "http://localhost:8000/chat" "$chat_messages"
fi

# Demo 6: Admin Dashboard
echo -e "${PURPLE}7. Frontend Demo${NC}"
echo -e "${CYAN}=== Admin Dashboard ===${NC}"
echo -e "${YELLOW}Admin Dashboard URL:${NC} http://localhost:3000"
echo -e "${YELLOW}API Documentation URLs:${NC}"
echo "  - LLM Server API: http://localhost:8000/docs"
echo "  - Auth Service API: http://localhost:8001/docs"
echo "  - Model Manager API: http://localhost:8002/docs"
echo ""

# Demo 7: VS Code Extension
echo -e "${PURPLE}8. VS Code Extension Demo${NC}"
echo -e "${CYAN}=== Extension Information ===${NC}"
cd src/vscode_extension
if [ -f "package.json" ]; then
    echo -e "${YELLOW}Extension Name:${NC} $(jq -r '.displayName // .name' package.json)"
    echo -e "${YELLOW}Version:${NC} $(jq -r '.version' package.json)"
    echo -e "${YELLOW}Description:${NC} $(jq -r '.description' package.json)"
    echo ""
    echo -e "${YELLOW}Available Commands:${NC}"
    jq -r '.contributes.commands[]? | "  - " + .title' package.json
    echo ""
    echo -e "${YELLOW}To install the extension:${NC}"
    echo "1. Open VS Code"
    echo "2. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)"
    echo "3. Type 'Extensions: Install from VSIX'"
    echo "4. Navigate to this folder and select the built .vsix file"
fi
cd - > /dev/null

echo ""
echo -e "${GREEN}🎉 Demo Complete!${NC}"
echo ""
echo -e "${BLUE}Summary of Features Demonstrated:${NC}"
echo "✓ Microservices Architecture (Database, Auth, LLM Server, Model Manager)"
echo "✓ AI Code Completion with LLaMA 3.2"
echo "✓ AI Chat Functionality"
echo "✓ RESTful API Design"
echo "✓ Health Monitoring"
echo "✓ Admin Dashboard (React)"
echo "✓ VS Code Extension"
echo "✓ Docker Containerization"
echo "✓ Secure Authentication System"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Open the Admin Dashboard: http://localhost:3000"
echo "2. Explore API documentation: http://localhost:8000/docs"
echo "3. Install the VS Code extension for inline AI assistance"
echo "4. Test user registration and authentication"
echo "5. Try different AI models by modifying the model_id in requests"
echo ""
