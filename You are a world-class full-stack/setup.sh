#!/bin/bash

echo "=== Enterprise AI Coding Assistant - Setup Script ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Initializing Enterprise AI Coding Assistant...${NC}"
echo ""

# Check if services are running
echo "1. Checking service availability..."
services=("8000" "8001" "8002" "11434")
all_running=true

for port in "${services[@]}"; do
    if curl -s --connect-timeout 3 "http://localhost:$port" > /dev/null 2>&1; then
        echo "   ✓ Service on port $port is running"
    else
        echo "   ✗ Service on port $port is not running"
        all_running=false
    fi
done

if [ "$all_running" = false ]; then
    echo ""
    echo -e "${RED}❌ Not all services are running. Please start with: docker-compose up -d${NC}"
    exit 1
fi

echo ""
echo "2. Setting up admin user..."

# Check if admin user already exists
existing_user=$(curl -s -X POST "http://localhost:8001/users" \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@example.com", "username": "admin", "password": "admin123", "full_name": "System Administrator"}' 2>/dev/null)

if echo "$existing_user" | grep -q "already registered"; then
    echo -e "   ${YELLOW}⚠ Admin user already exists${NC}"
elif echo "$existing_user" | grep -q "is_admin.*true"; then
    echo -e "   ${GREEN}✓ Admin user created successfully${NC}"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo "   Email: admin@example.com"
else
    echo -e "   ${RED}✗ Failed to create admin user${NC}"
    echo "   Response: $existing_user"
fi

echo ""
echo "3. Testing admin login..."
login_response=$(curl -s -X POST "http://localhost:8001/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin&password=admin123")

if echo "$login_response" | grep -q "access_token"; then
    echo -e "   ${GREEN}✓ Admin login successful${NC}"
else
    echo -e "   ${RED}✗ Admin login failed${NC}"
    echo "   Response: $login_response"
fi

echo ""
echo "4. Downloading AI model (if not present)..."
ollama_models=$(curl -s "http://localhost:11434/api/tags")
if echo "$ollama_models" | grep -q "llama3.2:1b"; then
    echo -e "   ${GREEN}✓ LLaMA 3.2 1B model is available${NC}"
else
    echo -e "   ${YELLOW}⚠ Downloading LLaMA 3.2 1B model (this may take a few minutes)...${NC}"
    curl -X POST "http://localhost:11434/api/pull" \
        -H "Content-Type: application/json" \
        -d '{"name": "llama3.2:1b"}' > /dev/null 2>&1 &
    echo "   Model download started in background"
fi

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo -e "${BLUE}🔗 Access Information:${NC}"
echo "• Admin Dashboard: http://localhost:3000"
echo "• API Documentation: http://localhost:8000/docs"
echo "• Auth API: http://localhost:8001/docs"
echo "• Model Manager: http://localhost:8002/docs"
echo ""
echo -e "${BLUE}🔐 Admin Credentials:${NC}"
echo "• Username: admin"
echo "• Password: admin123"
echo "• Email: admin@example.com"
echo ""
echo -e "${BLUE}🧪 Quick Test:${NC}"
echo "curl -X POST \"http://localhost:8001/token\" \\"
echo "  -H \"Content-Type: application/x-www-form-urlencoded\" \\"
echo "  -d \"username=admin&password=admin123\""
echo ""
echo -e "${GREEN}🎉 Your Enterprise AI Coding Assistant is ready to use!${NC}"
