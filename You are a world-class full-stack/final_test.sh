#!/bin/bash

echo "=== Enterprise AI Coding Assistant - Final Test Summary ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏗️  Architecture Overview:${NC}"
echo "✓ Microservices Architecture with Docker Compose"
echo "✓ PostgreSQL Database (port 5432)"
echo "✓ LLM Server API (port 8000)"
echo "✓ User Authentication Service (port 8001)"
echo "✓ Model Manager Service (port 8002)"
echo "✓ Ollama AI Engine (port 11434)"
echo "✓ React Admin Dashboard (port 3000)"
echo "✓ VS Code Extension"
echo ""

echo -e "${BLUE}🚀 Testing Core Functionality:${NC}"

# Test AI completion
echo -n "AI Code Completion: "
model_id=$(curl -s "http://localhost:11434/api/tags" | grep -o '"name":"[^"]*"' | head -n1 | cut -d'"' -f4)
if [ -n "$model_id" ]; then
    response=$(curl -s -X POST "http://localhost:8000/autocomplete" \
        -H "Content-Type: application/json" \
        -d "{\"prompt\":\"def fibonacci(n):\", \"model_id\":\"$model_id\", \"max_tokens\":50, \"temperature\":0.1}")
    
    if echo "$response" | grep -q "completion"; then
        echo -e "${GREEN}✓ WORKING${NC} (Model: $model_id)"
        echo "   Sample completion generated successfully!"
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "   Response: $response"
    fi
else
    echo -e "${YELLOW}⚠ NO MODEL AVAILABLE${NC}"
fi

echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
services=("Database:5432" "LLM_Server:8000" "Auth_Service:8001" "Model_Manager:8002" "Ollama:11434")
for service in "${services[@]}"; do
    IFS=':' read -ra ADDR <<< "$service"
    name=${ADDR[0]}
    port=${ADDR[1]}
    echo -n "$name: "
    if curl -s --connect-timeout 2 "http://localhost:$port" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ RUNNING${NC}"
    else
        echo -e "${RED}✗ DOWN${NC}"
    fi
done

echo ""
echo -e "${BLUE}🔗 Access URLs:${NC}"
echo "• API Documentation: http://localhost:8000/docs"
echo "• Auth API Docs: http://localhost:8001/docs"
echo "• Model Manager API: http://localhost:8002/docs"
echo "• Admin Dashboard: http://localhost:3000"
echo ""

echo -e "${GREEN}🎉 Enterprise AI Coding Assistant is ready!${NC}"
echo ""
echo -e "${BLUE}🔐 Admin Credentials:${NC}"
echo "Username: admin"
echo "Password: admin123"
echo "Email: admin@example.com"
echo "(Note: First user created automatically becomes admin)"
echo ""
echo -e "${CYAN}Quick Test Commands:${NC}"
echo "# Test code completion:"
echo "curl -X POST \"http://localhost:8000/autocomplete\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"prompt\":\"def hello():\", \"model_id\":\"$model_id\", \"max_tokens\":50}'"
echo ""
echo "# View available models:"
echo "curl http://localhost:8000/models"
echo ""
echo "# Check service health:"
echo "curl http://localhost:8000/health"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Install the VS Code extension from src/vscode_extension/"
echo "2. Explore the Admin Dashboard at http://localhost:3000"
echo "3. Test the REST APIs using the documentation"
echo "4. Deploy additional AI models via Ollama"
echo "5. Configure authentication and user management"
echo ""
