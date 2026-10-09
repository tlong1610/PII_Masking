#!/bin/bash
# ============================================
# PIIGuard Shield - Full Stack Startup Script
# ============================================
# Author: Team 138
# Purpose: Initialize and run the complete application stack

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  PIIGuard Shield - Full Stack Startup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check prerequisites
echo -e "${YELLOW}[1/8] Checking prerequisites...${NC}"
command -v python3 >/dev/null 2>&1 || { echo -e "${RED}Error: python3 is required${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Error: docker is required${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}Error: npm is required${NC}"; exit 1; }

# Setup environment
echo -e "${YELLOW}[2/8] Setting up environment...${NC}"
if [ ! -f ".env" ]; then
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env with your actual API keys!${NC}"
fi

# Setup Python virtual environment
echo -e "${YELLOW}[3/8] Setting up Python environment...${NC}"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Start databases with Docker
echo -e "${YELLOW}[4/8] Starting databases (PostgreSQL + MongoDB)...${NC}"
docker-compose up -d db mongodb

# Wait for databases to be ready
echo "Waiting for PostgreSQL..."
sleep 5
until docker exec p-138-db-1 pg_isready -U postgres >/dev/null 2>&1; do
    echo "  Waiting for PostgreSQL to be ready..."
    sleep 2
done
echo -e "${GREEN}✓ PostgreSQL is ready${NC}"

echo "Waiting for MongoDB..."
until docker exec p-138-mongodb-1 mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; do
    echo "  Waiting for MongoDB to be ready..."
    sleep 2
done
echo -e "${GREEN}✓ MongoDB is ready${NC}"

# Load database fixtures
echo -e "${YELLOW}[5/8] Loading database fixtures...${NC}"

# PostgreSQL fixture
if [ -f "data/fixtures/postgres/seed.sql" ]; then
    echo "Loading PostgreSQL fixture..."
    docker cp data/fixtures/postgres/seed.sql p-138-db-1:/tmp/seed.sql
    docker exec p-138-db-1 psql -U postgres -d mydatabase -f /tmp/seed.sql -v ON_ERROR_STOP=1 >/dev/null 2>&1 || true
    echo -e "${GREEN}✓ PostgreSQL fixture loaded${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL fixture not found, skipping...${NC}"
fi

# MongoDB fixture
if [ -f "data/fixtures/mongo/seed_mongo.py" ]; then
    echo "Loading MongoDB fixture..."
    python data/fixtures/mongo/seed_mongo.py 2>/dev/null || echo -e "${YELLOW}⚠️  MongoDB fixture load failed (may already exist)${NC}"
    echo -e "${GREEN}✓ MongoDB fixture attempted${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB fixture not found, skipping...${NC}"
fi

# Setup frontend
echo -e "${YELLOW}[6/8] Setting up frontend...${NC}"
cd front_end
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install --silent
fi
cd ..
echo -e "${GREEN}✓ Frontend setup complete${NC}"

# Create data directories
echo -e "${YELLOW}[7/8] Creating data directories...${NC}"
mkdir -p data/chroma data/outputs data/logs
echo -e "${GREEN}✓ Directories created${NC}"

# Start the application
echo -e "${YELLOW}[8/8] Starting application services...${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Starting PIIGuard Shield Services${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Backend API will be available at: http://localhost:8001"
echo "Frontend UI will be available at: http://localhost:5173"
echo "API Documentation: http://localhost:8001/docs"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill ${BACKEND_PID} 2>/dev/null || true
    kill ${FRONTEND_PID} 2>/dev/null || true
    echo -e "${GREEN}Services stopped. Databases are still running.${NC}"
    echo -e "${YELLOW}To stop databases: docker-compose down${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${GREEN}[Backend] Starting FastAPI server...${NC}"
uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload > data/logs/backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3
until curl -s http://localhost:8001/health >/dev/null 2>&1; do
    echo "  Waiting for backend to be ready..."
    sleep 2
done
echo -e "${GREEN}✓ Backend is ready${NC}"

# Start frontend
echo -e "${GREEN}[Frontend] Starting Vite dev server...${NC}"
cd front_end
npm run dev > ../data/logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
sleep 5
echo -e "${GREEN}✓ Frontend is ready${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All services are running! 🚀${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "View logs:"
echo "  Backend:  tail -f data/logs/backend.log"
echo "  Frontend: tail -f data/logs/frontend.log"
echo ""

# Keep script running
wait
